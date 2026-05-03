import { Database } from "@/types/database";

export interface QueryParams {
  page?: number | undefined;
  limit?: number | undefined;
  fields?: string | undefined;
}

// USER

export type User = Database["public"]["Tables"]["users"]["Row"];
export type UserInsert = Database["public"]["Tables"]["users"]["Insert"];
export type UserUpdate = Database["public"]["Tables"]["users"]["Update"];

export interface UserQueryParams extends QueryParams {
  user_id?: number;
  user_ids?: number[];
  email?: string;
  reset_token?: string;
}

// STUDENT

export type Student = Database["public"]["Tables"]["student"]["Row"];
export type StudentInsert = Database["public"]["Tables"]["student"]["Insert"];
export type StudentUpdate = Database["public"]["Tables"]["student"]["Update"];

export interface StudentQueryAllParams extends QueryParams {
  student_ids?: number[];
  user_ids?: number[];
}

export interface StudentQueryParams extends QueryParams {
  student_id?: number;
  user_id?: number;
}

// COMPANY
export type Company = Database["public"]["Tables"]["companies"]["Row"];
export type CompanyAfterJoined = Company & {
  company_types: CompanyTypes[];
};
export type CompanyInsert = Database["public"]["Tables"]["companies"]["Insert"];
export type CompanyUpdate = Database["public"]["Tables"]["companies"]["Update"];

export interface CompanyQueryAllParams extends QueryParams {
  company_ids?: number[] | undefined;
  company_type_ids?: number[] | undefined;
  employee_count_from?: number | undefined;
  employee_count_to?: number | undefined;
  keyword?: string | undefined;
  email?: string | undefined;
  user_ids?: number[] | undefined;
  order?: "name:asc" | "name:desc" | "created_at:asc" | "created_at:desc" | undefined;
}

export interface CompanyQueryParams extends QueryParams {
  company_id?: number;
  email?: string;
  user_id?: number;
}

// COMPANY_TYPES
export type CompanyTypes = Database["public"]["Tables"]["company_types"]["Row"];
export type CompanyTypesInsert = Database["public"]["Tables"]["company_types"]["Insert"];
export type CompanyTypesUpdate = Database["public"]["Tables"]["company_types"]["Update"];

export interface CompanyTypeQueryParams extends QueryParams {
  company_type_ids?: number[];
  name?: string;
}

// COMPANY_COMPANY_TYPES
export type CompanyCompanyTypes = Database["public"]["Tables"]["company_company_types"]["Row"];
export type CompanyCompanyTypesInsert = Database["public"]["Tables"]["company_company_types"]["Insert"];
export type CompanyCompanyTypesUpdate = Database["public"]["Tables"]["company_company_types"]["Update"];

// JOB
export type Job = Database["public"]["Tables"]["jobs"]["Row"];
export type JobStatus = Database["public"]["Enums"]["jobstatus"];
export type JobAfterJoined = Job & {
  company: Company;
  levels: Level[];
  isSaved?: boolean;
  skills: Skill[];
  categories: Category[];
  company_branches: CompanyBranches[];
};
export type JobInsert = Database["public"]["Tables"]["jobs"]["Insert"];
export type JobUpdate = Database["public"]["Tables"]["jobs"]["Update"];

export type SortableJobFields =
  | "id"
  | "title"
  | "job_posted_at"
  | "created_at"
  | "updated_at"
  | "salary_from"
  | "company_id";

export const SORTABLE_JOB_FIELDS = [
  "id",
  "title",
  "job_posted_at",
  "created_at",
  "updated_at",
  "salary_from",
  "company_id",
] as const;

export interface JobQueryParams extends QueryParams {
  job_ids?: number[];
  company_id?: number;
  province_ids?: number[];
  level_ids?: number[];
  category_ids?: number[];
  skill_ids?: number[];
  employment_type_ids?: number[];
  salary_from?: number;
  salary_to?: number;
  //keyword search in job title
  keyword?: string;
  sort_by?: SortableJobFields;
  order?: "asc" | "desc";
  statuses?: JobStatus[];
}

// CATEGORY
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type CategoryInsert = Database["public"]["Tables"]["categories"]["Insert"];
export type CategoryUpdate = Database["public"]["Tables"]["categories"]["Update"];

export interface CategoryQueryParams extends QueryParams {
  ids?: number[];
  name?: string;
  pagination?: boolean;
}

// JOB_CATEGORY
export type JobCategory = Database["public"]["Tables"]["job_categories"]["Row"];
export type JobCategoryInsert = Database["public"]["Tables"]["job_categories"]["Insert"];
export type JobCategoryUpdate = Database["public"]["Tables"]["job_categories"]["Update"];

export interface JobCategoryQueryParams extends QueryParams {
  id?: number;
  job_ids?: number[];
  category_ids?: number[];
}

// EMPLOYMENT_TYPE
export type EmploymentType = Database["public"]["Tables"]["employment_types"]["Row"];
export type EmploymentTypeInsert = Database["public"]["Tables"]["employment_types"]["Insert"];
export type EmploymentTypeUpdate = Database["public"]["Tables"]["employment_types"]["Update"];

export interface EmploymentTypeQueryParams extends QueryParams {
  ids?: number[];
  name?: string;
  pagination?: boolean;
}

// JOB_EMPLOYMENT_TYPE
export type JobEmploymentType = Database["public"]["Tables"]["job_employment_types"]["Row"];
export type JobEmploymentTypeInsert = Database["public"]["Tables"]["job_employment_types"]["Insert"];
export type JobEmploymentTypeUpdate = Database["public"]["Tables"]["job_employment_types"]["Update"];

export interface JobEmploymentTypeQueryParams extends QueryParams {
  id?: number;
  job_ids?: number[];
  employment_type_ids?: number[];
}

// SKILL
export type Skill = Database["public"]["Tables"]["skills"]["Row"];
export type SkillInsert = Database["public"]["Tables"]["skills"]["Insert"];
export type SkillUpdate = Database["public"]["Tables"]["skills"]["Update"];

export interface SkillQueryParams extends QueryParams {
  ids?: number[];
  name?: string;
  pagination?: boolean;
}

// JOB_SKILL
export type JobSkill = Database["public"]["Tables"]["job_skills"]["Row"];
export type JobSkillInsert = Database["public"]["Tables"]["job_skills"]["Insert"];
export type JobSkillUpdate = Database["public"]["Tables"]["job_skills"]["Update"];

export interface JobSkillQueryParams extends QueryParams {
  id?: number;
  job_ids?: number[];
  skill_ids?: number[];
}

// JOB_LEVEL
export type Level = Database["public"]["Tables"]["levels"]["Row"];
export type LevelInsert = Database["public"]["Tables"]["levels"]["Insert"];
export type LevelUpdate = Database["public"]["Tables"]["levels"]["Update"];

export interface LevelQueryParams extends QueryParams {
  ids?: number[];
  name?: string;
  pagination?: boolean;
}

// JOB_LEVEL_JOBS
export type JobLevel = Database["public"]["Tables"]["job_levels"]["Row"];
export type JobLevelInsert = Database["public"]["Tables"]["job_levels"]["Insert"];
export type JobLevelUpdate = Database["public"]["Tables"]["job_levels"]["Update"];

export interface JobLevelQueryParams extends QueryParams {
  id?: number;
  job_ids?: number[];
  level_ids?: number[];
}

// COMPANY_BRANCHES
export type CompanyBranches = Database["public"]["Tables"]["company_branches"]["Row"];
export type CompanyBranchesInsert = Database["public"]["Tables"]["company_branches"]["Insert"];
export type CompanyBranchesUpdate = Database["public"]["Tables"]["company_branches"]["Update"];

export interface CompanyBranchesQueryAll extends QueryParams {
  ids?: number[];
  company_id?: number;
  name?: string;
}

export interface CompanyBranchesQuery extends QueryParams {
  id?: number;
  company_id?: number;
  name?: string;
}

// JOB_COMPANY_BRANCHES
export type JobCompanyBranches = Database["public"]["Tables"]["job_company_branches"]["Row"];
export type JobCompanyBranchesInsert = Database["public"]["Tables"]["job_company_branches"]["Insert"];
export type JobCompanyBranchesUpdate = Database["public"]["Tables"]["job_company_branches"]["Update"];

// NOTIFICATIONS
export enum NotificationType {
  UserCreated = "user_created",
  UserUpdated = "user_updated",

  JobStatusUpdated = "job_status_updated",
  NewApplication = "new_application",
  ApplicationStatusUpdated = "application_status_updated",
  NewChatMessage = "new_chat_message",
}

export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type NotificationInsert = Database["public"]["Tables"]["notifications"]["Insert"];
export type NotificationUpdate = Database["public"]["Tables"]["notifications"]["Update"];

export interface NotificationQueryAll extends QueryParams {
  ids?: number[];
  receiver_id?: number;
}

// types/common.ts

// SOCIAL LINK
export type SocialLink = Database["public"]["Tables"]["social_links"]["Row"];
export type SocialLinkInsert = Database["public"]["Tables"]["social_links"]["Insert"];
export type SocialLinkUpdate = Database["public"]["Tables"]["social_links"]["Update"];

export interface SocialLinkQueryParams extends QueryParams {
  student_id?: number;
  platform?: string;
}

// EDUCATION
export type Education = Database["public"]["Tables"]["educations"]["Row"];
export type EducationInsert = Database["public"]["Tables"]["educations"]["Insert"];
export type EducationUpdate = Database["public"]["Tables"]["educations"]["Update"];

export interface EducationQueryParams extends QueryParams {
  ids?: number[];
  student_id?: number;
  school?: string;
}

// PROJECT
export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type ProjectInsert = Database["public"]["Tables"]["projects"]["Insert"];
export type ProjectUpdate = Database["public"]["Tables"]["projects"]["Update"];

export interface ProjectQueryParams extends QueryParams {
  ids?: number[];
  student_id?: number;
  name?: string;
}

// CERTIFICATION
export type Certification = Database["public"]["Tables"]["certifications"]["Row"];
export type CertificationInsert = Database["public"]["Tables"]["certifications"]["Insert"];
export type CertificationUpdate = Database["public"]["Tables"]["certifications"]["Update"];

// EXPERIENCE
export type Experience = Database["public"]["Tables"]["experiences"]["Row"];
export type ExperienceInsert = Database["public"]["Tables"]["experiences"]["Insert"];
export type ExperienceUpdate = Database["public"]["Tables"]["experiences"]["Update"];

export interface ExperienceQueryParams extends QueryParams {
  ids?: number[];
  student_id?: number;
  company?: string;
  position?: string;
}

export interface CertificationQueryParams extends QueryParams {
  ids?: number[];
  student_id?: number;
  name?: string;
  organization?: string;
}

// SAVED JOB
export type SavedJob = Database["public"]["Tables"]["saved_jobs"]["Row"];
export type SavedJobInsert = Database["public"]["Tables"]["saved_jobs"]["Insert"];
export type SavedJobUpdate = Database["public"]["Tables"]["saved_jobs"]["Update"];

export interface SavedJobQueryParams {
  user_id?: number;
  job_id?: number;
  saved_job_id?: number;
}

// CV
export type CV = Database["public"]["Tables"]["cv"]["Row"];
export type CVInsert = Database["public"]["Tables"]["cv"]["Insert"];
export type CVUpdate = Database["public"]["Tables"]["cv"]["Update"];

export interface CVQueryParams extends QueryParams {
  cv_id?: number;
  student_id?: number;
}

// APPLICATION
export type Application = Database["public"]["Tables"]["applications"]["Row"];
export type ApplicationInsert = Database["public"]["Tables"]["applications"]["Insert"];
export type ApplicationUpdate = Database["public"]["Tables"]["applications"]["Update"];

export enum ApplicationStatus {
  Applied = "Applied",
  Viewed = "Viewed",
  InterviewScheduled = "Interview_Scheduled",
  Hired = "Hired",
  Rejected = "Rejected",
  Shortlisted = "Shortlisted",
  Offered = "Offered",
  Cancelled = "Cancelled",
}
export type ApplicationStatusUpdate = Pick<Application, "status" | "reviewed_at" | "feedback">;
export const LIST_STUDENT_ALLOWED_UPDATE_STATUS = [ApplicationStatus.Cancelled];
export const LIST_EMPLOYER_ALLOWED_UPDATE_STATUS: Record<ApplicationStatus, readonly ApplicationStatus[]> = {
  [ApplicationStatus.Cancelled]: [],
  [ApplicationStatus.Applied]: [
    ApplicationStatus.Viewed,
    ApplicationStatus.Shortlisted,
    ApplicationStatus.InterviewScheduled,
    ApplicationStatus.Offered,
    ApplicationStatus.Hired,
    ApplicationStatus.Rejected,
  ],
  [ApplicationStatus.Viewed]: [
    ApplicationStatus.Shortlisted,
    ApplicationStatus.InterviewScheduled,
    ApplicationStatus.Offered,
    ApplicationStatus.Hired,
    ApplicationStatus.Rejected,
  ],
  [ApplicationStatus.Shortlisted]: [
    ApplicationStatus.InterviewScheduled,
    ApplicationStatus.Offered,
    ApplicationStatus.Hired,
    ApplicationStatus.Rejected,
  ],
  [ApplicationStatus.Offered]: [ApplicationStatus.Hired, ApplicationStatus.Rejected],
  [ApplicationStatus.InterviewScheduled]: [
    ApplicationStatus.Hired,
    ApplicationStatus.Rejected,
    ApplicationStatus.Shortlisted,
    ApplicationStatus.Offered,
  ],
  [ApplicationStatus.Hired]: [],
  [ApplicationStatus.Rejected]: [],
};

export interface ApplicationQueryAllParams extends QueryParams {
  ids?: number[];
  statuses?: ApplicationStatus[];
  user_id?: number | null;
  company_id?: number | null;
  job_id?: number | null;
  sort_by?: "created_at" | "updated_at";
  order?: "asc" | "desc";
}

export interface ApplicationQueryParams extends QueryParams {
  id?: number;
  user_id?: number;
  company_id?: number;
  job_id?: number;
}

// APPLICATION STATUS DETAILS
export type ApplicationStatusDetails = Database["public"]["Tables"]["application_status_details"]["Row"];
export type ApplicationStatusDetailsInsert = Database["public"]["Tables"]["application_status_details"]["Insert"];
export type ApplicationStatusDetailsUpdate = Database["public"]["Tables"]["application_status_details"]["Update"];

export interface ApplicationStatusDetailsQueryParams extends QueryParams {
  application_id?: number;
}

// REVIEWS
export enum ReviewType {
  CompanyToApplicant = "COMPANY_TO_APPLICANT",
  ApplicantToCompany = "APPLICANT_TO_COMPANY",
}

export interface Review {
  id: number;
  application_id: number;
  reviewer_id: number;
  type: ReviewType;
  rating: number;
  comment: string | null;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReviewInsert {
  application_id: number;
  reviewer_id: number;
  type: ReviewType;
  rating: number;
  comment?: string | null;
  is_approved?: boolean;
}

export interface ReviewUpdate {
  rating?: number;
  comment?: string | null;
  is_approved?: boolean;
  updated_at?: Date | string;
}

export interface ReviewQueryParams extends QueryParams {
  id?: number;
  application_id?: number;
  reviewer_id?: number;
  type?: ReviewType;
  company_id?: number; // Helper for fetching reviews for a company
  is_approved?: boolean;
  order?: "asc" | "desc";
}
