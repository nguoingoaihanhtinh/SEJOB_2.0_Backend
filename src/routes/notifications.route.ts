import { Router } from "express";

import { getNotifications, markAllAsRead, markAsRead } from "@/handlers/notifications.handler";

const router = Router();

router.get("/", getNotifications);
router.put("/mark-as-read", markAsRead);
router.put("/mark-all-as-read", markAllAsRead);

export default router;
