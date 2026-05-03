import { z } from "zod";
import { required } from "zod/v4/core/util.cjs";

const benefitItemSchema = z.object({
  icon: z.string(),
  title: z.string(),
  description: z.string(),
});

const requiredSkillSchema = z.object({
  id: z.number().int().positive().nullable().optional(),
  name: z.string(),
});

export const createJobSchema = z.object({
  external_id: z.number().optional(),
  website_url: z.string().optional(),
  company_id: z.number().int().positive(),
  title: z.string().min(1, "Job title is required"),
  responsibilities: z.array(z.string()).optional(),
  requirement: z.array(z.string()).optional(),
  nice_to_haves: z.array(z.string()).optional(),
  benefit: z.array(benefitItemSchema).optional(),
  working_time: z.string().optional(),
  description: z.string().optional(),
  apply_guide: z.string().optional(),
  is_diamond: z.boolean().optional(),
  is_job_flash_active: z.boolean().optional(),
  is_hot: z.boolean().optional(),
  salary_from: z.number().optional(),
  salary_to: z.number().optional(),
  salary_text: z.string().optional(),
  salary_currency: z.string().optional(),
  job_posted_at: z.string().optional(),
  job_deadline: z.string().optional(),
  apply_reasons: z.array(z.string()).optional(),
  status: z.string().optional(),
  quantity: z.number().int().positive().optional(),
  // Relations
  company_branches_ids: z.array(z.number().int().positive()).min(1, "Please select at least one branch"),
  category_ids: z.array(z.number().int().positive()).min(1, "Please select at least one category"),
  required_skill_ids: z.array(z.number().int().positive()).min(1, "Please select at least one skill"),
  employment_type_ids: z.array(z.number().int().positive()).min(1, "Please select at least one employment type"),
  level_ids: z.array(z.number().int().positive()).min(1, "Please select at least one level"),
});

export type CreateJobDto = z.infer<typeof createJobSchema>;
