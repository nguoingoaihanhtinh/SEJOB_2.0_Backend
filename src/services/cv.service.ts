import { z } from "zod";
import { CreateCvDTO, UpdateCvDTO } from "@/dtos/student/Cv.dto";
import CVRepository from "@/repositories/cv.repository";

import { NotFoundError, BadRequestError } from "@/utils/errors";
import { MessageUtil } from "@/utils/MessageUtil";
import { downloadAndParseCv } from "@/utils/cv-parser";
import { getOpenAI, getModel } from "@/utils/openai";
import { recoverTruncatedJson } from "@/utils/json-recovery";
import { simpleCache } from "@/utils/cache";
import logger from "@/utils/logger";
import experiencesRepository from "@/repositories/experiences.repository";
import projectsRepository from "@/repositories/projects.repository";
import certificationsRepository from "@/repositories/certifications.repository";
import educationRepository from "@/repositories/educations.repository";

const CV_EXTRACT_CACHE_TTL = 24 * 60 * 60 * 1000;
const MAX_INPUT_CHARS = 12000;
const MIN_PDF_LENGTH = 20;
const RETRY_DELAYS = [1000, 2000];

const nullableDate = z.string().nullable().default(null);

const experienceSchema = z.object({
  company: z.string(),
  position: z.string(),
  location: z.string().nullable().default(null),
  start_date: nullableDate,
  end_date: nullableDate,
  is_current: z.boolean().default(false),
  description: z.string().nullable().default(null),
});

const educationSchema = z.object({
  school: z.string(),
  degree: z.string().nullable().default(null),
  major: z.string().nullable().default(null),
  start_date: nullableDate,
  end_date: nullableDate,
});

const projectSchema = z.object({
  projectName: z.string(),
  description: z.string().nullable().default(null),
  startYear: z.number().nullable().default(null),
  startMonth: z.number().nullable().default(null),
  endYear: z.number().nullable().default(null),
  endMonth: z.number().nullable().default(null),
  isCurrentlyWorking: z.boolean().default(false),
  websiteLink: z.string().nullable().default(null),
});

const certificationSchema = z.object({
  name: z.string(),
  organization: z.string().nullable().default(null),
  issue_date: nullableDate,
  certification_url: z.string().nullable().default(null),
});

const extractedCvSchema = z.object({
  phone_number: z.string().nullable().default(null),
  gender: z.enum(["Male", "Female", "Other"]).nullable().default(null),
  location: z.string().nullable().default(null),
  date_of_birth: nullableDate,
  about: z.string().nullable().default(null),
  desired_positions: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  experiences: z.array(experienceSchema).default([]),
  educations: z.array(educationSchema).default([]),
  projects: z.array(projectSchema).default([]),
  certifications: z.array(certificationSchema).default([]),
  advises: z.array(z.string()).default([]),
});

type ExtractedCVData = z.infer<typeof extractedCvSchema>;

function smartTruncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const truncated = text.substring(0, maxChars);
  const lastBreak = truncated.lastIndexOf("\n\n");
  if (lastBreak > maxChars * 0.75) return text.substring(0, lastBreak);
  const lastSpace = truncated.lastIndexOf(" ", Math.min(truncated.length, maxChars));
  if (lastSpace > maxChars * 0.8) return text.substring(0, lastSpace);
  return truncated;
}

function normalizePhone(phone: string | null): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, "").trim();
  return cleaned || null;
}

function dedupStrings(arr: string[]): string[] {
  const seen = new Map<string, string>();
  for (const item of arr) {
    const key = item.toLowerCase().trim();
    if (!seen.has(key)) seen.set(key, item.trim());
  }
  return Array.from(seen.values()).filter(Boolean);
}

function normalizeData(data: ExtractedCVData): ExtractedCVData {
  return {
    ...data,
    phone_number: normalizePhone(data.phone_number),
    skills: dedupStrings(data.skills),
    desired_positions: dedupStrings(data.desired_positions),
  };
}

function computeConfidence(data: ExtractedCVData): number {
  let score = 0;
  let total = 6;
  if (data.phone_number) score++;
  if (data.location) score++;
  if (data.about && data.about.length > 20) score++;
  if (data.skills.length > 0) score++;
  if (data.experiences.length > 0) score++;
  if (data.educations.length > 0) score++;
  return Math.round((score / total) * 100);
}

function buildExtractionPrompt(text: string): string {
  return `
Extract structured data from this CV. Return valid JSON only, no markdown.
Schema:
{
  "phone_number": string|null, "gender": "Male"|"Female"|"Other"|null,
  "location": string|null, "date_of_birth": "YYYY-MM-DD"|null,
  "about": string|null,
  "desired_positions": string[],
  "skills": string[],
  "experiences": [{"company":string,"position":string,"location":string|null,"start_date":"YYYY-MM-DD"|null,"end_date":"YYYY-MM-DD"|null,"is_current":bool,"description":string|null}],
  "educations": [{"school":string,"degree":string|null,"major":string|null,"start_date":"YYYY-MM-DD"|null,"end_date":"YYYY-MM-DD"|null}],
  "projects": [{"projectName":string,"description":string|null,"startYear":number|null,"startMonth":number|null,"endYear":number|null,"endMonth":number|null,"isCurrentlyWorking":bool,"websiteLink":string|null}],
  "certifications": [{"name":string,"organization":string|null,"issue_date":"YYYY-MM-DD"|null,"certification_url":string|null}],
  "advises": string[]
}
Rules:
- null for missing scalars, [] for missing arrays, "" for missing strings
- Dates: YYYY-MM-DD. Year-only -> YYYY-01-01. Year+month -> YYYY-MM-01
- is_current=true ONLY if "Present"/"Current" mentioned
- Extract ALL skills (technical, tools, languages) and ALL projects
- Phone number as written; gender only if explicit
- Give advises about what to improve in the CV based on the extracted data

CV:
${text}
`.trim();
}

async function callAI(prompt: string, model: string): Promise<string> {
  const openai = getOpenAI();
  if (!openai) throw new Error("OpenAI is not configured.");

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: "You are a professional CV parser. Return valid JSON matching the requested schema." },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
    max_tokens: 2000,
  });

  const rawContent = response.choices[0]?.message?.content || "{}";
  const finishReason = response.choices[0]?.finish_reason;

  logger.info(`[CV Extract] Model: ${model}, Finish: ${finishReason}, Length: ${rawContent.length}`);
  if (finishReason && finishReason !== "stop") {
    logger.warn(`[CV Extract] Response may be truncated (finish: ${finishReason})`);
  }

  return rawContent;
}

async function callWithRetry(prompt: string, primary: string, fallback: string): Promise<string> {
  const models = [primary, fallback, primary] as const;
  for (let i = 0; i < models.length; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, RETRY_DELAYS[i - 1]));
    try {
      const content = await callAI(prompt, models[i] as string);
      const parsed = recoverTruncatedJson(content);
      if (Object.keys(parsed).length > 0) return content;
      logger.warn(`[CV Extract] Attempt ${i + 1} (${models[i] as string}) returned empty`);
    } catch (err: any) {
      logger.warn(`[CV Extract] Attempt ${i + 1} (${models[i] as string}) error: ${err.message}`);
    }
  }
  throw new Error("Failed to extract CV data after multiple attempts.");
}

export const CVService = {
  async findAll(options: { page: number; limit: number }) {
    return CVRepository.findAll(options);
  },

  async findByStudentId(studentId: number, options: { page: number; limit: number }) {
    return CVRepository.findByStudentId(studentId, options);
  },

  async getOne(id: number) {
    const rec = await CVRepository.findOne(id);
    if (!rec) throw new NotFoundError({ message: MessageUtil.get("CV_NOT_FOUND") });
    return rec;
  },

  async create(payload: CreateCvDTO) {
    if (!payload.studentid) throw new BadRequestError({ message: MessageUtil.get("STUDENTID_IS_REQUIRED") });
    if (!payload.title) throw new BadRequestError({ message: MessageUtil.get("TITLE_IS_REQUIRED") });
    if (!payload.filepath) throw new BadRequestError({ message: MessageUtil.get("FILEPATH_IS_REQUIRED") });
    return CVRepository.insert(payload as any);
  },

  async update(id: number, payload: UpdateCvDTO) {
    await this.getOne(id);
    return CVRepository.update(id, payload as any);
  },

  async remove(id: number) {
    await this.getOne(id);
    return CVRepository.remove(id);
  },

  async extractData(fileUrl: string, studentId: number) {
    const deleteOldData = Promise.all([
      experiencesRepository.bulkDelete(studentId),
      projectsRepository.bulkDelete(studentId),
      certificationsRepository.bulkDelete(studentId),
      educationRepository.bulkDelete(studentId),
    ])

    const cacheKey = `cv_extract:${fileUrl}`;
    const cached = simpleCache.get<ExtractedCVData>(cacheKey);
    if (cached) {
      logger.info(`[CV Extract] Cache hit for ${fileUrl}`);
      await deleteOldData;

      return cached;
    }

    const pdfText = await downloadAndParseCv(fileUrl);
    if (!pdfText || pdfText.trim().length < MIN_PDF_LENGTH) {
      throw new Error("Could not extract enough text from the CV. The PDF may be image-based or corrupted.");
    }

    logger.info(`[CV Extract] PDF length: ${pdfText.length} chars`);

    const isOpenRouter = !!(process.env.OPENROUTER_API_KEY || process.env.LLM_API_KEY);
    const primaryModel = process.env.CV_EXTRACTION_MODEL
      || (isOpenRouter ? "google/gemini-2.0-flash-001" : "gpt-4o-mini");
    const fallbackModel = getModel();

    const text = smartTruncate(pdfText, MAX_INPUT_CHARS);
    const prompt = buildExtractionPrompt(text);
    const rawContent = await callWithRetry(prompt, primaryModel, fallbackModel);

    let parsed: any;
    try {
      parsed = extractedCvSchema.parse(recoverTruncatedJson(rawContent));
    } catch {
      logger.warn("[CV Extract] Zod validation failed, using raw recovery");
      parsed = recoverTruncatedJson(rawContent);
    }

    const normalized = normalizeData(parsed);
    const confidence = computeConfidence(normalized);
    const result = { ...normalized, _confidence: confidence };

    simpleCache.set(cacheKey, result, CV_EXTRACT_CACHE_TTL);

    logger.info(`[CV Extract] Confidence: ${confidence}%, Skills: ${result.skills.length}, Exp: ${result.experiences.length}, Edu: ${result.educations.length}, Projects: ${result.projects.length}`);

    await deleteOldData;

    return result;
  },
};
