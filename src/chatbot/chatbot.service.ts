import natural from "natural";
import OpenAI from "openai";
import { FAQ_DB } from "./chatbot.faq";
import { FAQ, ChatRequest, ChatResponse, SuggestedQuestion, SuggestionsRequest, UserRole } from "./chatbot.types";
import logger from "@/utils/logger";

// ─── NLP setup ────────────────────────────────────────────────────────────────
const tokenizer = new natural.WordTokenizer();
const stemmer = natural.PorterStemmer;
const TfIdf = natural.TfIdf;

/** Minimum TF-IDF score to accept an FAQ match (tune as needed) */
const MATCH_THRESHOLD = 0.18;
/** Max quick-option chips returned */
const MAX_SUGGESTIONS = 5;

// ─── OpenAI setup (optional – gracefully degrades when key is absent) ─────────
let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// ─── NLP helpers ─────────────────────────────────────────────────────────────

function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .trim();
}

function stemTokens(text: string): string[] {
  return tokenizer.tokenize(normalise(text)).map((t) => stemmer.stem(t));
}

function scoreFAQ(faq: FAQ, query: string): number {
  const tfidf = new TfIdf();
  const doc = [faq.question, ...faq.keywords].join(" ");
  tfidf.addDocument(stemTokens(doc).join(" "));

  let score = 0;
  const queryTokens = stemTokens(query);
  queryTokens.forEach((token) => {
    tfidf.tfidfs(token, (_i: number, measure: number) => {
      score += measure;
    });
  });

  return queryTokens.length > 0 ? score / queryTokens.length : 0;
}

function filterByRole(role?: UserRole): FAQ[] {
  if (!role || role === "Guest") {
    return FAQ_DB.filter((f) => f.roles.length === 0 || f.roles.includes("Guest"));
  }
  return FAQ_DB.filter((f) => f.roles.length === 0 || f.roles.includes(role));
}

function findBestMatch(query: string, role?: UserRole): { faq: FAQ; score: number } | null {
  const pool = filterByRole(role);
  let best: { faq: FAQ; score: number } | null = null;

  for (const faq of pool) {
    const score = scoreFAQ(faq, query);
    if (!best || score > best.score) {
      best = { faq, score };
    }
  }

  return best && best.score >= MATCH_THRESHOLD ? best : null;
}

function buildSuggestions(input: string, role?: UserRole): SuggestedQuestion[] {
  const pool = filterByRole(role);

  if (input.trim().length === 0) {
    return pool.slice(0, MAX_SUGGESTIONS).map((f) => ({
      id: f.id,
      question: f.question,
      category: f.category,
    }));
  }

  return pool
    .map((f) => ({ faq: f, score: scoreFAQ(f, input) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_SUGGESTIONS)
    .map((s) => ({ id: s.faq.id, question: s.faq.question, category: s.faq.category }));
}

// ─── AI system prompt ─────────────────────────────────────────────────────────

function buildSystemPrompt(role?: UserRole): string {
  return `You are SEBot, a helpful assistant for SEJobs – a job platform connecting students with employers.
${role && role !== "Guest" ? `The user is logged in as a ${role}.` : "The user is a guest (not logged in)."}

Platform facts:
- Students: search jobs, apply, upload CVs, get AI recommendations, set job alerts.
- Employers: post jobs, manage applications, set up company profile.
- Job posts require admin approval before going live (verified companies are exempt).
- Admins: manage users, approve/reject jobs, moderate platform.
- The platform is free for students.

Rules:
- Only answer questions related to SEJobs features, job searching, applying, or career advice.
- Politely decline and redirect if the question is completely off-topic.
- Be concise (3-4 sentences max; use bullet points for lists).
- Never reveal database schemas, internal architecture, or confidential data.`;
}

// ─── Exported service functions ───────────────────────────────────────────────

export async function chat(req: ChatRequest): Promise<ChatResponse> {
  const { message, history = [], userRole } = req;

  // 1. Fast FAQ match – no API cost
  const match = findBestMatch(message, userRole);
  if (match) {
    logger.info(`[Chatbot] FAQ hit: ${match.faq.id} (score=${match.score.toFixed(3)})`);
    return {
      answer: match.faq.answer,
      source: "faq",
      matchedFaqId: match.faq.id,
      suggestions: buildSuggestions(message, userRole),
    };
  }

  // 2. AI fallback
  if (openai) {
    try {
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: "system", content: buildSystemPrompt(userRole) },
        ...history.slice(-10).map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user", content: message },
      ];

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        max_tokens: 400,
        temperature: 0.4,
      });

      const aiAnswer = completion.choices[0]?.message?.content?.trim();
      if (aiAnswer) {
        logger.info(`[Chatbot] AI answer for: "${message.slice(0, 60)}"`);
        return {
          answer: aiAnswer,
          source: "ai",
          suggestions: buildSuggestions(message, userRole),
        };
      }
    } catch (err) {
      logger.error(`[Chatbot] OpenAI error: ${(err as Error).message}`);
    }
  }

  // 3. Generic fallback
  return {
    answer:
      "I'm not sure how to answer that. Try rephrasing, or pick a suggested topic below. You can also reach us at support@sejobs.com.",
    source: "fallback",
    suggestions: buildSuggestions("", userRole),
  };
}

export function getSuggestions(req: SuggestionsRequest): SuggestedQuestion[] {
  return buildSuggestions(req.input, req.userRole);
}

export function getFaqById(id: string): FAQ | undefined {
  return FAQ_DB.find((f) => f.id === id);
}

export function listFaqs(role?: UserRole): FAQ[] {
  return filterByRole(role);
}
