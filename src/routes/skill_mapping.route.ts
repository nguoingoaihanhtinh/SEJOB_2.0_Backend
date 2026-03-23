import { Router } from "express";
import { authenticate } from "@/middlewares/auth.middleware";
import { authorizeRoles } from "@/middlewares/authorizeRoles";
import {
  getSkillMappings,
  getSkillMapping,
  createSkillMapping,
  updateSkillMapping,
  deleteSkillMapping,
  expandSkills,
} from "@/handlers/skill_mapping.handler";

const router = Router();

router.get("/", getSkillMappings);
router.get("/:id", getSkillMapping);
router.post("/", authenticate, authorizeRoles("Admin", "Manager"), createSkillMapping);
router.put("/:id", authenticate, authorizeRoles("Admin", "Manager"), updateSkillMapping);
router.delete("/:id", authenticate, authorizeRoles("Admin", "Manager"), deleteSkillMapping);

// Debug / utility endpoint — expand skills using the mapping table
router.post("/expand", authenticate, expandSkills);

export default router;
