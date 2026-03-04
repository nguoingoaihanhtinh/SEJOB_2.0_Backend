import { Router } from "express";
import { authenticate } from "@/middlewares/auth.middleware";
import { chat, suggestions, faqs, faqById } from "./chatbot.handler";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Chatbot
 *   description: AI-powered chatbot with FAQ matching
 */

/**
 * @swagger
 * /api/chatbot/chat:
 *   post:
 *     summary: Send a message to the chatbot
 *     tags: [Chatbot]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message:
 *                 type: string
 *                 example: "How do I apply for a job?"
 *               history:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     role: { type: string, enum: [user, assistant] }
 *                     content: { type: string }
 *               userRole:
 *                 type: string
 *                 enum: [Guest, Student, Employer, Admin]
 *     responses:
 *       200:
 *         description: Chatbot response with answer and suggestions
 */
// Auth is optional – unauthenticated users get Guest-level responses
router.post(
  "/chat",
  (req, res, next) => {
    // Try to decode token but don't block if missing
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      return authenticate(req, res, next);
    }
    next();
  },
  chat,
);

/**
 * @swagger
 * /api/chatbot/suggestions:
 *   get:
 *     summary: Get contextual quick-option chips based on current input
 *     tags: [Chatbot]
 *     parameters:
 *       - in: query
 *         name: input
 *         schema: { type: string }
 *         description: Current text in the chat input box
 *       - in: query
 *         name: userRole
 *         schema: { type: string, enum: [Guest, Student, Employer, Admin] }
 *     responses:
 *       200:
 *         description: Array of suggested questions
 */
router.get(
  "/suggestions",
  (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) return authenticate(req, res, next);
    next();
  },
  suggestions,
);

/**
 * @swagger
 * /api/chatbot/faqs:
 *   get:
 *     summary: List all FAQs filtered by role
 *     tags: [Chatbot]
 *     parameters:
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [Guest, Student, Employer, Admin] }
 *     responses:
 *       200:
 *         description: Array of FAQ entries
 */
router.get("/faqs", faqs);

/**
 * @swagger
 * /api/chatbot/faqs/{id}:
 *   get:
 *     summary: Get a single FAQ by ID
 *     tags: [Chatbot]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: FAQ entry
 *       404:
 *         description: FAQ not found
 */
router.get("/faqs/:id", faqById);

export default router;
