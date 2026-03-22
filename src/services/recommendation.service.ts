import { JobRepository } from "@/repositories/job.repository";
import { StudentRepository } from "@/repositories/student.repository";
import ApplicationRepository from "@/repositories/application.repository";
import SimilarityService from "./similarity.service";
import FeatureExtractionService from "./feature-extraction.service";
import { NotFoundError } from "@/utils/errors";
import axios from "axios";
import { getTopCVAccessToken } from "@/utils/topcv-auth";
import { MY_PROVINCE_ID_TO_TOPCV_ID, mapMyProvinceToTopCV } from "@/utils/cityMapper";
import { getPrimaryTopCVCategory } from "@/utils/categoryMapper";
import { simpleCache } from "@/utils/cache";
import { MessageUtil } from "@/utils/MessageUtil";

export class RecommendationService {
  private jobRepo: JobRepository;
  private studentRepo: StudentRepository;
  private similarityService: SimilarityService;
  private featureService: FeatureExtractionService;
  private readonly JOB_CACHE_TTL = 24 * 60 * 60 * 1000; // 1 day
  private readonly TOPCV_CACHE_TTL = 24 * 60 * 60 * 1000; // 1 day
  private readonly STUDENT_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
  private readonly APPLICATIONS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly JOB_DETAIL_CACHE_TTL = 24 * 60 * 60 * 1000; // 1 day

  constructor() {
    this.jobRepo = new JobRepository();
    this.studentRepo = new StudentRepository();
    this.similarityService = new SimilarityService();
    this.featureService = new FeatureExtractionService();
  }

  /**
   * Helper: get jobs with in-memory cache keyed by query params
   */
  private async getJobsWithCache(params: any): Promise<any[]> {
    const key = `jobs.findAll:${JSON.stringify(params)}`;
    const cached = simpleCache.get<any[]>(key);
    if (cached) {
      return cached;
    }
    const result = await this.jobRepo.findAll(params);
    const jobs = result?.data || [];
    simpleCache.set(key, jobs, this.JOB_CACHE_TTL);
    return jobs;
  }

  /**
   * Helper: get student profile with cache
   */
  private async getStudentWithCache(userId: number): Promise<any | null> {
    const key = `student.findOne:${userId}`;
    const cached = simpleCache.get<any>(key);
    if (cached) {
      return cached;
    }
    const student = await this.studentRepo.findOne({ user_id: userId });
    if (student) {
      simpleCache.set(key, student, this.STUDENT_CACHE_TTL);
    }
    return student;
  }

  /**
   * Helper: get applications list with cache per user
   */
  private async getApplicationsWithCache(userId: number, limit: number = 100): Promise<any[]> {
    const params = { user_id: userId, limit };
    const key = `applications.findAll:${JSON.stringify(params)}`;
    const cached = simpleCache.get<any[]>(key);
    if (cached) {
      return cached;
    }
    const result = await ApplicationRepository.findAll(params);
    const apps = result?.data || [];
    simpleCache.set(key, apps, this.APPLICATIONS_CACHE_TTL);
    return apps;
  }

  /**
   * Helper: get job detail with cache
   */
  private async getJobDetailWithCache(jobId: number): Promise<any | null> {
    const key = `jobs.findOne:${jobId}`;
    const cached = simpleCache.get<any>(key);
    if (cached) {
      return cached;
    }
    const result = await this.jobRepo.findOne(jobId);
    const job = result?.job ?? null;
    if (job) {
      simpleCache.set(key, job, this.JOB_DETAIL_CACHE_TTL);
    }
    return job;
  }

  /**
   * Helper: get students list with cache
   */
  private async getStudentsWithCache(params: any): Promise<any[]> {
    const key = `students.findAll:${JSON.stringify(params)}`;
    const cached = simpleCache.get<any[]>(key);
    if (cached) {
      return cached;
    }
    const result = await this.studentRepo.findAll<any>(params);
    const students = result?.data || [];
    simpleCache.set(key, students, this.STUDENT_CACHE_TTL);
    return students;
  }

  /**
   * Helper: Extract job_id from application
   * RPC search_application returns nested job object, so fallback to app.job.id if job_id is missing
   */
  private getJobIdFromApplication(app: any): number | null {
    const id = app?.job_id ?? app?.job?.id;
    return id !== undefined && id !== null ? Number(id) : null;
  }

  /**
   * Check if student profile is empty (no meaningful data for recommendation)
   */
  private isEmptyProfile(student: any, applications: any[]): boolean {
    const hasSkills = Array.isArray(student.skills) && student.skills.length > 0;
    const hasDesiredPositions = Array.isArray(student.desired_positions) && student.desired_positions.length > 0;
    const hasExperiences = Array.isArray(student.experiences) && student.experiences.length > 0;
    const hasEducations = Array.isArray(student.educations) && student.educations.length > 0;
    const hasApplications = applications.length > 0;
    const hasAbout = Boolean(student.about?.trim());

    return !hasSkills && !hasDesiredPositions && !hasExperiences && !hasEducations && !hasApplications && !hasAbout;
  }

  /**
   * Get default recommendations for empty profiles
   * Returns popular/newest jobs for Fresher level
   */
  private async getDefaultRecommendations(limit: number, appliedJobIds: Set<number>) {
    const cachedJobs = await this.getJobsWithCache({
      level_ids: [10, 2], // Fresher and Junior
      sort_by: "job_posted_at",
      order: "desc",
      limit: limit * 2, // Get more to filter out applied jobs
      page: 1,
    });
    const jobs = cachedJobs
      .filter((job: any) => !appliedJobIds.has(job.id))
      .slice(0, limit)
      .map((job: any) => ({
        ...job,
        recommendation_score: 0.5, // Default score for popular jobs
        match_percentage: 50.0,
      }));

    return jobs;
  }

  /**
   * Gợi ý công việc cho student dựa trên profile và lịch sử ứng tuyển
   * Sử dụng Content-Based Filtering
   */
  async recommendJobsForStudent(userId: number, limit: number = 20) {
    // 1. Lấy student profile
    const studentResult = await this.getStudentWithCache(userId);
    if (!studentResult) {
      throw new NotFoundError({ message: MessageUtil.get("STUDENT_PROFILE_NOT_FOUND") });
    }
    const student = studentResult;

    // 2. Lấy lịch sử ứng tuyển
    const applications = await this.getApplicationsWithCache(userId, 100);

    // Lọc bỏ jobs đã apply (dùng chung cho cả default và recommendation)
    const appliedJobIds = new Set(
      applications.map((app) => this.getJobIdFromApplication(app)).filter((id): id is number => id !== null),
    );

    // 3. Fallback: Nếu profile hoàn toàn trống, trả về popular jobs
    if (this.isEmptyProfile(student, applications)) {
      return await this.getDefaultRecommendations(limit, appliedJobIds);
    }

    // 4. Trích xuất feature vector từ student profile
    const studentVector = await this.featureService.extractStudentFeatures({
      student,
      applications,
    });

    // 5. Lấy danh sách jobs đang mở (Active)
    const jobs = await this.getJobsWithCache({
      limit: 500, // Lấy pool lớn để có nhiều lựa chọn
      page: 1,
    });

    // 6. Tính similarity score cho từng job
    const scoredJobs = await Promise.all(
      jobs.map(async (job) => {
        const jobVector = await this.featureService.extractJobFeatures(job);
        const score = this.similarityService.calculateSimilarity(studentVector, jobVector);
        return { job, score };
      }),
    );

    // 7. Filter và return recommendations
    const recommendations = scoredJobs
      .filter((item) => !appliedJobIds.has(item.job.id))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item) => ({
        ...item.job,
        recommendation_score: Number(item.score.toFixed(4)),
        match_percentage: Number((item.score * 100).toFixed(2)),
      }));

    return recommendations;
  }

  /**
   * Tìm jobs tương tự với một job cụ thể
   * Hữu ích cho "Similar Jobs" feature
   */
  async findSimilarJobs(jobId: number, limit: number = 10) {
    // 1. Lấy target job
    const targetJob = await this.getJobDetailWithCache(jobId);
    if (!targetJob) {
      throw new NotFoundError({ message: MessageUtil.get("JOB_NOT_FOUND") });
    }

    // 2. Extract features từ target job
    const targetVector = await this.featureService.extractJobFeatures(targetJob);

    // 3. Lấy tất cả jobs active
    const jobs = await this.getJobsWithCache({
      limit: 500,
      page: 1,
    });

    // 4. Tính similarity cho từng job
    const scoredJobs = await Promise.all(
      jobs
        .filter((job) => job.id !== jobId) // Loại bỏ chính job đó
        .map(async (job) => {
          const jobVector = await this.featureService.extractJobFeatures(job);
          const score = this.similarityService.calculateSimilarity(targetVector, jobVector);
          return { job, score };
        }),
    );

    // 5. Sắp xếp và return top similar jobs
    return scoredJobs
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item) => ({
        ...item.job,
        similarity_score: Number(item.score.toFixed(4)),
        match_percentage: Number((item.score * 100).toFixed(2)),
      }));
  }

  /**
   * Tìm students phù hợp với một job cụ thể
   * Reverse recommendation - cho company
   */
  async findMatchingStudentsForJob(jobId: number, limit: number = 20) {
    // 1. Lấy job
    const job = await this.getJobDetailWithCache(jobId);
    if (!job) {
      throw new NotFoundError({ message: MessageUtil.get("JOB_NOT_FOUND") });
    }

    // 2. Extract features từ job
    const jobVector = await this.featureService.extractJobFeatures(job);

    // 3. Lấy tất cả students
    const students = await this.getStudentsWithCache({
      limit: 500,
      page: 1,
    });

    if (students.length === 0) {
      return [];
    }

    // 4. Batch load all applications (FIX N+1 QUERY)
    // Note: Load applications for each user separately since ApplicationRepository doesn't support batch user_ids
    const applicationPromises = students.map((student) =>
      ApplicationRepository.findAll({
        user_id: student.user_id,
        limit: 100,
      }),
    );
    const applicationResults = await Promise.all(applicationPromises);

    // Group applications by user_id
    const applicationsByUser = new Map<number, any[]>();
    students.forEach((student, index) => {
      const result = applicationResults[index];
      applicationsByUser.set(student.user_id, result?.data || []);
    });

    // 5. Tính similarity cho từng student
    const scoredStudents = await Promise.all(
      students.map(async (student) => {
        const applications = applicationsByUser.get(student.user_id) || [];

        const studentVector = await this.featureService.extractStudentFeatures({
          student,
          applications,
        });

        const score = this.similarityService.calculateSimilarity(jobVector, studentVector);
        return { student, score };
      }),
    );

    // 6. Return top matching students
    return scoredStudents
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item) => ({
        ...item.student,
        match_score: Number(item.score.toFixed(4)),
        match_percentage: Number((item.score * 100).toFixed(2)),
      }));
  }

  /**
   * Gợi ý jobs với custom weights
   * Cho phép user tùy chỉnh độ quan trọng của từng factor
   */
  async recommendJobsWithCustomWeights(
    userId: number,
    weights: {
      skills?: number;
      categories?: number;
      location?: number;
      salary?: number;
    },
    limit: number = 20,
  ) {
    const studentResult = await this.getStudentWithCache(userId);
    if (!studentResult) {
      throw new NotFoundError({ message: MessageUtil.get("STUDENT_PROFILE_NOT_FOUND") });
    }

    const applicationsResultData = await this.getApplicationsWithCache(userId, 100);

    const alreadyAppliedJobIds = new Set(
      (applicationsResultData || [])
        .map((app) => this.getJobIdFromApplication(app))
        .filter((id): id is number => id !== null),
    );

    if (this.isEmptyProfile(studentResult, applicationsResultData || [])) {
      return await this.getDefaultRecommendations(limit, alreadyAppliedJobIds);
    }

    const studentVector = await this.featureService.extractStudentFeatures({
      student: studentResult,
      applications: applicationsResultData || [],
    });

    // Override weights
    if (weights.skills !== undefined) studentVector.weights.skills = weights.skills;
    if (weights.categories !== undefined) studentVector.weights.categories = weights.categories;
    if (weights.location !== undefined) studentVector.weights.location = weights.location;
    if (weights.salary !== undefined) studentVector.weights.salary = weights.salary;

    const jobs = await this.getJobsWithCache({
      limit: 500,
      page: 1,
    });

    const scoredJobs = await Promise.all(
      jobs.map(async (job: any) => {
        const jobVector = await this.featureService.extractJobFeatures(job);
        const score = this.similarityService.calculateSimilarity(studentVector, jobVector);
        return { job, score };
      }),
    );

    const appliedJobIds = new Set(
      (applicationsResultData || [])
        .map((app) => this.getJobIdFromApplication(app))
        .filter((id): id is number => id !== null),
    );

    return scoredJobs
      .filter((item) => !alreadyAppliedJobIds.has(item.job.id))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item) => ({
        ...item.job,
        recommendation_score: Number(item.score.toFixed(4)),
        match_percentage: Number((item.score * 100).toFixed(2)),
      }));
  }

  /**
   * Lấy jobs từ TopCV API
   * Helper method để fetch jobs từ external source
   */
  private async fetchTopCVJobs(params: {
    keyword?: string;
    city_id?: string;
    category_id?: string;
    limit?: number;
  }): Promise<any[]> {
    try {
      const cacheKey = `topcv.jobs:${JSON.stringify(params)}`;
      const cached = simpleCache.get<any[]>(cacheKey);
      if (cached) {
        return cached;
      }
      const token = await getTopCVAccessToken();
      if (!token) {
        console.warn("[TopCV] Skip fetching: authentication unavailable");
        return [];
      }

      // TopCV only allows per_page between 5 and 100
      const totalLimit = params.limit ?? 50;
      const perPage = 100; // Always fetch max per page
      const numPages = Math.ceil(totalLimit / perPage); // Calculate number of pages needed

      // Fetch multiple pages in parallel
      const fetchPromises = Array.from({ length: numPages }, (_, i) => {
        const requestParams = {
          page: i + 1,
          per_page: perPage,
          ...(params.keyword && { keyword: params.keyword }),
          ...(params.city_id && { city_id: params.city_id }),
          ...(params.category_id && { category_id: params.category_id }),
        };

        return axios.get(`${process.env.TOPCV_JOBS_URL}`, {
          params: requestParams,
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeout: 10000,
        });
      });

      const responses = await Promise.all(fetchPromises);
      let allJobs: any[] = [];

      // Parse all responses
      for (const response of responses) {
        const payload = response.data;
        let jobs: any[] = [];

        // FIX: Add validation and proper error handling
        if (Array.isArray(payload)) {
          jobs = payload;
        } else if (Array.isArray(payload?.data)) {
          jobs = payload.data;
        } else if (Array.isArray(payload?.data?.data)) {
          jobs = payload.data.data;
        } else if (Array.isArray(payload?.results)) {
          jobs = payload.results;
        } else {
          console.warn("[TopCV] Unexpected response structure:", {
            hasData: !!payload?.data,
            dataType: typeof payload?.data,
            keys: payload ? Object.keys(payload) : [],
          });
        }

        allJobs.push(...jobs);
      }

      // Trim to exact limit
      allJobs = allJobs.slice(0, totalLimit);

      console.log(`[TopCV] Successfully fetched ${allJobs.length} jobs from ${numPages} page(s)`);
      // set cache
      simpleCache.set(cacheKey, allJobs, this.TOPCV_CACHE_TTL);
      return allJobs;
    } catch (error: any) {
      // FIX: Proper error logging instead of silent failure
      console.error("[TopCV] Failed to fetch jobs:", {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        params,
      });
      return [];
    }
  }

  /**
   * Gợi ý jobs cho student bao gồm cả jobs từ TopCV
   * Merge jobs từ database và TopCV
   */
  async recommendJobsWithTopCV(userId: number, limit: number = 20) {
    // 1. Lấy student profile
    const studentResult = await this.getStudentWithCache(userId);
    if (!studentResult) {
      throw new NotFoundError({ message: MessageUtil.get("STUDENT_PROFILE_NOT_FOUND") });
    }
    const student = studentResult;

    // 2. Lấy lịch sử ứng tuyển
    const applications = await this.getApplicationsWithCache(userId, 100);

    // Lọc bỏ jobs đã apply
    const excludeJobIds = new Set(
      applications.map((app) => this.getJobIdFromApplication(app)).filter((id): id is number => id !== null),
    );

    if (this.isEmptyProfile(student, applications)) {
      return await this.getDefaultRecommendations(limit, excludeJobIds);
    }

    // 3. Trích xuất feature vector từ student profile
    const studentVector = await this.featureService.extractStudentFeatures({
      student,
      applications,
    });

    // 4. Lấy jobs từ database
    const dbJobs = await this.getJobsWithCache({
      limit: 300,
      page: 1,
    });

    // 5. Lấy jobs từ TopCV
    // Tạo keyword từ desired_positions
    const keyword =
      student.desired_positions && student.desired_positions.length > 0 ? student.desired_positions[0] : undefined;

    // Map location từ string sang TopCV city_id
    let cityId: string | undefined;

    // student.location có thể là string hoặc number
    if (student.location) {
      if (typeof student.location === "number") {
        // Nếu là số (province_id), map trực tiếp
        const topcvCityId = MY_PROVINCE_ID_TO_TOPCV_ID[student.location];
        if (topcvCityId) {
          cityId = topcvCityId.toString();
        }
      } else if (typeof student.location === "string") {
        // Nếu là chuỗi ("Thành phố Hồ Chí Minh"), map qua mapMyProvinceToTopCV
        const topcvCity = mapMyProvinceToTopCV({ name: student.location });
        if (topcvCity) {
          cityId = topcvCity.id.toString();
        }
      }
    }

    const topcvParams: {
      keyword?: string;
      city_id?: string;
      limit?: number;
    } = { limit: 200 };

    if (keyword) topcvParams.keyword = keyword;
    if (cityId) topcvParams.city_id = cityId;

    const topcvJobs = await this.fetchTopCVJobs(topcvParams);
    const safeTopcvJobs = Array.isArray(topcvJobs) ? topcvJobs : [];
    if (!Array.isArray(topcvJobs)) {
      // Unexpected response shape; ignore TopCV results
    }

    // 6. Merge và mark source
    const allJobs = [
      ...dbJobs.map((job) => ({ ...job, source: "database" })),
      ...safeTopcvJobs.map((job) => ({ ...job, source: "topcv" })),
    ];

    // 7. Tính similarity score cho từng job
    const scoredJobs = await Promise.all(
      allJobs.map(async (job) => {
        const jobVector = await this.featureService.extractJobFeatures(job);
        const score = this.similarityService.calculateSimilarity(studentVector, jobVector);
        return { job, score };
      }),
    );

    // 8. Lọc bỏ jobs đã apply (chỉ với database jobs)
    const recommendations = scoredJobs
      .filter((item) => {
        // Nếu là job từ database, check đã apply chưa
        if (item.job.source === "database" && excludeJobIds.has(item.job.id)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item) => ({
        ...item.job,
        recommendation_score: Number(item.score.toFixed(4)),
        match_percentage: Number((item.score * 100).toFixed(2)),
      }));

    return recommendations;
  }
}

export default RecommendationService;
