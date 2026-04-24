import { Request, Response } from "express";
import { supabase } from "../config/supabase";
import { UnauthorizedError, InternalServerError, ForbiddenError, BadRequestError } from "../utils/errors";

export class ChatHandler {
  static async getConversations(req: Request, res: Response) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedError({ message: "Unauthorized" });
    }

    // A conversation is where the user is either the employer or student
    const { data: conversations, error } = await supabase
      .from("chat_conversations")
      .select(`
        *,
        employer:users!chat_conversations_employer_id_fkey(user_id, first_name, last_name, avatar),
        student:users!chat_conversations_student_id_fkey(user_id, first_name, last_name, avatar),
        job:jobs(id, title)
      `)
      .or(`employer_id.eq.${userId},student_id.eq.${userId}`)
      .order("updated_at", { ascending: false });

    if (error) {
      throw new InternalServerError({ message: error.message });
    }

    res.status(200).json({
      status: "success",
      data: conversations,
    });
  }

  static async getMessages(req: Request, res: Response) {
    const userId = req.user?.userId;
    const conversationId = req.params.conversationId;

    if (!userId) {
      throw new UnauthorizedError({ message: "Unauthorized" });
    }

    // Verify user is part of the conversation
    const { data: conv, error: convError } = await supabase
      .from("chat_conversations")
      .select("id")
      .eq("id", conversationId)
      .or(`employer_id.eq.${userId},student_id.eq.${userId}`)
      .single();

    if (convError || !conv) {
      throw new ForbiddenError({ message: "Not authorized to view this conversation" });
    }

    const { data: messages, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      throw new InternalServerError({ message: error.message });
    }

    res.status(200).json({
      status: "success",
      data: messages,
    });
  }

  static async initiateConversation(req: Request, res: Response) {
    const employerId = req.user?.userId;
    const { studentId, jobId } = req.body;

    if (!employerId || !studentId) {
      console.warn("initiateConversation missing params:", { employerId, studentId, jobId, body: req.body });
      throw new BadRequestError({ message: "Missing parameters" });
    }

    // Check if exists
    let { data: existingConv } = await supabase
      .from("chat_conversations")
      .select("*")
      .eq("employer_id", employerId)
      .eq("student_id", studentId)
      .eq("job_id", jobId)
      .single();

    if (existingConv) {
      return res.status(200).json({
        status: "success",
        data: existingConv,
      });
    }

    // Create new
    const { data: newConv, error } = await supabase
      .from("chat_conversations")
      .insert({
        employer_id: employerId,
        student_id: studentId,
        job_id: jobId,
      })
      .select("*")
      .single();
      
    if (error) {
      throw new InternalServerError({ message: error.message });
    }

    res.status(201).json({
      status: "success",
      data: newConv,
    });
  }
}
