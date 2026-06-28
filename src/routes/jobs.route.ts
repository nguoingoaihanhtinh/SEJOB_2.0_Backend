import { Router } from "express";
import {
  listJobs,
  getJob,
  createJob,
  syncES,
  similarJobRecommendation,
  updateJob,
  deleteJob,
  listJobsByCompany,
  listMergedJobs,
  userRecommendationJobs,
  suggestJobs,
} from "@/handlers/jobs.handler";
import { authenticate } from "@/middlewares/auth.middleware";
import { authorizeRoles } from "@/middlewares/authorizeRoles";

const router = Router();

// Public list and get
router.get("/", listJobs);
router.get("/merged", listMergedJobs);
router.get("/suggest", suggestJobs);          // ⚡ autocomplete — phải trước /:id
router.get("/:id", getJob);
router.get("/company/:id", listJobsByCompany);
// router.get("/recommendation", listJobsByCompany);
router.get("/recommendation/me", authenticate, authorizeRoles("Student"), userRecommendationJobs);
router.get("/recommendation/:id/similar", similarJobRecommendation);

// Protected CRUD
router.post("/", authenticate, authorizeRoles("Admin", "Manager", "Employer"), createJob);
// router.post("/", createJob);
router.put("/:id", authenticate, authorizeRoles("Admin", "Manager", "Employer"), updateJob);
router.delete("/:id", authenticate, authorizeRoles("Admin", "Manager", "Employer"), deleteJob);
router.post("/sync-es", syncES);

export default router;
