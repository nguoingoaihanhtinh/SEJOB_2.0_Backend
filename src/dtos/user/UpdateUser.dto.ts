import { studentProfileSchema } from "@/dtos/user/Register.dto";
import { z } from "zod";
import { MessageUtil } from "@/utils/MessageUtil";

export const updateUserSchema = z
  .object({
    avatar: z.string().nullable().optional(),
    first_name: z.string().min(1, "First name is required").optional(),
    last_name: z.string().min(1, "Last name is required").optional(),
    email: z.string().email("Invalid email address").optional(),
    role: z.enum(["Student", "Employer", "Manager", "Admin"]).optional(),
    is_active: z.boolean().optional(),
    updated_at: z.string().optional(),
    student_info: studentProfileSchema.optional(),
  })
  .refine(
    (data) => {
      // At least one field must be provided
      return Object.keys(data).length > 0;
    },
    {
      message: MessageUtil.get("AT_LEAST_ONE_FIELD_MUST_BE_PROVIDED_FOR_UPDATE"),
    }
  );

export type UpdateUserDto = z.infer<typeof updateUserSchema>;
