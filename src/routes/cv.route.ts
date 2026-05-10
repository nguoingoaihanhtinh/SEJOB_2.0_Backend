import { Router } from "express";
import { authenticate } from "@/middlewares/auth.middleware";
import { authorizeRoles } from "@/middlewares/authorizeRoles";
import * as cvHandler from "@/handlers/cv.handler";

const router = Router();

router.get("/", authenticate, cvHandler.getCVs);
router.get("/student/:studentId", authenticate, cvHandler.getCVByStudentId);
router.post("/", authenticate, authorizeRoles("Student"), cvHandler.createCV);
router.post("/extract-data", authenticate, authorizeRoles("Student"), cvHandler.extractCVData);
router.put("/:cvId", authenticate, authorizeRoles("Student"), cvHandler.updateCV);
router.delete("/:cvId", authenticate, authorizeRoles("Student"), cvHandler.deleteCV);

export default router;
