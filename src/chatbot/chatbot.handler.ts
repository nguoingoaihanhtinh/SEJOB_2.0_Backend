import { Request, Response } from "express";
import { z } from "zod";
import * as chatbotService from "./chatbot.service";
import { UserRole } from "./chatbot.types";
import { BadRequestError } from "@/utils/errors";
import { MessageUtil } from "@/utils/MessageUtil";

const chatSchema = z.object({
  message: z.string().min(1, "message is required").max(1000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .max(20)
    .optional(),
  userRole: z.enum(["Guest", "Student", "Employer", "Admin"]).optional(),
});

const suggestionsSchema = z.object({
  input: z.string().max(500).default(""),
  userRole: z.enum(["Guest", "Student", "Employer", "Admin"]).optional(),
});

export async function chat(req: Request, res: Response) {
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new BadRequestError({ message: parsed.error.issues.map((e) => e.message).join(", ") });
  }

  const inferredRole = (req.user?.role as UserRole | undefined) ?? parsed.data.userRole;

  const response = await chatbotService.chat({
    message: parsed.data.message,
    history: parsed.data.history,
    ...(inferredRole ? { userRole: inferredRole } : {}),
  });

  return res.json({ success: true, data: response });
}

export function suggestions(req: Request, res: Response) {
  const parsed = suggestionsSchema.safeParse(req.query);
  if (!parsed.success) {
    throw new BadRequestError({ message: parsed.error.issues.map((e) => e.message).join(", ") });
  }

  const inferredRole = (req.user?.role as UserRole | undefined) ?? parsed.data.userRole;

  const data = chatbotService.getSuggestions({
    input: parsed.data.input,
    ...(inferredRole ? { userRole: inferredRole } : {}),
  });

  return res.json({ success: true, data });
}

export function faqs(req: Request, res: Response) {
  const role =
    (req.user?.role as UserRole | undefined) ??
    (typeof req.query.role === "string" ? (req.query.role as UserRole) : undefined);
  const data = chatbotService.listFaqs(role);
  return res.json({ success: true, data });
}

export function faqById(req: Request, res: Response) {
  const rawId = req.params["id"];
  const id = Array.isArray(rawId) ? (rawId[0] ?? "") : (rawId ?? "");
  const faq = chatbotService.getFaqById(id);
  if (!faq) {
    return res.status(404).json({ success: false, message: MessageUtil.get("FAQ_NOT_FOUND") });
  }
  return res.json({ success: true, data: faq });
}
