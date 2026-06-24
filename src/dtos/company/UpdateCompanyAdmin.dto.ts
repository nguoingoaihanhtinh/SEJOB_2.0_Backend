import { z } from "zod";

export const updateCompanyAdminSchema = z.object({
  id: z.number().optional(),
  external_id: z.number().nullable().optional(),
  name: z.string().optional(),
  tech_stack: z.array(z.string()).nullable().optional(),
  logo: z.url("Logo must be a valid URL").nullable().optional(),
  background: z.url("Background must be a valid URL").nullable().optional(),
  description: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.email("Invalid email address").nullable().optional(),
  website_url: z.url("Website URL must be valid").nullable().optional(),
  socials: z.record(z.string(), z.any()).nullable().optional(),
  images: z.array(z.url("Image must be a valid URL")).nullable().optional(),
  employee_count: z.number().int("Employee count must be an integer").nullable().optional(),
  company_types: z.array(z.number()).optional(),
  scoring_config: z.any().optional(),
  is_verified: z.boolean().optional(),
  is_active: z.boolean().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

export type UpdateCompanyAdminDto = z.infer<typeof updateCompanyAdminSchema>;
