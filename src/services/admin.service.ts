import _ from "lodash";
import userRepository from "@/repositories/user.repository";
import companyRepository from "@/repositories/company.repository";
import jobRepository from "@/repositories/job.repository";
import applicationRepository from "@/repositories/application.repository";
import { JobStatus } from "@/types/common";
import { BadRequestError } from "@/utils/errors";
import { MessageUtil } from "@/utils/MessageUtil";

interface UserInfo {
  user_id: number;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  updated_at?: string | null;
}

interface CompanyInfo {
  id: number;
  name: string;
  updated_at?: string;
}

interface JobInfo {
  id: number;
  title: string;
  created_at: string;
  company_id: number;
}

interface ApplicationInfo {
  id: number;
  submitted_at: string;
  user_id: number;
  job_id: number;
  company_id: number;
}

export class AdminService {
  static async getDashboardData() {
    try {
      const [
        totalStudents,
        totalCompanies,
        activeJobs,
        totalApplications,
        activeUsers,
        pendingReviews,
        recentActivities,
        topCompanies,
      ] = await Promise.all([
        this.getTotalStudents(),
        this.getTotalCompanies(),
        this.getActiveJobs(),
        this.getTotalApplications(),
        this.getActiveUsers(),
        this.getPendingReviews(),
        this.getRecentActivities(),
        this.getTopCompanies(),
      ]);

      return {
        stats: {
          totalStudents: this.formatNumber(totalStudents),
          totalCompanies: this.formatNumber(totalCompanies),
          activeJobs: this.formatNumber(activeJobs),
          totalApplications: this.formatNumber(totalApplications),
          activeUsers: this.formatNumber(activeUsers),
          pendingReviews: this.formatNumber(pendingReviews),
          changes: {
            totalStudents: "+12.5%",
            totalCompanies: "+8.2%",
            activeJobs: "+23.1%",
            totalApplications: "+15.3%",
            activeUsers: "+5.7%",
            pendingReviews: "-3.2%",
          },
        },
        recentActivities,
        topCompanies,
      };
    } catch (error) {
      console.error("Error in AdminService.getDashboardData:", error);
      throw new BadRequestError({ message: MessageUtil.get("FAILED_TO_FETCH_DASHBOARD_DATA") });
    }
  }

  private static formatNumber(num: number): string {
    return num.toLocaleString();
  }

  private static async getTotalStudents(): Promise<number> {
    const { data: users } = await userRepository.findAll({
      fields: "user_id, role, is_active",
    });

    return (users as UserInfo[]).filter((user) => user.role === "Student" && user.is_active === true).length;
  }

  private static async getTotalCompanies(): Promise<number> {
    const { pagination } = await companyRepository.findAll({
      page: 1,
      limit: 1,
      fields: "id",
    });
    return pagination && typeof pagination === "object" ? (pagination as any).total || 0 : 0;
  }

  private static async getActiveJobs(): Promise<number> {
    const { pagination } = await jobRepository.findAll({
      page: 1,
      limit: 1,
      fields: "id",
      statuses: ["Approved"] as JobStatus[],
    });
    return pagination && typeof pagination === "object" ? (pagination as any).total || 0 : 0;
  }

  private static async getTotalApplications(): Promise<number> {
    const { pagination } = await applicationRepository.findAll({
      page: 1,
      limit: 1,
      fields: "id",
    });
    return pagination && typeof pagination === "object" ? (pagination as any).total || 0 : 0;
  }

  private static async getActiveUsers(): Promise<number> {
    const { data: users } = await userRepository.findAll({
      fields: "user_id, is_active",
    });

    return (users as UserInfo[]).filter((user) => user.is_active === true).length;
  }

  private static async getPendingReviews(): Promise<number> {
    const { pagination } = await jobRepository.findAll({
      page: 1,
      limit: 1,
      fields: "id",
      statuses: ["Pending"] as JobStatus[],
    });
    return pagination && typeof pagination === "object" ? (pagination as any).total || 0 : 0;
  }

  private static async getRecentActivities() {
    try {
      const { data: recentApplications } = await applicationRepository.findAll({
        page: 1,
        limit: 10,
        sort_by: "submitted_at" as any,
        order: "desc" as any,
      });

      const { data: recentJobs } = await jobRepository.findAll({
        page: 1,
        limit: 10,
        fields: "id, title, created_at, company_id",
        statuses: ["Approved", "Pending"] as JobStatus[],
        sort_by: "created_at",
        order: "desc",
      });

      const { data: allUsers } = await userRepository.findAll({
        fields: "user_id, first_name, last_name, updated_at, role",
      });

      const students = (allUsers as UserInfo[]).filter((user) => user.role === "Student");
      const recentStudentUpdates = students
        .filter((user) => user.updated_at)
        .sort((a, b) => new Date(b.updated_at!).getTime() - new Date(a.updated_at!).getTime())
        .slice(0, 10);

      const companyIds = [
        ...new Set([
          ...recentApplications.map((app: any) => app.job?.company_id).filter((id) => id),
          ...recentJobs.map((job) => job.company_id).filter((id) => id),
        ]),
      ].map((id) => Number(id));

      let companies: CompanyInfo[] = [];
      if (companyIds.length > 0) {
        const { data: companiesData } = await companyRepository.findAll({
          page: 1,
          limit: companyIds.length,
          fields: "id, name",
          company_ids: companyIds as number[],
        });
        companies = companiesData as CompanyInfo[];
      }

      const companiesMap = _.keyBy(companies, "id");

      const userIds = [
        ...new Set([
          ...recentApplications.map((app) => app.user_id).filter((id) => id),
          ...recentStudentUpdates.map((user) => user.user_id).filter((id) => id),
        ]),
      ].map((id) => Number(id));

      let users: UserInfo[] = [];
      if (userIds.length > 0) {
        try {
          const { data: usersData } = await userRepository.findAll({
            user_ids: userIds,
            page: 1,
            limit: userIds.length,
            fields: "user_id, first_name, last_name, role, is_active, updated_at",
          });

          users = (usersData as any[]).map((user) => ({
            user_id: user.user_id,
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role,
            is_active: user.is_active,
            updated_at: user.updated_at,
          }));
        } catch (error) {
          console.error("Error fetching users batch:", error);
        }
      }

      const usersMap = _.keyBy(users, "user_id");

      const activities = [
        ...recentApplications.slice(0, 5).map((app: any) => {
          const user = usersMap[app.user_id] || { first_name: "Unknown", last_name: "User" };
          const job = app.job || { title: "Unknown Job", company_id: null };
          const company = job.company_id
            ? companiesMap[job.company_id] || app.company || { name: "Unknown Company" }
            : app.company || { name: "Unknown Company" };

          return {
            user: `${user.first_name} ${user.last_name}`,
            action: `applied to "${job.title}"`,
            company: company.name,
            time: this.formatTimeAgo(app.submitted_at),
          };
        }),

        ...recentJobs.slice(0, 5).map((job) => {
          const company = job.company_id
            ? companiesMap[job.company_id] || { name: "Unknown Company" }
            : { name: "Unknown Company" };

          return {
            user: company.name,
            action: `posted new job listing: "${job.title}"`,
            company: company.name,
            time: this.formatTimeAgo(job.created_at),
          };
        }),

        ...recentStudentUpdates.slice(0, 5).map((student) => {
          return {
            user: `${student.first_name} ${student.last_name}`,
            action: "updated profile and CV",
            company: null,
            time: this.formatTimeAgo(student.updated_at),
          };
        }),
      ];

      return activities
        .filter((activity) => activity.time && activity.time !== "Invalid date")
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        .slice(0, 5);
    } catch (error) {
      console.error("Error in getRecentActivities:", error);
      return [];
    }
  }

  private static async getTopCompanies() {
    try {
      const { data: companies } = await companyRepository.findAll({
        fields: "id, name",
      });

      if (companies.length === 0) return [];

      const { data: jobs } = await jobRepository.findAll({
        fields: "id, company_id, status",
      });

      const { data: applications } = await applicationRepository.findAll({
        page: 1,
        limit: 100,
      });

      const jobsByCompany = _.groupBy(jobs, "company_id");
      const applicationsByCompany = _.groupBy(applications, (app: any) => Number(app.company?.id));

      const companyStats = (companies as CompanyInfo[]).map((company) => {
        const companyJobs = jobsByCompany[company.id] || [];
        const jobCount = companyJobs.length;

        const companyApplications = applicationsByCompany[company.id] || [];
        const applicationCount = companyApplications.length;

        return {
          id: company.id,
          name: company.name,
          job_count: jobCount,
          application_count: applicationCount,
        };
      });

      return companyStats
        .sort((a, b) => b.application_count - a.application_count || b.job_count - a.job_count)
        .slice(0, 5)
        .map((c) => ({
          name: c.name,
          jobs: c.job_count,
          applications: c.application_count,
        }));
    } catch (error) {
      console.error("Error in getTopCompanies:", error);
      return [];
    }
  }

  private static formatTimeAgo(dateString: string | Date | null | undefined): string {
    if (!dateString) return "Unknown time";

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid date";

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return "just now";
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  }
}

export default AdminService;
