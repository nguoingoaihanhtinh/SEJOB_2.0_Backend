import { Router } from "express";
import { listJobs, getJob, createJob, syncES, updateJob, deleteJob, listJobsByCompany, listMergedJobs } from "@/handlers/jobs.handler";
import { authenticate } from "@/middlewares/auth.middleware";
import { authorizeRoles } from "@/middlewares/authorizeRoles";

const router = Router();

// Public list and get
router.get("/", authenticate, authorizeRoles("Admin", "Manager", "Employer"), listJobs);
router.get("/merged", listMergedJobs);
router.get("/:id", getJob);
router.get("/company/:id", listJobsByCompany);


// Protected CRUD
router.post("/", authenticate, authorizeRoles("Admin", "Manager", "Employer"), createJob);
// router.post("/", createJob);
router.put("/:id", authenticate, authorizeRoles("Admin", "Manager", "Employer"), updateJob);
router.delete("/:id", authenticate, authorizeRoles("Admin", "Manager", "Employer"), deleteJob);
router.post("/sync-es", authenticate, authorizeRoles("Admin"), syncES);


export default router;
