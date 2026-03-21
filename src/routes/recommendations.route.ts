import { Router } from "express";
import RecommendationHandler from "@/handlers/recommendation.handler";
import { authenticate } from "@/middlewares/auth.middleware";

const router = Router();
const handler = new RecommendationHandler();

router.get("/jobs", authenticate, handler.getRecommendedJobs);

/**
 * Danh sách jobs với custom weights
 */
router.post("/jobs/custom", authenticate, handler.getRecommendedJobsWithCustomWeights);

router.get("/jobs/:jobId/similar", handler.getSimilarJobs);

router.get("/students/:jobId", authenticate, handler.getMatchingStudents);

router.get("/jobs/with-topcv", authenticate, handler.getRecommendedJobsWithTopCV);

router.get("/topics", authenticate, handler.getTopicSuggestions);

export default router;
