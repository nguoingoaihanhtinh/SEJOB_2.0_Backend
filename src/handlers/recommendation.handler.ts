import { Request, Response, NextFunction } from "express";
import RecommendationService from "@/services/recommendation.service";
import topicSuggestionService from "@/services/topic_suggestion.service";
import careerAdviceService from "@/services/career_advice.service";
import { MessageUtil } from "@/utils/MessageUtil";

export class RecommendationHandler {
    private service: RecommendationService;

    constructor() {
        this.service = new RecommendationService();
    }

    /**
     * GET /api/recommendations/jobs
     * Gợi ý jobs cho student hiện tại dựa trên profile
     */
    getRecommendedJobs = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: MessageUtil.get("UNAUTHORIZED"),
                });
            }

            const limit = parseInt(req.query.limit as string) || 20;

            const recommendations = await this.service.recommendJobsForStudent(userId, limit);

            res.json({
                success: true,
                data: recommendations,
                message: `Found ${recommendations.length} recommended jobs`,
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * GET /api/recommendations/jobs/:jobId/similar
     * Tìm jobs tương tự với job cụ thể
     */
    getSimilarJobs = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const jobId = parseInt((req.params.jobId as string) || "0");
            const limit = parseInt(req.query.limit as string) || 10;

            if (!jobId || isNaN(jobId)) {
                return res.status(400).json({
                    success: false,
                    message: MessageUtil.get("INVALID_JOB_ID"),
                });
            }

            const similarJobs = await this.service.findSimilarJobs(jobId, limit);

            res.json({
                success: true,
                data: similarJobs,
                message: `Found ${similarJobs.length} similar jobs`,
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * GET /api/recommendations/students/:jobId
     * Tìm students phù hợp với job (for company)
     */
    getMatchingStudents = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const jobId = parseInt((req.params.jobId as string) || "0");
            const limit = parseInt(req.query.limit as string) || 20;

            if (!jobId || isNaN(jobId)) {
                return res.status(400).json({
                    success: false,
                    message: MessageUtil.get("INVALID_JOB_ID"),
                });
            }

            const matchingStudents = await this.service.findMatchingStudentsForJob(jobId, limit);

            res.json({
                success: true,
                data: matchingStudents,
                message: `Found ${matchingStudents.length} matching students`,
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * POST /api/recommendations/jobs/custom
     * Gợi ý jobs với custom weights
     */
    getRecommendedJobsWithCustomWeights = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: MessageUtil.get("UNAUTHORIZED"),
                });
            }

            const limit = parseInt(req.query.limit as string) || 20;
            const weights: {
                skills?: number;
                categories?: number;
                location?: number;
                salary?: number;
            } = {};

            if (req.body.skills !== undefined) weights.skills = parseFloat(req.body.skills);
            if (req.body.categories !== undefined) weights.categories = parseFloat(req.body.categories);
            if (req.body.location !== undefined) weights.location = parseFloat(req.body.location);
            if (req.body.salary !== undefined) weights.salary = parseFloat(req.body.salary);

            const recommendations = await this.service.recommendJobsWithCustomWeights(
                userId,
                weights,
                limit
            );

            res.json({
                success: true,
                data: recommendations,
                message: `Found ${recommendations.length} recommended jobs with custom weights`,
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * GET /api/recommendations/jobs/with-topcv
     * Gợi ý jobs cho student bao gồm cả jobs từ TopCV
     */
    getRecommendedJobsWithTopCV = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: MessageUtil.get("UNAUTHORIZED"),
                });
            }

            const limit = parseInt(req.query.limit as string) || 20;

            const recommendations = await this.service.recommendJobsWithTopCV(userId, limit);

            res.json({
                success: true,
                data: recommendations,
                message: `Found ${recommendations.length} recommended jobs (including TopCV)`,
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * GET /api/recommendations/topics
     */
    getTopicSuggestions = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: MessageUtil.get("UNAUTHORIZED"),
                });
            }

            const topics = await topicSuggestionService.suggestTopics(userId);

            res.json({
                success: true,
                data: topics,
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * GET /api/recommendations/career-advice
     * Generate AI career advice for the current student
     */
    getCareerAdvice = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: MessageUtil.get("UNAUTHORIZED"),
                });
            }

            const advice = await careerAdviceService.generateAdvice(userId);

            res.json({
                success: true,
                data: advice,
            });
        } catch (error) {
            next(error);
        }
    };
}

export default RecommendationHandler;
