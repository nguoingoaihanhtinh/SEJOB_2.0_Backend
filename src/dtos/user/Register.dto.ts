import { z } from "zod";
import { MessageUtil } from "@/utils/MessageUtil";

const companyProfileSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  company_types: z.number().array().min(1),
  logo: z.url().optional(),
  background: z.url().optional(),
  description: z.string().optional(),
  phone: z.string(),
  email: z.email().optional(),
  website_url: z.url().optional(),
  images: z.array(z.url()).optional(),
  tech_stack: z.array(z.string()).optional(),
  employee_count: z.number().int().nonnegative().optional(),
  company_branches: z
    .array(
      z.object({
        name: z.string(),
        address: z.string(),
        country_id: z.number(),
        province_id: z.number(),
        ward_id: z.number(),
        created_at: z.string().nullable(),
        updated_at: z.string().nullable(),
      })
    )
    .min(1),
});

export const studentProfileSchema = z.object({
  about: z.string().optional(),
  location: z.string().optional(),
  skills: z.array(z.string()).optional(),
  open_for_opportunities: z.boolean().optional(),
  phone_number: z.string().optional(),
  date_of_birth: z.string().optional(),
  gender: z.enum(["Male", "Female", "Other"]).optional(),
  desired_positions: z.array(z.string()).optional(),
});

export const registerSchema = z
  .object({
    email: z.email("Invalid email address"),
    first_name: z.string().min(1, "First name is required"),
    last_name: z.string().min(1, "Last name is required"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Za-z]/, "Password must contain at least one letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirm_password: z.string().min(8, "Confirm password must be at least 8 characters"),
    role: z.enum(["Student", "Employer", "Manager", "Admin"]).optional().default("Student"),
    company: companyProfileSchema.optional(),
    student_info: studentProfileSchema.optional(),
  })
  .refine(
    (data) => {
      if (data.role === "Employer" && !data.company) {
        return false;
      }
      return true;
    },
    {
      message: MessageUtil.get("COMPANY_PROFILE_IS_REQUIRED_FOR_EMPLOYER_ACCOUNTS"),
      path: ["company"],
    }
  )
  .refine((data) => data.password === data.confirm_password, {
    path: ["confirm_password"],
    message: MessageUtil.get("PASSWORDS_DO_NOT_MATCH"),
  });

export type RegisterDto = z.infer<typeof registerSchema>;
