import { Request, Response } from "express";
import { ReviewService } from "@/services/review.service";
import { createReviewSchema, updateReviewStatusSchema, updateReviewSchema } from "@/dtos/user/Review.dto";
import { ReviewType } from "@/types/common";

export const ReviewHandler = {
  async getAll(req: Request, res: Response) {
    const params = req.query as any;
    const reviews = await ReviewService.findAll(params);
    return res.json(reviews);
  },

  async getOne(req: Request, res: Response) {
    const id = parseInt(req.params.id as string);
    const review = await ReviewService.findOne(id);
    return res.json(review);
  },

  async create(req: Request, res: Response) {
    const validated = createReviewSchema.parse(req.body);
    const reviewer_id = (req as any).user.userId;

    const review = await ReviewService.create({
      ...validated,
      reviewer_id,
    });

    return res.status(201).json(review);
  },

  async update(req: Request, res: Response) {
    const id = parseInt(req.params.id as string);
    const validated = updateReviewSchema.parse(req.body);
    const review = await ReviewService.update(id, validated);
    return res.json(review);
  },

  async updatePublicStatus(req: Request, res: Response) {
    const id = parseInt(req.params.id as string);
    const validated = updateReviewStatusSchema.parse(req.body);

    const review = await ReviewService.updatePublicStatus(id, validated);
    return res.json(review);
  },

  async delete(req: Request, res: Response) {
    const id = parseInt(req.params.id as string);
    await ReviewService.delete(id);
    return res.status(204).send();
  },

  async getPublicReviewsByCompany(req: Request, res: Response) {
    const companyId = parseInt(req.params.companyId as string);
    const params = req.query;

    const reviews = await ReviewService.getPublicReviewsByCompany(companyId, params);
    return res.json(reviews);
  },

  async getReviewsByApplication(req: Request, res: Response) {
    const applicationId = parseInt(req.params.applicationId as string);
    const reviews = await ReviewService.findAll({ application_id: applicationId } as any);
    return res.json(reviews);
  }
};
