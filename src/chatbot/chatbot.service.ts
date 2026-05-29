import natural from "natural";
import OpenAI from "openai";
import { getOpenAI, getModel } from "@/utils/openai";
import { FAQ_DB } from "./chatbot.faq";
import { FAQ, ChatRequest, ChatResponse, SuggestedQuestion, SuggestionsRequest, UserRole } from "./chatbot.types";
import logger from "@/utils/logger";

const tokenizer = new natural.WordTokenizer();
const stemmer = natural.PorterStemmer;
const TfIdf = natural.TfIdf;

const MATCH_THRESHOLD = 0.18;
const NEAR_MISS_THRESHOLD = 0.10;
const MAX_SUGGESTIONS = 5;
const MAX_MESSAGE_LENGTH = 1000;
const CACHE_MAX_SIZE = 100;

const VI_PATTERNS: [RegExp, string][] = [
  [/[àáạảãâầấậẩẫăằắặẳẵ]/g, "a"],
  [/[èéẹẻẽêềếệểễ]/g, "e"],
  [/[ìíịỉĩ]/g, "i"],
  [/[òóọỏõôồốộổỗơờớợởỡ]/g, "o"],
  [/[ùúụủũưừứựửữ]/g, "u"],
  [/[ỳýỵỷỹ]/g, "y"],
  [/đ/g, "d"],
];

function hasVietnamese(text: string): boolean {
  return /[\u00C0-\u1EF9]/.test(text);
}

function removeDiacritics(text: string): string {
  let result = text.toLowerCase();
  for (const [re, ch] of VI_PATTERNS) {
    result = result.replace(re, ch);
  }
  return result;
}

function normalise(text: string): string {
  return removeDiacritics(text)
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stemTokens(text: string): string[] {
  const isVietnamese = hasVietnamese(text);
  const tokens = tokenizer.tokenize(normalise(text));
  if (!tokens) return [];
  if (isVietnamese) return tokens;
  return tokens.map((t) => stemmer.stem(t));
}

function scoreFAQ(faq: FAQ, query: string): number {
  const tfidf = new TfIdf();
  const doc = [faq.question, ...faq.keywords].join(" ");
  tfidf.addDocument(stemTokens(doc).join(" "));

  let score = 0;
  const queryTokens = stemTokens(query);
  if (queryTokens.length === 0) return 0;

  queryTokens.forEach((token) => {
    tfidf.tfidfs(token, (_i: number, measure: number) => {
      score += measure;
    });
  });

  return score / queryTokens.length;
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

function findNearMatch(query: string, role?: UserRole): { faq: FAQ; score: number } | null {
  const pool = filterByRole(role);
  let best: { faq: FAQ; score: number } | null = null;

  for (const faq of pool) {
    const score = scoreFAQ(faq, query);
    if (!best || score > best.score) {
      best = { faq, score };
    }
  }

  return best && best.score >= NEAR_MISS_THRESHOLD && best.score < MATCH_THRESHOLD ? best : null;
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

// ─── Exact-match cache for FAQ hits (cost-free repeat answers) ─────────────

const faqCache = new Map<string, ChatResponse>();

function getCachedFAQ(input: string, role?: UserRole): ChatResponse | undefined {
  const key = `${role || "Guest"}::${input.toLowerCase().trim()}`;
  return faqCache.get(key);
}

function setCachedFAQ(input: string, role: UserRole | undefined, response: ChatResponse): void {
  const key = `${role || "Guest"}::${input.toLowerCase().trim()}`;
  faqCache.set(key, response);
  if (faqCache.size > CACHE_MAX_SIZE) faqCache.clear();
}

// ─── AI system prompt ─────────────────────────────────────────────────────────

function buildSystemPrompt(role?: UserRole): string {
  const roleLine =
    role && role !== "Guest"
      ? `The user is logged in as a ${role}.`
      : "The user is a guest (not logged in).";
  return `You are SEBot, a helpful assistant for SEJobs – a job platform connecting students with employers.
${roleLine}

Platform facts:
- Students: Search jobs, apply, upload PDF CVs, get AI job recommendations based on skills and profile.
- Employers: Post jobs, manage applications, set up company profiles, and chat with applicants.
- AI CV Scoring: The platform automatically scores CVs against job requirements, considering skills, education (IT vs. non-IT), projects, and work experience.
- Real-time Chat: Students and employers can message each other directly.
- Notifications: Real-time and email alerts for new messages, application updates, and relevant jobs.
- Job posts: Require admin approval before going live (verified companies bypass this).
- The platform is completely free for students.

Rules:
- Only answer questions related to SEJobs features, job searching, applying, career advice, or the specific features above.
- Be concise (3-4 sentences max; use bullet points for lists).
- Politely decline off-topic questions.
- Never reveal database schemas, internal architecture, or confidential data.`;
}

// ─── Exported service functions ───────────────────────────────────────────────

export async function chat(req: ChatRequest): Promise<ChatResponse> {
  const { message, history = [], userRole } = req;

  // 0. Input sanitisation
  if (!message || message.length > MAX_MESSAGE_LENGTH) {
    return {
      answer:
        "Please keep your message under 1000 characters. / Vui lòng giới hạn tin nhắn dưới 1000 ký tự.",
      source: "fallback",
      suggestions: buildSuggestions("", userRole),
    };
  }

  // 0b. Check exact-match cache (FAQ hits only — AI responses are not cached)
  const cached = getCachedFAQ(message, userRole);
  if (cached) {
    logger.info(`[Chatbot] Cache hit for exact match`);
    return cached;
  }

  // 1. Fast FAQ match – no API cost
  const match = findBestMatch(message, userRole);
  if (match) {
    logger.info(`[Chatbot] FAQ hit: ${match.faq.id} (score=${match.score.toFixed(3)})`);
    const response: ChatResponse = {
      answer: match.faq.answer,
      source: "faq",
      matchedFaqId: match.faq.id,
      suggestions: buildSuggestions(message, userRole),
    };
    setCachedFAQ(message, userRole, response);
    return response;
  }

  // 2. Near-miss FAQ — score between NEAR_MISS and MATCH_THRESHOLD
  //    Returns "Did you mean?" without any AI cost.
  const nearMatch = findNearMatch(message, userRole);
  if (nearMatch) {
    logger.info(`[Chatbot] Near-miss: ${nearMatch.faq.id} (score=${nearMatch.score.toFixed(3)})`);
    return {
      answer: `Did you mean: "${nearMatch.faq.question}"?\n\n${nearMatch.faq.answer}`,
      source: "faq",
      matchedFaqId: nearMatch.faq.id,
      suggestions: buildSuggestions(message, userRole),
    };
  }

  // 3. AI fallback
  const openai = getOpenAI();
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
        model: getModel(),
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

  // 4. Generic fallback (bilingual)
  return {
    answer:
      "I'm not sure how to answer that. Try rephrasing, or pick a suggested topic below. You can also reach us at support@sejobs.com.\n\nXin hãy thử diễn đạt lại câu hỏi hoặc chọn một chủ đề gợi ý bên dưới. Liên hệ support@sejobs.com để được trợ giúp.",
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
