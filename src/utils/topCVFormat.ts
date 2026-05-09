import _ from "lodash";

// utils/toTopCvFormat.ts
export function toTopCvFormat(job: any, company: any = null, branch: any = null) {
  return {
    id: job.id,
    score: job?.score || null,
    url: job.website_url || "",
    title: job.title,
    description: job.description || "",
    responsibilities: job.responsibilities || [],
    requirement: job.requirement || [],
    nice_to_haves: job.nice_to_haves || [],
    benefit: job.benefit,
    company: company
      ? {
          name: company.name || "",
          logo: company.logo || "",
          url: company.website_url || "",
          size: company.employee_count ? `${Math.max(1, company.employee_count)}+` : "", // or map ranges: 1-50 → "1-50", etc.
          address: branch?.address || "",
        }
      : null,

    media: [], // you don’t expose this yet
    workLocation: [], // optional: pull from company_branches if needed
    workingTime: job.working_time ? [job.working_time] : [],
    applyGuide: job.apply_guide || "",
    isDiamond: Boolean(job.is_diamond),
    isJobFlashActive: Boolean(job.is_job_flash_active),
    isHot: Boolean(job.is_hot),

    salary: {
      from: job.salary_from || 0,
      to: job.salary_to || 0,
      text: job.salary_text || "Thoả thuận",
      currency: job.salary_currency || "VND",
    },

    applyReasons: job.apply_reasons || [],
    deadline: job.job_deadline ? job.job_deadline.split("T")[0] : null, // ISO date → YYYY-MM-DD
    updatedAt: job.updated_at || "",
    type: "", // ← map from employment_types if needed
    quantity: job.quantity || null, // default
    gender: "Không yêu cầu",
    experience: "", // ← map from levels
    position: "Nhân viên",
    shortCity: "", // optional

    // Keep your extra fields if frontend uses them
    externalId: job.external_id,
    status: job.status,
    createdAt: job.created_at,
    company_branches_id: job.company_branches_id,
    company_branches: job.company_branches || [],
    companyId: job.company_id,

    isSaved: Boolean(job.isSaved),

    categories: job.categories || [],
    skills: job.skills || [],
    levels: job.levels || [],
    employment_types: job.employment_types || [],
  };
}
