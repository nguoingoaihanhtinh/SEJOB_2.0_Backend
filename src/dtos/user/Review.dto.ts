import { ReviewType } from "@/types/common";
import { z } from "zod";

export const createReviewSchema = z.object({
  application_id: z.number().int().positive(),
  type: z.enum([ReviewType.CompanyToApplicant, ReviewType.ApplicantToCompany]),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

export const updateReviewStatusSchema = z.object({
  is_approved: z.boolean(),
});

export type CreateReviewDTO = z.infer<typeof createReviewSchema>;
export type UpdateReviewStatusDTO = z.infer<typeof updateReviewStatusSchema>;
