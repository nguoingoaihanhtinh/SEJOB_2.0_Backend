import OpenAI from "openai";
import studentRepository from "@/repositories/student.repository";
import { supabase } from "@/config/supabase";

let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export class TopicSuggestionService {
    async suggestTopics(userId: number) {
        if (!openai) {
            throw new Error("OpenAI is not configured");
        }

        const student = await studentRepository.findByUserId(userId);
        if (!student) throw new Error("Student profile not found");

        const [eduRes, expRes] = await Promise.all([
            supabase.from("educations").select("*").eq("student_id", student.id),
            supabase.from("experiences").select("*").eq("student_id", student.id)
        ]);

        const educations = eduRes.data || [];
        const experiences = expRes.data || [];
        const skills = (student as any).skills || [];

        const prompt = `
You are an expert career coach for software engineers. The user wants to improve their employability.
Based on their background, suggest 5 technical topics, tools, or concepts they should learn next.
Return the output EXACTLY as a JSON object with this schema:
{
  "suggestions": [
    {
      "topic": string, // The name of the topic
      "difficulty": string, // "Beginner", "Intermediate", or "Advanced"
      "reason": string // 1-2 sentences explaining why this fits their background
    }
  ]
}

Candidate Background:
Major/Subject: ${educations.map(e => e.field_of_study).join(", ")}
Current Skills: ${skills.join(", ")}
Past Experience: ${experiences.map(e => e.position).join(", ")}
    `;

        try {
            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }],
                response_format: { type: "json_object" },
                temperature: 0.7,
            });

            const resultText = response.choices[0]?.message?.content;
            return JSON.parse(resultText || "{}");
        } catch (error: any) {
            console.error("Error suggesting topics with OpenAI:", error.message);
            // Fallback response for Insufficient Quota
            return {
                suggestions: [
                    {
                        topic: "System Design Essentials",
                        difficulty: "Intermediate",
                        reason: "(Fallback Mode) The AI quota is exhausted. We universally recommend learning system scalability."
                    },
                    {
                        topic: "Cloud Hosting (AWS/GCP)",
                        difficulty: "Advanced",
                        reason: "(Fallback Mode) Deploying full-stack applications is a crucial skill."
                    },
                    {
                        topic: "Testing Strategies",
                        difficulty: "Beginner",
                        reason: "(Fallback Mode) Unit and integration testing ensures robust applications."
                    }
                ]
            };
        }
    }
}

export default new TopicSuggestionService();
