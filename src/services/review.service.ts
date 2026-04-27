import ReviewRepository from "@/repositories/review.repository";
import ApplicationRepository from "@/repositories/application.repository";
import { CreateReviewDTO, UpdateReviewStatusDTO } from "@/dtos/user/Review.dto";
import { NotFoundError, ForbiddenError, BadRequestError } from "@/utils/errors";
import { ReviewQueryParams, ReviewType, ReviewInsert, QueryParams } from "@/types/common";
import { MessageUtil } from "@/utils/MessageUtil";

export const ReviewService = {
  async findAll(params: ReviewQueryParams) {
    return await ReviewRepository.findAll(params);
  },

  async findOne(id: number) {
    const review = await ReviewRepository.findOne(id);
    if (!review) throw new NotFoundError({ message: "Review not found" });
    return review;
  },

  async create(payload: CreateReviewDTO & { reviewer_id: number }) {
    const application = await ApplicationRepository.findOne({ id: payload.application_id });
    if (!application) {
      throw new NotFoundError({ message: MessageUtil.get("APPLICATION_NOT_FOUND") });
    }
    if (payload.type === ReviewType.CompanyToApplicant) {
      if (application.company_id === undefined) {
        throw new BadRequestError({ message: "Application does not have a company ID" });
      }
      // We need to check if the reviewer_id belongs to the company.
      // In this system, companies have a user_id.
      const { data: companies } = await supabase.from("companies").select("user_id").eq("id", application.company_id);
      const company = companies?.[0];

      if (!company || company.user_id !== payload.reviewer_id) {
        throw new ForbiddenError({ message: "You are not authorized to review this applicant" });
      }
    } else if (payload.type === ReviewType.ApplicantToCompany) {
      // Reviewer must be the applicant
      if (application.user_id !== payload.reviewer_id) {
        throw new ForbiddenError({ message: "You are not authorized to review this company" });
      }
    }

    // 3. Check if review already exists for this application and type
    const existing = await ReviewRepository.findByApplicationIdAndType(payload.application_id, payload.type);
    if (existing) {
      throw new BadRequestError({ message: "You have already submitted a review for this application" });
    }

    // 4. Create review
    const dbPayload: ReviewInsert = {
      ...payload,
      comment: payload.comment ?? null,
      is_approved: false, // Always false by default, admin approves
    };

    return await ReviewRepository.create(dbPayload);
  },

  async updatePublicStatus(id: number, payload: UpdateReviewStatusDTO) {
    const review = await ReviewRepository.findOne(id);
    if (!review) throw new NotFoundError({ message: "Review not found" });

    // Review of student is private, it should never be public according to user request.
    // "the review of a student is private, only the employer sent the review can see"
    // "admin can see 2 types of review and have the option to publicly approve review for company"
    if (review.type === ReviewType.CompanyToApplicant && payload.is_approved === true) {
      throw new BadRequestError({ message: "Student reviews cannot be made public" });
    }

    return await ReviewRepository.update(id, {
      is_approved: payload.is_approved,
      updated_at: new Date(),
    });
  },

  async delete(id: number) {
    return await ReviewRepository.delete(id);
  },

  async getPublicReviewsByCompany(companyId: number, params: QueryParams) {
    return await ReviewRepository.findAll({
      ...params,
      company_id: companyId,
      type: ReviewType.ApplicantToCompany,
      is_approved: true,
    });
  },
};

import { supabase } from "@/config/supabase";
