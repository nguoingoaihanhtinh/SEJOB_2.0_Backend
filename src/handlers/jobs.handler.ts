import { Request, Response } from "express";
import jobService from "@/services/jobs.service";
import { BadRequestError, NotFoundError, UnauthorizedError } from "@/utils/errors";
import _ from "lodash";
import validate from "@/utils/validate";
import { createJobSchema } from "@/dtos/job/CreateJob.dto";
import { updateJobSchema } from "@/dtos/job/UpdateJob.dto";
import { SORTABLE_JOB_FIELDS, SortableJobFields } from "@/types/common";
import { companyJobQuerySchema } from "@/dtos/company/CompanyJobQuery.dto";
import { toTopCvFormat } from "@/utils/topCVFormat";
import convert from "@/utils/convert";
import { TOPCV_ID_TO_MY_PROVINCE_ID } from "@/utils/cityMapper";
import { getTopCVTotal, getTopCVwithOffset } from "./topcv.handler";
import { verifyToken } from "@/utils/jwt.util";
import { MessageUtil } from "@/utils/MessageUtil";
import { ESJob } from "@/db/elasticsearch/elasticsearch";

// Helper: Parse job query params from request
function parseJobQueryParams(query: any, includePagination = true) {
  const keyword = typeof query.keyword === "string" ? _.trim(query.keyword) : "";

  let province_ids: number[] = [];

  if (query.city_id) {
    const cityIds = convert.split(query.city_id as string, ",", Number).filter((id) => !isNaN(id));
    const mapped = cityIds.map((cvId) => TOPCV_ID_TO_MY_PROVINCE_ID[cvId]).filter((id): id is number => id != null);
    province_ids = mapped;
  } else if (query.province_ids) {
    province_ids = convert.split(query.province_ids as string, ",", Number).filter((id) => !isNaN(id));
  }

  const job_ids = convert.split(query.job_ids as string, ",", Number).filter((id) => !isNaN(id));
  const level_ids = convert.split(query.level_ids as string, ",", Number).filter((id) => !isNaN(id));
  const skill_ids = convert.split(query.skill_ids as string, ",", Number).filter((id) => !isNaN(id));
  const employment_type_ids = convert
    .split(query.employment_type_ids as string, ",", Number)
    .filter((id) => !isNaN(id));
  const category_ids = convert.split(query.category_ids as string, ",", Number).filter((id) => !isNaN(id));
  
  // Parse statuses (support comma-separated string)
  const statuses = query.statuses 
    ? convert.split(query.statuses as string, ",", String).filter((s: string) => s.trim().length > 0)
    : undefined;

  const queryParams: any = {
    job_ids,
    province_ids,
    level_ids,
    category_ids,
    employment_type_ids,
    skill_ids,
    keyword,
  };
  
  // Add statuses if provided
  if (statuses && statuses.length > 0) {
    queryParams.statuses = statuses;
  }

  // Add pagination if needed
  if (includePagination) {
    queryParams.page = _.toInteger(query.page) || 1;
    queryParams.limit = _.toInteger(query.limit) || 10;

    const order = query.order === "asc" ? "asc" : "desc";
    const sort_by =
      typeof query.sort_by === "string" && (SORTABLE_JOB_FIELDS as readonly string[]).includes(query.sort_by)
        ? (query.sort_by as SortableJobFields)
        : undefined;

    queryParams.order = order;
    if (sort_by) queryParams.sort_by = sort_by;
  }

  // Add optional filters
  if (query.salary_from) {
    const val = Number(query.salary_from);
    if (!isNaN(val)) queryParams.salary_from = val;
  }
  if (query.salary_to) {
    const val = Number(query.salary_to);
    if (!isNaN(val)) queryParams.salary_to = val;
  }
  if (query.company_id) {
    const val = Number(query.company_id);
    if (!isNaN(val)) queryParams.company_id = val;
  }

  return queryParams;
}

export async function listJobs(req: Request, res: Response) {
  // Check for unmapped city_ids early return
  if (req.query.city_id) {
    const cityIds = convert.split(req.query.city_id as string, ",", Number).filter((id) => !isNaN(id));
    const mapped = cityIds.map((cvId) => TOPCV_ID_TO_MY_PROVINCE_ID[cvId]).filter((id): id is number => id != null);

    if (cityIds.length > 0 && mapped.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        pagination: { page: 1, limit: 10, total: 0, total_pages: 0 },
      });
    }
  }

  const queryParams = parseJobQueryParams(req.query, true);

  const { data: jobs, pagination } = await jobService.list({ ...queryParams, current_user_id: req.user?.userId || undefined });

  const formattedJobs = jobs.map((job) => toTopCvFormat(job, job.company, null));

  res.status(200).json({
    success: true,
    data: formattedJobs,
    pagination,
  });
}
export async function getJob(req: Request, res: Response) {
  const id = Number(req.params.id);
  const formatTopCv = req.query.formatTopCv !== "false";

  if (Number.isNaN(id)) {
    throw new BadRequestError({ message: MessageUtil.get("INVALID_JOB_ID") });
  }

  const job = await jobService.findOne({ jobId: id });
  if (!job) {
    throw new NotFoundError({ message: MessageUtil.get("JOB_NOT_FOUND") });
  }

  let responseData: any = job;
  if (formatTopCv) {
    responseData = toTopCvFormat(job, job.company, null);
  }

  return res.status(200).json({ success: true, data: responseData });
}

export async function createJob(req: Request, res: Response) {
  const jobData = validate.schema_validate(createJobSchema, req.body);

  // Check if user is Employer with verified company
  if (req.user?.role === "Employer" && req.user?.userId) {
    const companyRepository = (await import("@/repositories/company.repository")).default;
    const company = await companyRepository.findOne({ user_id: req.user.userId });
    
    if (company?.is_verified === true) {
      jobData.status = "Approved";
    } else {
      jobData.status = "Pending";
    }
  }

  const created_job = await jobService.create({ jobData });

  res.status(201).json({
    success: true,
    data: created_job,
  });
}

export async function updateJob(req: Request, res: Response) {
  const id = _.toNumber(req.params.id);

  if (!id) {
    throw new BadRequestError({ message: MessageUtil.get("INVALID_JOB_ID") });
  }

  const jobData = validate.schema_validate(updateJobSchema, req.body);

  const job = await jobService.findOne({ jobId: id });

  if (!job) {
    throw new NotFoundError({ message: MessageUtil.get("JOB_NOT_FOUND") });
  }

  if (job.status !== jobData.status && req.user?.role !== "Admin" && req.user?.role !== "Manager") {
    throw new BadRequestError({ message: MessageUtil.get("ONLY_ADMIN_OR_MANAGER_CAN_UPDATE_JOB_STATUS") });
  }

  const updated_job = await jobService.update({ jobId: id, jobData });

  const formattedJob = toTopCvFormat(updated_job, updated_job.company, null);

  res.status(200).json({
    success: true,
    data: formattedJob,
  });
}

export async function deleteJob(req: Request, res: Response) {
  const id = _.toNumber(req.params.id);

  if (!id) {
    throw new BadRequestError({ message: MessageUtil.get("INVALID_JOB_ID") });
  }

  await jobService.delete(id);

  res.status(200).json({
    success: true,
  });
}

export async function listJobsByCompany(req: Request, res: Response) {
  const companyId = _.toInteger(req.params.id);
  if (!companyId) {
    throw new BadRequestError({ message: MessageUtil.get("INVALID_COMPANY_ID") });
  }

  const { page, limit } = validate.schema_validate(companyJobQuerySchema, req.query);

  const result = await jobService.listByCompany({ companyId, page, limit });

  res.status(200).json({
    success: true,
    ...result,
  });
}

export async function listMergedJobs(req: Request, res: Response) {
  const page = _.toInteger(req.query.page) || 1;
  const page_size = 12;
  const JOBS_MAX = 6;
  const globalOffset = (page - 1) * page_size;

  const queryParams = parseJobQueryParams(req.query, false);
  queryParams.statuses = ['Pending', 'Approved', 'Rejected'];

  const totalJobs = await jobService.getTotalJobs(queryParams);
  const totalTopCVJobs = await getTopCVTotal(queryParams);

  const usedJobsBefore = Math.min(
    totalJobs,
    (page - 1) * JOBS_MAX
  );

  const usedTopcvBefore = Math.max(
    0,
    globalOffset - usedJobsBefore
  );

  const { data: jobs, pagination: jobsPagination } = await jobService.list({
    ...queryParams,
    page: page,
    limit: JOBS_MAX,
  });
  const formattedJobs = jobs.map((job) => toTopCvFormat(job, job.company, null));

  const remaining = page_size - jobs.length;

  const topcvJobs = await getTopCVwithOffset(usedTopcvBefore, remaining, page_size, queryParams);

  res.status(200).json({
    success: true,
    data: { jobs: formattedJobs, topcv: topcvJobs },
    pagination: {
      page,
      limit: page_size,
      total: totalJobs + totalTopCVJobs,
      total_pages: Math.ceil((totalJobs + totalTopCVJobs) / page_size),
    },
  });
}

export async function syncES(req: Request, res: Response) {
  const queryParams = parseJobQueryParams(req.query, false);

  const result = await jobService.syncList(queryParams);

  res.status(200).json({
    success: true,
    data: result,
  });
}

export async function userRecommendationJobs(req: Request, res: Response) {
  const user = req.user;

  if (!user) {
    throw new UnauthorizedError({ message: MessageUtil.get("UNAUTHORIZED") });
  }

  const { data: jobs, pagination } = await jobService.userRecommendationJobs({ 
    userId: user.userId, 
    page: _.toInteger(req.query.page) || 1, 
    limit: _.toInteger(req.query.limit) || 10 
  });

  const formattedJobs = jobs.map((job) => toTopCvFormat(job, job.company, null));

  res.status(200).json({
    success: true,
    data: formattedJobs,
    pagination
  });
}

export async function similarJobRecommendation(req: Request, res: Response) {
  const id = Number(req.params.id);

  const { data: jobs, pagination } = await jobService.similarJobRecommendation({ jobId: id, page: 1, limit: 10 });
  
  const formattedJobs = jobs.map((job) => toTopCvFormat(job, job.company, null));

  res.status(200).json({
    success: true,
    data: formattedJobs,
    pagination
  });
}

/** GET /api/jobs/suggest?q=devo&size=8 */
export async function suggestJobs(req: Request, res: Response) {
  const prefix = typeof req.query.q === "string" ? _.trim(req.query.q) : "";
  const size = Math.min(_.toInteger(req.query.size) || 8, 20);

  if (!prefix) {
    return res.status(200).json({ success: true, data: [] });
  }

  const suggestions = await ESJob.suggest(prefix, size);

  return res.status(200).json({ success: true, data: suggestions });
}