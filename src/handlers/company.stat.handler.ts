// src/handlers/company.stats.handler.ts
import { Request, Response } from "express";
import { NotFoundError } from "@/utils/errors";
import { supabase } from "@/config/supabase";
import { MessageUtil } from "@/utils/MessageUtil";

export async function getCompanyStats(req: Request, res: Response) {
  const companyIdStr = req.params.id;
  const yearParam = req.query.year as string;

  if (!companyIdStr) {
    throw new NotFoundError({ message: MessageUtil.get("COMPANY_ID_IS_REQUIRED") });
  }

  const companyId = Number(companyIdStr);
  const year = yearParam ? parseInt(yearParam) : new Date().getFullYear();

  if (isNaN(companyId) || companyId <= 0) {
    throw new NotFoundError({ message: MessageUtil.get("INVALID_COMPANY_ID") });
  }

  if (yearParam && (isNaN(year) || year < 2000 || year > 2100)) {
    throw new NotFoundError({ message: MessageUtil.get("INVALID_YEAR_PARAMETER") });
  }

  try {
    const { data, error } = await supabase.rpc("get_company_statistics", {
      company_id_param: companyId,
      year_param: year,
    });

    if (error) {
      console.error("RPC Error:", error);
      throw new Error("Failed to fetch statistics");
    }

    const stats = typeof data === "string" ? JSON.parse(data) : data;

    res.status(200).json({
      success: true,
      data: {
        selectedYear: stats.selected_year || year,
        availableYears: stats.available_years || [],
        overview: {
          totalJobs: stats.total_jobs || 0,
          activeJobs: stats.active_jobs || 0,
          closedJobs: stats.closed_jobs || 0,
          totalApplications: stats.total_applications || 0,
          successfulApplications: stats.successful_applications || 0,
          successRate: stats.success_rate || 0,
        },
        timeline: {
          jobsByMonth: stats.jobs_by_month || {},
          applicationsByMonth: stats.applications_by_month || {},
        },
        categories: {
          employmentTypes: stats.employment_types || {},
          topSkills: stats.top_skills || {},
        },
      },
    });
  } catch (error: any) {
    console.error("🔥 getCompanyStats failed:", error);
    res.status(500).json({
      success: false,
      message: MessageUtil.get("FAILED_TO_FETCH_COMPANY_STATISTICS"),
      error: error.message,
    });
  }
}
