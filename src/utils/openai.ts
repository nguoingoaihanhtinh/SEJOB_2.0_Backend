/**
 * Shared OpenAI/OpenRouter client factory.
 *
 * Priority: OPENROUTER_API_KEY > LLM_API_KEY > OPENAI_API_KEY
 *
 * When OPENROUTER_API_KEY or LLM_API_KEY is present the client is pointed at
 * the OpenRouter base URL and uses qwen/qwen-2.5-coder-32b-instruct by default.
 * When only OPENAI_API_KEY is present it uses the standard OpenAI endpoint with
 * gpt-4o-mini.
 */
import OpenAI from "openai";

export const OPENROUTER_MODEL = "qwen/qwen-2.5-coder-32b-instruct";
export const OPENAI_MODEL = "gpt-4o-mini";

/** Returns the active model name based on which key is configured. */
export function getModel(): string {
  return (process.env.OPENROUTER_API_KEY || process.env.LLM_API_KEY)
    ? OPENROUTER_MODEL
    : OPENAI_MODEL;
}

/**
 * Returns a configured OpenAI client, or null if no API key is set.
 * Safe to call multiple times — creates a new instance each call (lightweight).
 */
export function getOpenAI(): OpenAI | null {
  const apiKey =
    process.env.OPENROUTER_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.LLM_API_KEY;

  if (!apiKey) return null;

  const isOpenRouter = !!(
    process.env.OPENROUTER_API_KEY || process.env.LLM_API_KEY
  );

  return new OpenAI({
    baseURL: isOpenRouter ? "https://openrouter.ai/api/v1" : undefined,
    apiKey,
    defaultHeaders: process.env.OPENROUTER_API_KEY
      ? {
          "HTTP-Referer":
            process.env.OPENROUTER_SITE_URL || "http://localhost:3000",
          "X-Title":
            process.env.OPENROUTER_SITE_NAME || "SEJob-Recruiter-AI",
        }
      : undefined,
  });
}
