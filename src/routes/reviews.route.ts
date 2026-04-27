import { Router } from "express";
import { ReviewHandler } from "@/handlers/review.handler";
import { authenticate } from "@/middlewares/auth.middleware";
import { authorizeRoles } from "@/middlewares/authorizeRoles";

const router = Router();

// Public routes
router.get("/company/:companyId", ReviewHandler.getPublicReviewsByCompany);

// Authenticated routes
router.post("/", authenticate, ReviewHandler.create);
router.get("/application/:applicationId", authenticate, ReviewHandler.getReviewsByApplication);

// Admin routes
router.get("/admin", authenticate, authorizeRoles("Admin"), ReviewHandler.getAll);
router.get("/:id", authenticate, authorizeRoles("Admin"), ReviewHandler.getOne);
router.patch("/:id/approve", authenticate, authorizeRoles("Admin"), ReviewHandler.updatePublicStatus);
router.delete("/:id", authenticate, authorizeRoles("Admin"), ReviewHandler.delete);

export default router;
