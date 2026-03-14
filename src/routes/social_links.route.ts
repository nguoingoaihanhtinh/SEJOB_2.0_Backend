import { Router } from "express";
import { authenticate } from "@/middlewares/auth.middleware";
import { createSocialLink, updateSocialLink, deleteSocialLink, listSocialLinks, getSocialLink } from "@/handlers/social_links.handler";

const router = Router();

router.use(authenticate);

router.get("/", listSocialLinks);
router.get("/:userId", getSocialLink);
router.post("/:userId", createSocialLink);
router.put("/:userId", updateSocialLink);
router.delete("/:userId", deleteSocialLink);

export default router;
