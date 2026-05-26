import { z } from "zod";
import { getModel, getOpenAI } from "@/utils/openai";
import { simpleCache } from "@/utils/cache";
import logger from "@/utils/logger";
import studentService from "./student.service";
import jobsService from "./jobs.service";
import experienceService from "./experiences.service";
import educationService from "./educations.service";
import RecommendationService from "./recommendation.service";
import { NotFoundError } from "@/utils/errors";
import { MessageUtil } from "@/utils/MessageUtil";

const ADVICE_CACHE_TTL = 30 * 60 * 1000;
const MAX_JOBS = 3;
const MAX_DESC_CHARS = 100;

const matchedJobSchema = z.object({ job_id: z.number(), reason: z.string() });

const careerAdviceSchema = z.object({
  profile_analysis: z.string().min(1).default(""),
  skill_gaps: z.array(z.string()).default([]),
  recommended_career_paths: z.array(z.string()).default([]),
  actionable_steps: z.array(z.string()).default([]),
  top_matched_jobs: z.array(matchedJobSchema).default([]),
});

type CareerAdvice = z.infer<typeof careerAdviceSchema>;

function hashCode(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return (hash >>> 0).toString(36);
}

function cacheKey(userId: number, student: any, experiences: any[], educations: any[]): string {
  const payload = JSON.stringify({
    s: (student.skills || []).slice().sort(),
    p: (student.desired_positions || []).slice().sort(),
    loc: student.location,
    exp: experiences.map((e: any) => `${e.position}|${e.company}`).sort(),
    edu: educations.map((e: any) => `${e.school}|${e.major}|${e.degree}`).sort(),
  });
  return `career_advice:${userId}:${hashCode(payload)}`;
}

function computeSkillGaps(
  studentSkills: string[],
  recommendedJobs: any[],
): { gaps: string[]; matched: string[] } {
  const studentLower = new Set(studentSkills.map((s) => s.toLowerCase().trim()));
  const skillCount = new Map<string, number>();

  for (const job of recommendedJobs) {
    const names = (job.skills || [])
      .map((s: any) => s.name?.toLowerCase().trim())
      .filter(Boolean);
    for (const name of names) {
      skillCount.set(name, (skillCount.get(name) || 0) + 1);
    }
  }

  const sorted = Array.from(skillCount.entries()).sort((a, b) => b[1] - a[1]);
  const matched: string[] = [];
  const gaps: string[] = [];

  for (const [skill] of sorted) {
    if (studentLower.has(skill)) matched.push(skill);
    else gaps.push(skill);
  }

  return { gaps: gaps.slice(0, 6), matched: matched.slice(0, 6) };
}

function compactJob(job: any, i: number): string {
  const desc = (job.description || "")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, MAX_DESC_CHARS);
  const skills = (job.skills || []).map((s: any) => s.name).join(", ");
  return `[${i}] ${job.title} @ ${job.company?.name || "?"} | Skills: ${skills || "—"} | ${desc}`;
}

function buildPrompt(input: {
  skills: string;
  desired: string;
  location: string;
  experiences: string;
  educations: string;
  gaps: string[];
  matched: string[];
  jobs: any[];
}): { system: string; user: string } {
  const system = `You are a concise career advisor. Analyze the student profile and job market to generate personalized advice.
Output ONLY valid JSON with no markdown:
{
  "profile_analysis": "2-3 sentence summary of strengths and weaknesses",
  "skill_gaps": ["2-4 missing high-demand skills"],
  "recommended_career_paths": ["1-3 role titles"],
  "actionable_steps": ["2-4 concrete actions"],
  "top_matched_jobs": [{"job_id": number, "reason": "one sentence why this job fits"}]
}`;

  const user = [
    `Student: Skills=[${input.skills}] Desired=[${input.desired}] Location=${input.location}`,
    `Experience: ${input.experiences}`,
    `Education: ${input.educations}`,
    `---`,
    `Already-matched skills: ${input.matched.join(", ") || "None"}`,
    `Demanded skills student lacks: ${input.gaps.join(", ") || "None identified"}`,
    `---`,
    `Top matching jobs:\n${input.jobs.map((j, i) => compactJob(j, i + 1)).join("\n") || "No matching jobs available."}`,
  ].join("\n");

  return { system, user };
}

async function callLLM(system: string, user: string): Promise<CareerAdvice | null> {
  const openai = getOpenAI();
  if (!openai) return null;

  const primaryModel = process.env.CAREER_ADVICE_MODEL || getModel();
  const fallbackModel = getModel();
  const attempts: Array<{ model: string; delay: number }> = [
    { model: primaryModel, delay: 0 },
    { model: fallbackModel, delay: 500 },
    { model: primaryModel, delay: 1500 },
  ];

  for (const { model, delay } of attempts) {
    if (delay > 0) await new Promise((r) => setTimeout(r, delay));
    try {
      const response = await openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.4,
        max_tokens: 1000,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) continue;

      const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
      return careerAdviceSchema.parse(JSON.parse(cleaned));
    } catch (err) {
      logger.warn(`[CareerAdvice] Attempt (${model}) failed: ${(err as Error).message}`);
    }
  }

  return null;
}

export class CareerAdviceService {
  private recommendationService: RecommendationService;

  constructor() {
    this.recommendationService = new RecommendationService();
  }

  async generateAdvice(userId: number): Promise<CareerAdvice> {
    const student = await studentService.findOne({ user_id: userId });
    if (!student) {
      throw new NotFoundError({ message: MessageUtil.get("STUDENT_PROFILE_NOT_FOUND") });
    }

    const [experiencesRes, educationsRes] = await Promise.all([
      experienceService.findAll({ student_id: student.id }),
      educationService.findByStudentId(student.id, { page: 1, limit: 50 }),
    ]);

    const experiences = experiencesRes.data || [];
    const educations = educationsRes.data || [];

    const key = cacheKey(userId, student, experiences, educations);
    const cached = simpleCache.get<CareerAdvice>(key);
    if (cached) {
      logger.info(`[CareerAdvice] Cache hit for user ${userId}`);
      return cached;
    }

    let recommendedJobs: any[] = [];
    try {
      const { data } = await jobsService.userRecommendationJobs({ userId, page: 1, limit: MAX_JOBS });
      recommendedJobs = data || [];
    } catch {
      recommendedJobs = await this.recommendationService.recommendJobsForStudent(userId, MAX_JOBS);
    }

    const studentSkills = (student.skills || []).map((s: string) => s.toLowerCase().trim());
    const { gaps, matched } = computeSkillGaps(studentSkills, recommendedJobs);

    const expStr = experiences
      .map((e: any) => `${e.position} at ${e.company} (${e.start_date || "?"} - ${e.end_date || "Present"})`)
      .join("; ") || "None";

    const eduStr = educations
      .map((e: any) => `${e.degree || "?"} in ${e.major || "?"} at ${e.school}`)
      .join("; ") || "None";

    const { system, user } = buildPrompt({
      skills: (student.skills || []).join(", ") || "None listed",
      desired: (student.desired_positions || []).join(", ") || "Not specified",
      location: student.location || "Unknown",
      experiences: expStr,
      educations: eduStr,
      gaps,
      matched,
      jobs: recommendedJobs.slice(0, MAX_JOBS),
    });

    let advice = await callLLM(system, user);

    if (!advice) {
      advice = {
        profile_analysis: "AI advice is temporarily unavailable. Here's what we know from your profile data.",
        skill_gaps: gaps.slice(0, 4),
        recommended_career_paths:
          recommendedJobs.length > 0
            ? [...new Set(recommendedJobs.map((j: any) => j.title))].slice(0, 3)
            : [],
        actionable_steps: [
          "Complete your profile with detailed skills and experience.",
          "Browse job listings to understand current market requirements.",
          "Consider adding projects to demonstrate your skills.",
        ],
        top_matched_jobs: recommendedJobs.slice(0, 3).map((j: any) => ({
          job_id: j.id,
          reason: `Matches your ${(student.desired_positions || [])[0] || "profile"} skillset.`,
        })),
      };
    }

    const validIds = new Set(recommendedJobs.map((j: any) => j.id));
    advice.top_matched_jobs = (advice.top_matched_jobs || []).filter((mj) =>
      validIds.has(mj.job_id),
    );

    simpleCache.set(key, advice, ADVICE_CACHE_TTL);
    return advice;
  }
}

export default new CareerAdviceService();
