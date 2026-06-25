import { z } from "zod";
import { getOpenAI, getModel } from "@/utils/openai";
import jobRepository from "@/repositories/job.repository";
import companyRepository from "@/repositories/company.repository";
import studentRepository from "@/repositories/student.repository";
import applicationRepository from "@/repositories/application.repository";
import { supabase } from "@/config/supabase";
import skillMappingService from "@/services/skill_mapping.service";
import { recoverTruncatedJson } from "@/utils/json-recovery";
import { downloadAndParseCv } from "@/utils/cv-parser";
import { simpleCache } from "@/utils/cache";
import logger from "@/utils/logger";
import {
  ScoringWeights,
  getDynamicWeights,
  verifyWeights,
  DEFAULT_WEIGHTS,
  buildWeightsText,
  DEFAULT_SCORING_PROMPT,
  scoringWeightsSchema,
  convertCompanyScoringConfig,
} from "@/config/scoring-weights";

const clamp = (value: number, max: number, min: number = 0): number => Math.min(Math.max(value, min), max);

/** Escape regex special characters in a string */
function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const C2_CACHE_TTL = 24 * 60 * 60 * 1000;
const EXTRACTION_CACHE_TTL = 30 * 60 * 1000;
const MIN_SKILLS_FOR_SKIP = 3;

const AI_RETRY_DELAY = 1000;
const AI_MAX_RETRIES = 1;

const SKILL_MATCH_PREFIXES = [
  "experience with ",
  "experience in ",
  "knowledge of ",
  "familiarity with ",
  "understanding of ",
  "proficiency in ",
  "skills in ",
  "ability to use ",
  "working knowledge of ",
  "hands-on experience with ",
  "basic knowledge of ",
  "strong knowledge of ",
];

function hashCode(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return (hash >>> 0).toString(36);
}

const extractionSchema = z.object({
  skills: z.array(z.string()).default([]),
  extracted_major: z.string().nullable().default(null),
  experience_level: z.string().nullable().default(null),
  has_it_cert: z.boolean().default(false),
  projects: z
    .array(
      z.object({
        name: z.string().default(""),
        description: z.string().default(""),
        technologies: z.array(z.string()).default([]),
      }),
    )
    .default([]),
  experiences: z
    .array(
      z.object({
        company: z.string().default(""),
        position: z.string().default(""),
        description: z.string().default(""),
        is_current: z.boolean().default(false),
      }),
    )
    .default([]),
});

const aiScoringResultSchema = z.object({
  A1_REQUIRED: z.number().min(0).default(0),
  A1_REQUIRED_reason: z.string().default(""),
  A2_NICE: z.number().min(0).default(0),
  A2_NICE_reason: z.string().default(""),
  A3_SKILL_DEPTH: z.number().min(0).default(0),
  A3_SKILL_DEPTH_reason: z.string().default(""),
  B1_MAJOR: z.number().min(0).default(0),
  B1_MAJOR_reason: z.string().default(""),
  B2_COURSES: z.number().min(0).default(0),
  B2_COURSES_reason: z.string().default(""),
  C1_PROJECT_COUNT: z.number().min(0).default(0),
  C1_PROJECT_COUNT_reason: z.string().default(""),
  C2_PROJECT_RELEVANCE: z.number().min(0).default(0),
  C2_PROJECT_RELEVANCE_reason: z.string().default(""),
  C3_PROJECT_COMPLEXITY: z.number().min(0).default(0),
  C3_PROJECT_COMPLEXITY_reason: z.string().default(""),
  D_CERTIFICATIONS: z.number().min(0).default(0),
  D_CERTIFICATIONS_reason: z.string().default(""),
  E_EXPERIENCE: z.number().min(0).default(0),
  E_EXPERIENCE_reason: z.string().default(""),
  reasoning: z.string().default(""),
}).passthrough();

const SCORING_AI_CACHE_TTL = 24 * 60 * 60 * 1000;

const relevanceProjectSchema = z.object({
  project_index: z.number(),
  relevance_score: z.number(),
  reason: z.string().default(""),
});

const relevanceSchema = z.object({
  projects: z.array(relevanceProjectSchema).default([]),
});

// ============================================================================
// CV SCORING SERVICE
// ============================================================================

export class CvScoringService {
  /**
   * A1/A2 — Generic skill matching used for both Required Skills and Nice-to-haves.
   * Uses 3 strategies in order:
   * 1. Direct word-boundary regex
   * 2. Bidirectional skill↔requirement matching
   * 3. Prefix-stripped matching ("Experience with X" → "X")
   */
  private matchSkills(
    candidateSkillNames: string[],
    requirements: string[],
    maxScore: number,
  ): { score: number; matched: string[]; missing: string[] } {
    const candidateSkillStr = candidateSkillNames.join(" ").toLowerCase();
    const candidateSkillsLower = candidateSkillNames.map((s) => s.toLowerCase().trim());
    let matchedCount = 0;
    const matched: string[] = [];
    const missing: string[] = [];

    for (const req of requirements) {
      const reqLower = req.toLowerCase().trim();
      const escapedReq = escapeRegex(reqLower);
      const reqRe = new RegExp(`\\b${escapedReq}\\b`, "i");

      // Strategy 1: Direct word-boundary match
      let hasMatch = reqRe.test(candidateSkillStr);

      // Strategy 2: Bidirectional matching
      if (!hasMatch) {
        hasMatch = candidateSkillNames.some((skill) => {
          const skillLower = skill.toLowerCase();
          const escapedSkill = escapeRegex(skillLower);

          if (reqRe.test(skillLower)) return true;

          if (reqLower.includes(" ")) {
            return new RegExp(`\\b${escapedSkill}\\b`, "i").test(reqLower) || reqLower.includes(skillLower);
          }
          return false;
        });
      }

      // Strategy 3: Strip sentence prefixes and match core name
      if (!hasMatch) {
        let strippedReq = reqLower
          .replace(/^at least \d+\+?\s*(years?|yrs?)\s*(of\s*)?(experience\s*)?(with\s*|in\s*)?/i, "")
          .replace(/[.,;:!?]+$/, "")
          .trim();

        for (const prefix of SKILL_MATCH_PREFIXES) {
          if (strippedReq.startsWith(prefix)) {
            strippedReq = strippedReq.slice(prefix.length).trim();
            break;
          }
        }

        if (strippedReq.length > 0) {
          hasMatch = candidateSkillsLower.some(
            (s) => s === strippedReq || strippedReq.includes(s) || s.includes(strippedReq),
          );
        }
      }

      if (hasMatch) {
        matchedCount++;
        matched.push(req);
      } else {
        missing.push(req);
      }
    }

    const score = requirements.length > 0 ? (matchedCount / requirements.length) * maxScore : maxScore;
    return { score: Math.round(score), matched, missing };
  }

  /**
   * B1. Major/Field Match — 10đ (default) or 15đ (0-project fallback)
   * Tiered scoring:
   * - IT majors (CS, SE, IT, IS, Cybersecurity) → 100%
   * - Related majors (Math-CS, Electronics, Telecom) → 60%
   * - Unrelated → 0%
   */
  private scoreMajor(educations: any[], maxScore: number): { score: number; reason: string } {
    const itMajors = [
      // Vietnamese
      "công nghệ thông tin",
      "khoa học máy tính",
      "kỹ thuật phần mềm",
      "công nghệ phần mềm",
      "hệ thống thông tin",
      "hệ thống thông tin quản lý",
      "an toàn thông tin",
      "mạng máy tính",
      "máy tính",
      "truyền thông đa phương tiện",
      "công nghệ đa phương tiện",
      "trí tuệ nhân tạo",
      "khoa học dữ liệu",
      "phân tích dữ liệu",
      "kỹ thuật máy tính",
      "khoa học dữ liệu và trí tuệ nhân tạo",
      "thương mại điện tử",
      "kỹ thuật dữ liệu",
      // English
      "computer science",
      "software engineering",
      "information technology",
      "information systems",
      "management information systems",
      "cybersecurity",
      "data science",
      "data analytics",
      "artificial intelligence",
      "computer engineering",
      "web development",
      "mobile development",
      "cloud computing",
      "ui/ux",
      "software engineer",
      "it engineer",
      "cs engineer",
      "se engineer",
      "mis",
      "ict",
    ];

    const relatedMajors = [
      "toán tin",
      "toán ứng dụng",
      "điện tử",
      "viễn thông",
      "kỹ thuật điện",
      "kỹ thuật điều khiển",
      "tự động hóa",
      "cơ điện tử",
      "vật lý tin học",
      "applied mathematics",
      "electronics",
      "telecommunications",
      "electrical engineering",
      "mechatronics",
      "automation",
      "physics",
      "business information systems",
      "digital marketing",
      "management information systems",
    ];

    // UIT-related school names that indicate an IT university background
    const itSchools = [
      "university of information technology",
      "đại học công nghệ thông tin",
      "uit",
      "trường đại học công nghệ thông tin",
      "vnuhcm",
    ];

    for (const edu of educations) {
      const major = (edu.major || "").toLowerCase().trim();
      const degree = (edu.degree || "").toLowerCase().trim();
      const school = (edu.school || "").toLowerCase().trim();
      const combined = `${degree} ${major}`.trim();
      const isItSchool = itSchools.some((kw) => school.includes(kw));

      if (!combined && !isItSchool) continue;
      if (!combined) {
        return {
          score: Math.round(maxScore * 0.6),
          reason: `UIT school, major unspecified: "${edu.school || "School"}"`,
        };
      }

      if (itMajors.some((kw) => combined.includes(kw))) {
        return {
          score: maxScore,
          reason: `IT major: "${edu.degree || "Degree"} in ${edu.major || "Major"}"`,
        };
      }

      if (relatedMajors.some((kw) => combined.includes(kw))) {
        return {
          score: Math.round(maxScore * 0.6),
          reason: `Related field: "${edu.degree || "Degree"} in ${edu.major || "Major"}"`,
        };
      }

      if (isItSchool) {
        return {
          score: Math.round(maxScore * 0.6),
          reason: `IT school (${edu.school}), major may not be standard IT`,
        };
      }
    }

    return { score: 0, reason: "No relevant IT education found" };
  }

  /**
   * C1. Project Count — 5đ
   * Simple count: 3+ → 5đ, 2 → 3đ, 1 → 1đ, 0 → 0đ
   */
  private scoreProjectCount(projectCount: number, maxScore: number): number {
    if (projectCount >= 3) return maxScore;
    if (projectCount === 2) return 3;
    if (projectCount === 1) return 1;
    return 0;
  }

  /**
   * E. Experience — 5đ (default) or 10đ (0-project)
   *
   * DESIGN DECISION: We use bestScore (not sum) because:
   * 1. Max points is low (5-10đ) — summing would unfairly inflate scores
   * 2. One strong internship > multiple weak experiences
   * 3. Encourages quality over quantity
   *
   * Scoring by type:
   * - Internship/Full-time IT → 100%
   * - Part-time IT → 80%
   * - Freelance IT → 60%
   * - Non-IT → 0% (no penalty for no experience)
   */
  private scoreExperience(experiences: any[], maxScore: number): { score: number; details: string } {
    if (!experiences || experiences.length === 0) {
      return { score: 0, details: "No work experience" };
    }

    const itKeywords = [
      "developer",
      "engineer",
      "programmer",
      "software",
      "frontend",
      "backend",
      "fullstack",
      "full-stack",
      "devops",
      "data",
      "ai",
      "ml",
      "test",
      "qa",
      "phát triển phần mềm",
      "lập trình",
      "công nghệ thông tin",
      "it",
    ];

    const internshipKeywords = ["intern", "internship", "thực tập", "trainee", "junior"];
    const fullTimeKeywords = ["full-time", "toàn thời gian", "chính thức", "nhân viên chính thức"];
    const partTimeKeywords = ["part-time", "bán thời gian"];
    const freelanceKeywords = ["freelance", "contract", "tự do", "project-based", "contractor"];

    let bestScore = 0;
    const experienceDetails: string[] = [];

    for (const exp of experiences) {
      const expText = `${exp.position} ${exp.company} ${exp.description || ""}`.toLowerCase();

      const isITRelated = itKeywords.some((kw) => expText.includes(kw.toLowerCase()));
      if (!isITRelated) {
        experienceDetails.push(`${exp.position} at ${exp.company}: not IT-related (0)`);
        continue;
      }

      let typeScore = 0;
      let expType = "unknown";

      if (internshipKeywords.some((kw) => expText.includes(kw))) {
        typeScore = maxScore;
        expType = "internship";
      } else if (fullTimeKeywords.some((kw) => expText.includes(kw))) {
        typeScore = maxScore;
        expType = "full-time";
      } else if (partTimeKeywords.some((kw) => expText.includes(kw))) {
        typeScore = Math.round(maxScore * 0.8);
        expType = "part-time";
      } else if (freelanceKeywords.some((kw) => expText.includes(kw))) {
        typeScore = Math.round(maxScore * 0.6);
        expType = "freelance";
      } else {
        typeScore = Math.round(maxScore * 0.8);
        expType = "IT (unspecified type)";
      }

      bestScore = Math.max(bestScore, typeScore);
      experienceDetails.push(`${exp.position} at ${exp.company}: ${expType} (${typeScore})`);
    }

    return { score: bestScore, details: experienceDetails.join("; ") || "No IT-related experience" };
  }

  /**
   * AI-based scoring using configurable weights + prompt template per job/company.
   */
  private async scoreWithAI(
    job: any,
    company: any,
    candidateSkillNames: string[],
    educations: any[],
    projects: any[],
    experiences: any[],
    certifications: any[],
    weights: ScoringWeights,
  ): Promise<{
    scores: z.infer<typeof aiScoringResultSchema>;
    analysis: string;
    details: Record<string, string>;
  } | null> {
    const openai = getOpenAI();
    if (!openai) return null;

    const template = company?.scoring_prompt_template || DEFAULT_SCORING_PROMPT;
    const weightsText = buildWeightsText(weights);

    let prompt = template;
    const replacements: Record<string, string> = {
      jobTitle: job.title || "Untitled",
      requirements: (job.requirement || []).join("\n"),
      niceToHaves: (job.nice_to_haves || []).join("\n"),
      weightsText,
      A1_REQUIRED: String(weights.A1_REQUIRED),
      A2_NICE: String(weights.A2_NICE),
      A3_SKILL_DEPTH: String(weights.A3_SKILL_DEPTH),
      B1_MAJOR: String(weights.B1_MAJOR),
      B2_COURSES: String(weights.B2_COURSES),
      C1_PROJECT_COUNT: String(weights.C1_PROJECT_COUNT),
      C2_PROJECT_RELEVANCE: String(weights.C2_PROJECT_RELEVANCE),
      C3_PROJECT_COMPLEXITY: String(weights.C3_PROJECT_COMPLEXITY),
      D_CERTIFICATIONS: String(weights.D_CERTIFICATIONS),
      E_EXPERIENCE: String(weights.E_EXPERIENCE),
      educations:
        educations
          .map((e) => `${e.major} ${e.degree} ${e.school}`)
          .filter(Boolean)
          .join("; ") || "None",
      skills: candidateSkillNames.join(", ") || "None",
      projects:
        projects.map((p) => `${p.name}: ${p.description} [${(p.technologies || []).join(", ")}]`).join("\n") || "None",
      experiences: experiences.map((e) => `${e.position} at ${e.company}: ${e.description || ""}`).join("\n") || "None",
      certifications: certifications.map((c) => c.name).join(", ") || "None",
      customSectionsOutput: Object.entries(weights)
        .filter(([k]) => k.startsWith("CUSTOM_"))
        .map(([k, v]) => `  "${k}": 0-${v}, "${k}_reason": "why this score",`)
        .join("\n"),
    };

    for (const [key, val] of Object.entries(replacements)) {
      prompt = prompt.replaceAll(`{{${key}}}`, val);
    }

    let lastError: unknown;
    for (let attempt = 0; attempt <= AI_MAX_RETRIES; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, AI_RETRY_DELAY));
      try {
        const response = await openai.chat.completions.create({
          model: getModel(),
          messages: [
            { role: "system", content: "You are a precise CV scoring engine. Return valid JSON only." },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0,
          max_tokens: 2000,
        });

        const raw = response.choices[0]?.message?.content;
        if (!raw) { lastError = new Error("Empty AI response"); continue; }

        const parsed = aiScoringResultSchema.parse(recoverTruncatedJson(raw));

      const clamped = { ...parsed };
      for (const key of Object.keys(weights) as (keyof ScoringWeights)[]) {
        (clamped as any)[key] = clamp((clamped as any)[key] || 0, (weights as any)[key]);
      }

      const analysis = parsed.reasoning || "AI scored based on configured weights.";

      const details: Record<string, string> = {};
      for (const key of Object.keys(weights) as (keyof ScoringWeights)[]) {
        const reasonKey = `${key}_reason` as string;
        details[key] = (parsed as any)[reasonKey] || "";
      }

      return { scores: clamped, analysis, details };
    } catch (err) {
      lastError = err;
    }
    }
    logger.warn("[CV Scoring] AI scoring failed after retries:", lastError);
    return null;
  }

  /**
   * A3. Skill Depth Bonus — 5đ
   * Detects if candidate actually used the skills in projects or experiences vs just listing them.
   */
  private scoreSkillDepth(
    candidateSkillNames: string[],
    projects: any[],
    experiences: any[],
    maxScore: number,
  ): number {
    if (!candidateSkillNames.length) return 0;

    const skillRegexes = candidateSkillNames.map(
      (skill) => new RegExp(`\\b${escapeRegex(skill.toLowerCase())}\\b`, "i"),
    );

    const projectTexts = projects.map(
      (p) => `${p.description || ""} ${(p.technologies || []).join(" ")}`.toLowerCase(),
    );
    const experienceTexts = experiences.map((e) => (e.description || "").toLowerCase());

    let demonstratedCount = 0;
    for (const re of skillRegexes) {
      const usedInProjects = projectTexts.some((text) => re.test(text));
      const usedInExperience = experienceTexts.some((text) => re.test(text));
      if (usedInProjects || usedInExperience) demonstratedCount++;
    }

    return demonstratedCount >= candidateSkillNames.length * 0.5 ? maxScore : 0;
  }

  /**
   * C3. Project Complexity — 5đ
   * Keyword detection for complex project traits vs simple homework.
   */
  private scoreProjectComplexity(projects: any[], maxScore: number): number {
    if (!projects || projects.length === 0) return 0;

    const highComplexityKeywords = [
      "microservice",
      "distributed system",
      "kubernetes",
      "k8s",
      "docker swarm",
      "aws lambda",
      "serverless",
      "ci/cd",
      "jenkins",
      "github actions",
      "elasticsearch",
      "kafka",
      "rabbitmq",
      "redis cluster",
      "grpc",
      "graphql",
      "blockchain",
      "smart contract",
      "machine learning",
      "deep learning",
      "tensorflow",
      "pytorch",
      "pwa",
      "web sockets",
      "real-time",
      "high availability",
      "scalability",
    ];

    const midComplexityKeywords = [
      "deploy",
      "production",
      "live",
      "rest api",
      "api",
      "docker",
      "aws",
      "azure",
      "gcp",
      "postgresql",
      "mongodb",
      "redis",
      "authentication",
      "authorization",
      "oauth",
      "jwt",
      "payment",
      "stripe",
      "unit test",
      "integration test",
    ];

    const basicKeywords = ["exercise", "tutorial", "homework", "assignment", "lab", "practice"];

    const projectText = projects
      .map((p) => `${p.name} ${p.description || ""} ${(p.technologies || []).join(" ")}`)
      .join(" ")
      .toLowerCase();

    const hasHigh = highComplexityKeywords.some((kw) => projectText.includes(kw));
    const hasMid = midComplexityKeywords.some((kw) => projectText.includes(kw));
    const hasBasic = basicKeywords.some((kw) => projectText.includes(kw));

    if (hasHigh) return maxScore;
    if (hasMid) return Math.round(maxScore * 0.8);
    if (hasBasic) return Math.round(maxScore * 0.4);

    if (projects.some((p) => (p.description || "").trim().length > 50)) return Math.round(maxScore * 0.6);

    return 0;
  }

  /**
   * D. Certifications — 10đ
   * Keyword match cert name vs job requirements
   */
  private scoreCertifications(
    certifications: any[],
    jobRequirements: string[],
    jobSkillNames: string[],
    maxScore: number,
  ): number {
    if (!certifications || certifications.length === 0) return 0;

    let certScore = 0;
    const combinedRequirements = [...jobRequirements, ...jobSkillNames].map((r) => r.toLowerCase());

    for (const cert of certifications) {
      const certName = (cert.name || "").toLowerCase();
      const certOrg = (cert.organization || "").toLowerCase();
      const certText = `${certName} ${certOrg} ${cert.description || ""}`.toLowerCase();

      // Priority 1: Direct match in certification name
      const directMatch = combinedRequirements.some((req) => certName.includes(req));
      if (directMatch) {
        certScore = maxScore;
        break;
      }

      // Priority 2: Language proficiency certs (IELTS, TOEIC, TOEFL, etc.)
      const langKeywords = [
        "ielts",
        "toeic",
        "toefl",
        "tiếng anh",
        "tieng anh",
        "ngoại ngữ",
        "foreign language",
        "language",
        "japanese",
        "tiếng nhật",
        "chinese",
        "tiếng trung",
        "korean",
        "tiếng hàn",
      ];
      const isLangCert = langKeywords.some((kw) => certName.includes(kw) || certText.includes(kw));

      if (isLangCert) {
        certScore = Math.max(certScore, Math.round(maxScore * 0.6));
      }

      // Priority 3: Famous IT Cert Organizations match
      const famousOrgs = ["aws", "microsoft", "google", "oracle", "cisco", "red hat", "comptia", "isc2"];
      const isFamousOrg = famousOrgs.some((org) => certOrg.includes(org) || certName.includes(org));

      if (isFamousOrg) {
        certScore = Math.max(certScore, Math.round(maxScore * 0.8));
      }

      // Priority 4: Indirect match in description
      const indirectMatch = combinedRequirements.some((req) => {
        if (req.length <= 4) return false;
        return certText.includes(req);
      });

      if (indirectMatch) {
        certScore = Math.max(certScore, Math.round(maxScore * 0.5));
      }
    }

    return certScore;
  }

  /**
   * C2. Project Relevance — 10đ
   * Uses deterministic keyword overlap with AI fallback.
   * AI result is cached for 24h per (job × project set).
   */
  private async scoreProjectRelevance(
    job: any,
    projects: any[],
    maxScore: number,
  ): Promise<{ score: number; details: string }> {
    if (!projects || projects.length === 0) return { score: 0, details: "No projects" };
    if (!job.title) return { score: 0, details: "Missing job title" };

    const cacheKey = `cv_c2:${job.id}:${hashCode(projects.map((p) => `${p.name}|${p.description || ""}`).join("||"))}`;
    const cached = simpleCache.get<{ score: number; details: string }>(cacheKey);
    if (cached) return cached;

    const result = await this.callAIOrFallback(job, projects, maxScore);
    simpleCache.set(cacheKey, result, C2_CACHE_TTL);
    return result;
  }

  private async callAIOrFallback(
    job: any,
    projects: any[],
    maxScore: number,
  ): Promise<{ score: number; details: string }> {
    const openai = getOpenAI();
    if (!openai) return this.scoreProjectRelevanceDeterministic(job, projects, maxScore);

    const prompt = [
      `Job: ${job.title}`,
      `Requirements: ${((job.requirement || job.requirements || []) as string[]).join(", ")}`,
      `Projects:`,
      ...projects
        .slice(0, 5)
        .map(
          (p, i) =>
            `[${i + 1}] ${p.name} | ${(p.description || "").substring(0, 200)} | Tech: ${(p.technologies || []).join(", ")}`,
        ),
      `Rate each 0-10 on tech alignment & complexity. Return JSON: {"projects":[{"project_index":N,"relevance_score":N,"reason":"..."}]}`,
    ].join("\n");

    const attempt = async (): Promise<{ score: number; details: string } | null> => {
      try {
        const response = await openai.chat.completions.create({
          model: getModel(),
          messages: [
            { role: "system", content: "You are a technical recruiter. Return valid JSON only." },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0,
          max_tokens: 800,
        });

        const raw = response.choices[0]?.message?.content;
        if (!raw) return null;

        const parsed = relevanceSchema.parse(recoverTruncatedJson(raw));
        if (!parsed.projects || parsed.projects.length === 0) return null;

        let bestScore = 0;
        const reasons: string[] = [];
        for (const p of parsed.projects) {
          const normalized = (p.relevance_score / 10) * maxScore;
          if (normalized > bestScore) bestScore = normalized;
          reasons.push(`P${p.project_index}: ${p.relevance_score}/10 (${p.reason})`);
        }

        return { score: Math.round(bestScore), details: reasons.join(" | ") };
      } catch {
        return null;
      }
    };

    const aiResult = await attempt();
    if (aiResult) return aiResult;

    await new Promise((r) => setTimeout(r, 1000));
    const retryResult = await attempt();
    if (retryResult) return retryResult;

    logger.warn("[CV Scoring] C2 AI failed, using deterministic fallback");
    return this.scoreProjectRelevanceDeterministic(job, projects, maxScore);
  }

  private scoreProjectRelevanceDeterministic(
    job: any,
    projects: any[],
    maxScore: number,
  ): { score: number; details: string } {
    const jobReqs = [
      ...((job.requirement || job.requirements || []) as string[]),
      ...(job.skills || []).map((s: any) => s.name),
    ].map((r: string) => r.toLowerCase());

    if (jobReqs.length === 0) return { score: 0, details: "No job requirements to compare" };

    let bestOverlap = 0;
    for (const p of projects) {
      const techText = [...(p.technologies || []), ...(p.description || "").toLowerCase().split(/[\s,;]+/)].filter(
        Boolean,
      );
      const overlap = jobReqs.filter((req: string) => techText.some((t: string) => t.includes(req))).length;
      bestOverlap = Math.max(bestOverlap, overlap);
    }

    const ratio = Math.min(bestOverlap / 3, 1);
    return {
      score: Math.round(ratio * maxScore),
      details: `Deterministic overlap: ${bestOverlap} keywords matched (${Math.round(ratio * 100)}%)`,
    };
  }

  /**
   * B2. Course/Skills Mapping — 15đ
   * Cross-references the student's education fields with job requirements
   * via the skill-mapping table.
   */
  // ==========================================================================
  // MAIN SCORING METHOD
  // ==========================================================================

  async scoreApplication(applicationId: number, forceRefresh = false) {
    // 1. Fetch Application
    const application = await applicationRepository.findOne({ id: applicationId });
    if (!application) throw new Error("Application not found");

    if (!forceRefresh && application.cv_score !== null && application.cv_score !== undefined) {
      return {
        score: application.cv_score,
        matched_skills: application.cv_matched_skills || [],
        missing_requirements: application.cv_missing_requirements || [],
        analysis: application.cv_analysis || "",
        score_breakdown: application.cv_score_breakdown || {},
        is_cached: true,
      };
    }

    const jobId = application.job_id || (application as any).job?.id;
    const userId = application.user_id || (application as any).student?.user_id || (application as any).user?.id;

    if (!jobId || !userId) {
      throw new Error(`Application missing valid jobId (${jobId}) or userId (${userId})`);
    }

    // 2. PARALLEL FETCH: Job, Student, and Common Skills
    const [jobResult, studentResult, commonSkillsResult] = await Promise.all([
      jobRepository.findOne(jobId),
      studentRepository.findByUserId(userId),
      supabase.from("common_skills").select("*"),
    ]);

    const { job } = jobResult;
    const student = studentResult;
    const commonSkills = commonSkillsResult.data || [];

    // Fetch company for scoring config
    const companyResult = job?.company_id ? await companyRepository.findOne({ company_id: job.company_id }) : null;
    const company = companyResult || null;
    let educations: any[] = [];
    let experiences: any[] = [];
    let projects: any[] = [];
    let certifications: any[] = [];
    let explicitStudentSkills: string[] = [];

    if (student) {
      explicitStudentSkills = (student as any).skills || [];

      // 3. PARALLEL FETCH: All student data (educations, experiences, projects, certifications)
      const [eduRes, expRes, projRes, certRes] = await Promise.all([
        supabase.from("educations").select("*").eq("student_id", student.id),
        supabase.from("experiences").select("*").eq("student_id", student.id),
        supabase.from("projects").select("*").eq("student_id", student.id),
        supabase.from("certifications").select("*").eq("student_id", student.id),
      ]);

      educations = eduRes.data || [];
      experiences = expRes.data || [];
      projects = projRes.data || [];
      certifications = certRes.data || [];
    }

    const jobSkillNames = (job.skills || []).map((s: any) => s.name);

    const expandedCandidateSkills = await skillMappingService.expandSkills(explicitStudentSkills);
    const expandedJobSkills = await skillMappingService.expandSkills(jobSkillNames);

    // --- 4. Load CV Text ---
    let pdfText = "";
    let cvUrl = application.resume_url;

    if (!cvUrl && student?.id) {
      const { data: cvData } = await supabase
        .from("cv")
        .select("filepath")
        .eq("studentid", student.id)
        .order("createdat", { ascending: false })
        .limit(1)
        .single();
      cvUrl = cvData?.filepath;
    }

    if (cvUrl && cvUrl.toLowerCase().endsWith(".pdf")) {
      pdfText = await downloadAndParseCv(cvUrl);

      // Fallback: If primary URL failed, try looking up in student CV table one last time
      if (!pdfText && application.resume_url && student?.id) {
        const { data: cvData } = await supabase
          .from("cv")
          .select("filepath")
          .eq("studentid", student.id)
          .order("createdat", { ascending: false })
          .limit(1)
          .single();
        if (cvData?.filepath && cvData.filepath !== cvUrl) {
          pdfText = await downloadAndParseCv(cvData.filepath);
        }
      }
    }

    // --- 6. AI Scan for Candidate's Common Skills & Categories ---
    let aiExtractedSkillIds: number[] = [];

    const hasUsefulEducation = educations.some((e) => e.major || e.degree);

    const extractionCacheKey = student
      ? `cv_extract:${userId}:${hashCode(`${expandedCandidateSkills.join(",")}|${experiences.length}|${projects.length}|${certifications.length}`)}`
      : null;

    let parsedExtraction: z.infer<typeof extractionSchema> | null = null;

    if (extractionCacheKey) {
      const cached = simpleCache.get<z.infer<typeof extractionSchema>>(extractionCacheKey);
      if (cached) parsedExtraction = cached;
    }

    if (!parsedExtraction) {
      const cvText = [
        `About: ${(student as any)?.about || "N/A"}`,
        ...experiences.map((e) => `${e.position} ${e.description}`),
        ...projects.map((p) => `${p.name} ${p.description}`),
        pdfText.length > 20 ? `\n--- PDF EXTRACT ---\n${pdfText.substring(0, 6000)}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const openaiInstance = getOpenAI();

      if (openaiInstance && cvText.length > 20 && commonSkills.length > 0) {
        const skillNamesList = commonSkills.map((s) => s.name).join(", ");
        const prompt = [
          `Extract skills matching the Valid Skills list and work experiences from this CV.`,
          `Also extract major, experience_level, has_it_cert, and up to 3 projects.`,
          `Valid Skills: ${skillNamesList}`,
          `CV:\n${cvText.substring(0, 5000)}`,
          `Return JSON: {"skills":[],"extracted_major":null,"experience_level":null,"has_it_cert":false,"projects":[],"experiences":[]}`,
        ].join("\n");

        const attempt = async (): Promise<any | null> => {
          try {
            const response = await openaiInstance.chat.completions.create({
              model: getModel(),
              messages: [
                { role: "system", content: "You extract structured data from CVs. Return valid JSON." },
                { role: "user", content: prompt },
              ],
              response_format: { type: "json_object" },
              temperature: 0,
              max_tokens: 2000,
            });
            const raw = response.choices[0]?.message?.content;
            if (!raw) return null;
            return extractionSchema.parse(recoverTruncatedJson(raw));
          } catch {
            return null;
          }
        };

        const parsed = await attempt();
        if (parsed) {
          parsedExtraction = parsed;
          if (extractionCacheKey) {
            simpleCache.set(extractionCacheKey, parsedExtraction, EXTRACTION_CACHE_TTL);
          }
        }
      }
    }

    // Apply AI extraction result (from API or cache) to scoring data
    if (parsedExtraction) {
      const pe = parsedExtraction;
      const extractedNames: string[] = Array.isArray(pe.skills)
        ? pe.skills.filter((s: any) => typeof s === "string")
        : [];

      if (pe.extracted_major && !hasUsefulEducation) {
        if (educations.length === 0) {
          educations.push({ degree: "AI Extracted", major: pe.extracted_major, school: "UIT (AI)" });
        } else {
          educations = educations.map((e) => (e.major || e.degree ? e : { ...e, major: pe.extracted_major }));
        }
      }

      if (projects.length === 0 && Array.isArray(pe.projects) && pe.projects.length > 0) {
        projects = pe.projects.map((p: any) => ({
          name: p.name || "Unnamed Project",
          description: p.description || "",
          technologies: Array.isArray(p.technologies) ? p.technologies : [],
        }));
      }

      if (Array.isArray(pe.experiences) && pe.experiences.length > 0) {
        for (const aiExp of pe.experiences) {
          if (
            !experiences.some(
              (e) =>
                e.position?.toLowerCase() === aiExp.position?.toLowerCase() &&
                e.company?.toLowerCase() === aiExp.company?.toLowerCase(),
            )
          ) {
            experiences.push({
              position: aiExp.position || "AI Extracted Role",
              company: aiExp.company || "CV Reference",
              description: aiExp.description || pe.experience_level || "",
            });
          }
        }
      } else if (experiences.length === 0 && pe.experience_level && pe.experience_level !== "none") {
        experiences.push({
          position: "AI Extracted Role",
          company: "CV Reference",
          description: pe.experience_level,
        });
      }

      if (certifications.length === 0 && pe.has_it_cert) {
        certifications.push({ name: "AI Extracted IT Certification" });
      }

      aiExtractedSkillIds = extractedNames
        .map((name) => {
          const match = commonSkills.find((cs) => cs.name.toLowerCase() === name.toLowerCase().trim());
          return match?.id ?? null;
        })
        .filter((id): id is number => id !== null);
    }

    // Fallback: scan PDF for language certs if none found in DB or AI extraction
    if (certifications.length === 0 && pdfText.length > 20) {
      const lower = pdfText.toLowerCase();
      let langCertName = "";
      if (lower.includes("toeic")) langCertName = "TOEIC";
      else if (lower.includes("ielts")) langCertName = "IELTS";
      else if (lower.includes("toefl")) langCertName = "TOEFL";
      else if (
        lower.includes("tiếng anh") ||
        lower.includes("tieng anh") ||
        lower.includes("ngoại ngữ") ||
        lower.includes("foreign language")
      )
        langCertName = "Language Certification";
      if (langCertName) certifications.push({ name: langCertName });
    }

    const explicitSkillIds = commonSkills
      .filter((cs) => expandedCandidateSkills.some((s) => s.toLowerCase() === cs.name.toLowerCase()))
      .map((cs) => cs.id);

    const allCandidateSkillIds = Array.from(new Set([...explicitSkillIds, ...aiExtractedSkillIds]));
    const candidateSkillNames = allCandidateSkillIds
      .map((id) => commonSkills.find((s) => s.id === id)?.name)
      .filter(Boolean) as string[];

    // --- 6. Bulk Insert candidate_skills to DB (Chunked Upsert) ---
    if (allCandidateSkillIds.length > 0) {
      const inserts = allCandidateSkillIds.map((id) => ({
        candidate_id: userId,
        common_skill_id: id,
      }));

      const CHUNK_SIZE = 50;
      for (let i = 0; i < inserts.length; i += CHUNK_SIZE) {
        const chunk = inserts.slice(i, i + CHUNK_SIZE);
        await supabase.from("candidate_skills").upsert(chunk, { onConflict: "candidate_id, common_skill_id" });
      }
    }

    // --- 7. Get Dynamic Weights ---
    const hasProjects = projects.length > 0;
    const baseWeights = getDynamicWeights(hasProjects);

    // --- 7b. AI Scoring (if custom weights available) ---
    let weights = baseWeights;
    // Resolve custom weights: job.scoring_weights > company.scoring_config (friend's UI)
    let customWeights: ScoringWeights | null = null;
    if (job.scoring_weights) {
      try {
        customWeights = scoringWeightsSchema.parse(job.scoring_weights);
        verifyWeights(customWeights);
      } catch {
        customWeights = null;
      }
    }
    if (!customWeights) {
      customWeights = convertCompanyScoringConfig(company?.scoring_config);
    }

    if (customWeights) {
      try {
        const aiResult = await this.scoreWithAI(
          job,
          company,
          candidateSkillNames,
          educations,
          projects,
          experiences,
          certifications,
          customWeights,
        );
        if (aiResult) {
          const s = aiResult.scores as Record<string, any>;

          let finalScore = s.A1_REQUIRED + s.A2_NICE + s.A3_SKILL_DEPTH + s.B1_MAJOR + s.B2_COURSES +
            s.C1_PROJECT_COUNT + s.C2_PROJECT_RELEVANCE + s.C3_PROJECT_COMPLEXITY + s.D_CERTIFICATIONS + s.E_EXPERIENCE;
          const customScores: Record<string, number> = {};
          for (const key of Object.keys(s)) {
            if (key.startsWith("CUSTOM_") && typeof s[key] === "number") {
              const val = clamp(s[key], (customWeights as any)[key] ?? 0);
              customScores[key] = val;
              finalScore += val;
            }
          }
          finalScore = clamp(finalScore, 100);

          const breakdown = this.buildScoreBreakdown(
            {
              a1: s.A1_REQUIRED,
              a2: s.A2_NICE,
              a3: s.A3_SKILL_DEPTH,
              b1: s.B1_MAJOR,
              b2: s.B2_COURSES,
              c1: s.C1_PROJECT_COUNT,
              c2: s.C2_PROJECT_RELEVANCE,
              c3: s.C3_PROJECT_COMPLEXITY,
              d: s.D_CERTIFICATIONS,
              e: s.E_EXPERIENCE,
            },
            customWeights,
            hasProjects,
            { matched: [], missing: [] },
            { matched: [], missing: [] },
            { reason: "" },
            { details: "" },
            { details: "" },
            customScores,
            aiResult.details,
          );
          // Inject per-component reasoning from AI into breakdown
          const bd: any = breakdown;
          if (bd.technical_skills) {
            if (bd.technical_skills.required) bd.technical_skills.required.reason = aiResult.details.A1_REQUIRED || "";
            if (bd.technical_skills.nice_to_have)
              bd.technical_skills.nice_to_have.reason = aiResult.details.A2_NICE || "";
            if (bd.technical_skills.skill_depth)
              bd.technical_skills.skill_depth.reason = aiResult.details.A3_SKILL_DEPTH || "";
          }
          if (bd.academic?.major) bd.academic.major.reason = aiResult.details.B1_MAJOR || "";
          if (bd.projects) {
            if (bd.projects.count) bd.projects.count.reason = aiResult.details.C1_PROJECT_COUNT || "";
            if (bd.projects.relevance) bd.projects.relevance.reason = aiResult.details.C2_PROJECT_RELEVANCE || "";
            if (bd.projects.complexity) bd.projects.complexity.reason = aiResult.details.C3_PROJECT_COMPLEXITY || "";
          }
          if (bd.certifications) bd.certifications.reason = aiResult.details.D_CERTIFICATIONS || "";
          if (bd.experience) bd.experience.reason = aiResult.details.E_EXPERIENCE || "";

          // Compute missing items deterministically for consistency
          const jobRequirements = [...(job.requirement || []), ...expandedJobSkills].filter(Boolean);
          const a1Fallback = this.matchSkills(candidateSkillNames, jobRequirements, 100);
          const jobNiceFallback = job.nice_to_haves || [];
          const a2Fallback = this.matchSkills(candidateSkillNames, jobNiceFallback, 100);

          try {
            await supabase
              .from("applications")
              .update({
                cv_score: finalScore,
                cv_analysis: aiResult.analysis,
                cv_matched_skills: candidateSkillNames,
                cv_score_breakdown: breakdown,
                updated_at: new Date().toISOString(),
              })
              .eq("id", applicationId);
          } catch (dbError) {
            logger.error("Failed to persist AI score", dbError);
          }
          return {
            score: finalScore,
            matched_skills: candidateSkillNames,
            missing_requirements: a1Fallback.missing,
            missing_nice_to_haves: a2Fallback.missing,
            analysis: aiResult.analysis,
            score_breakdown: breakdown,
            debug: {
              candidate_skills_expanded: expandedCandidateSkills,
              jd_skills_expanded: expandedJobSkills,
              openai_common_skills_extracted: candidateSkillNames,
              ai_skill_ids_extracted: aiExtractedSkillIds,
              pdf_text_length: pdfText.length,
              common_skills_in_db: commonSkills.length,
              ai_extraction_ran: aiExtractedSkillIds.length > 0,
              has_projects: hasProjects,
              scoring_mode: "ai",
            },
            is_cached: false,
          };
        }
      } catch (err) {
        logger.warn("[CV Scoring] AI scoring init failed, fallback to deterministic:", err);
      }
      // AI failed or not available — use custom weights for deterministic (safe parse)
      try {
        verifyWeights(customWeights);
        weights = customWeights;
      } catch {
        logger.warn("[CV Scoring] Invalid custom weights for deterministic fallback, using defaults");
      }
    }

    // --- 8. Score Each Component (deterministic) ---

    // A1. Required Skills Match
    const jobRequirements = [...(job.requirement || []), ...expandedJobSkills].filter(Boolean);
    const a1Result = this.matchSkills(candidateSkillNames, jobRequirements, weights.A1_REQUIRED);
    const a1Score = clamp(a1Result.score, weights.A1_REQUIRED);

    // A2. Nice-to-have Match
    const jobNice = job.nice_to_haves || [];
    const a2Result = this.matchSkills(candidateSkillNames, jobNice, weights.A2_NICE);
    const a2Score = clamp(a2Result.score, weights.A2_NICE);

    // A3. Skill Depth Bonus
    const a3Score = this.scoreSkillDepth(candidateSkillNames, projects, experiences, weights.A3_SKILL_DEPTH);

    // B1. Major/Field Match
    const b1Result = this.scoreMajor(educations, weights.B1_MAJOR);
    const b1Score = clamp(b1Result.score, weights.B1_MAJOR);

    const b2Score = 0;

    // C1. Project Count
    const c1Score = hasProjects
      ? clamp(this.scoreProjectCount(projects.length, weights.C1_PROJECT_COUNT), weights.C1_PROJECT_COUNT)
      : 0;

    // C2. Project Relevance — AI-based scoring
    let c2Score = 0;
    let c2Result = { score: 0, details: "No projects" };
    if (hasProjects) {
      c2Result = await this.scoreProjectRelevance(job, projects, weights.C2_PROJECT_RELEVANCE);
      c2Score = clamp(c2Result.score, weights.C2_PROJECT_RELEVANCE);
    }

    // C3. Project Complexity — Keyword-based
    const c3Score = hasProjects
      ? clamp(this.scoreProjectComplexity(projects, weights.C3_PROJECT_COMPLEXITY), weights.C3_PROJECT_COMPLEXITY)
      : 0;

    // D. Certifications — Keyword-based
    const dScore = clamp(
      this.scoreCertifications(certifications, jobRequirements, jobSkillNames, weights.D_CERTIFICATIONS),
      weights.D_CERTIFICATIONS,
    );

    // E. Experience
    const eResult = this.scoreExperience(experiences, weights.E_EXPERIENCE);
    const eScore = clamp(eResult.score, weights.E_EXPERIENCE);

    // --- 9. Final Score ---
    const finalScore = clamp(
      a1Score + a2Score + a3Score + b1Score + b2Score + c1Score + c2Score + c3Score + dScore + eScore,
      100,
    );

    // Validation log
    const componentSum =
      a1Score + a2Score + a3Score + b1Score + b2Score + c1Score + c2Score + c3Score + dScore + eScore;
    if (componentSum > 100) {
      logger.error(`[CV Scoring] BUG: Component sum ${componentSum} exceeds 100! Clamping applied.`);
    }

    // --- 10. Generate Analysis ---
    let analysis = "";
    if (finalScore >= 80) {
      analysis =
        "Excellent candidate! The profile hits core requirements, bonus nice-to-haves, and aligns perfectly with educational and category domains.";
    } else if (finalScore >= 55) {
      analysis =
        "Solid match. The candidate possesses a strong baseline mapping to common_skills and the primary job requirements.";
    } else if (finalScore >= 35) {
      analysis =
        "Partial match. The candidate meets partial core skill requirements but lacks deeper nice-to-have or category overlaps.";
    } else {
      analysis = "Low match. Very limited overlap with explicit required skills.";
    }

    // --- 11. Build Breakdown ---
    const breakdown = this.buildScoreBreakdown(
      {
        a1: a1Score,
        a2: a2Score,
        a3: a3Score,
        b1: b1Score,
        b2: b2Score,
        c1: c1Score,
        c2: c2Score,
        c3: c3Score,
        d: dScore,
        e: eScore,
      },
      weights,
      hasProjects,
      a1Result,
      a2Result,
      b1Result,
      c2Result,
      eResult,
    );

    // --- 12. Persist to DB ---
    try {
      await supabase
        .from("applications")
        .update({
          cv_score: finalScore,
          cv_analysis: analysis,
          cv_matched_skills: candidateSkillNames,
          cv_missing_requirements: a1Result.missing,
          cv_score_breakdown: breakdown,
          updated_at: new Date().toISOString(),
        })
        .eq("id", applicationId);
    } catch (dbError) {
      logger.error("Failed to persist score to db", dbError);
    }

    return {
      score: finalScore,
      matched_skills: candidateSkillNames,
      missing_requirements: a1Result.missing,
      missing_nice_to_haves: a2Result.missing,
      analysis,
      score_breakdown: breakdown,
      debug: {
        candidate_skills_expanded: expandedCandidateSkills,
        jd_skills_expanded: expandedJobSkills,
        openai_common_skills_extracted: candidateSkillNames,
        ai_skill_ids_extracted: aiExtractedSkillIds,
        pdf_text_length: pdfText.length,
        common_skills_in_db: commonSkills.length,
        ai_extraction_ran: aiExtractedSkillIds.length > 0,
        has_projects: hasProjects,
        dynamic_weights_applied: !hasProjects,
      },
      is_cached: false,
    };
  }

  // Build score breakdown with actual weights used.

  private buildScoreBreakdown(
    scores: {
      a1: number;
      a2: number;
      a3: number;
      b1: number;
      b2: number;
      c1: number;
      c2: number;
      c3: number;
      d: number;
      e: number;
    },
    weights: ScoringWeights,
    hasProjects: boolean,
    a1Result: { matched: string[]; missing: string[] },
    a2Result: { matched: string[]; missing: string[] },
    b1Result: { reason: string },
    c2Result: { details: string },
    eResult: { details: string },
    customScores: Record<string, number> = {},
    customDetails: Record<string, string> = {},
  ) {
    const note = !hasProjects ? "Weight increased due to 0 projects" : undefined;
    const projectNote = !hasProjects ? "No projects — weight redistributed to A1/B1/E" : undefined;

    const isCustomized = (Object.keys(weights) as (keyof ScoringWeights)[])
      .some((k) => k.startsWith("CUSTOM_") || weights[k] !== DEFAULT_WEIGHTS[k]);
    const adjustments: string[] = [];
    if (isCustomized) {
      for (const [key, val] of Object.entries(weights)) {
        if (typeof val !== "number") continue;
        const defaultVal = (DEFAULT_WEIGHTS as any)[key] ?? 0;
        if (val !== defaultVal) {
          const diff = val - defaultVal;
          adjustments.push(`${key}: ${defaultVal} → ${val} (${diff >= 0 ? "+" : ""}${diff})`);
        }
      }
    }

    const customSections = Object.fromEntries(
      Object.entries(customScores).map(([k, v]) => [
        k,
        {
          score: v,
          max: weights[k as keyof typeof weights] ?? 0,
          reason: customDetails[k] || "",
        },
      ]),
    );

    const standardTotal =
      scores.a1 + scores.a2 + scores.a3 + scores.b1 + scores.c1 + scores.c2 + scores.c3 + scores.d + scores.e;
    const customTotal = Object.values(customScores).reduce((s, v) => s + v, 0);

    return {
      technical_skills: {
        required: {
          score: scores.a1,
          max: weights.A1_REQUIRED,
          matched: a1Result.matched,
          missing: a1Result.missing,
          note,
        },
        nice_to_have: {
          score: scores.a2,
          max: weights.A2_NICE,
          matched: a2Result.matched,
          missing: a2Result.missing,
        },
        skill_depth: {
          score: scores.a3,
          max: weights.A3_SKILL_DEPTH,
        },
        total: {
          score: scores.a1 + scores.a2 + scores.a3,
          max: weights.A1_REQUIRED + weights.A2_NICE + weights.A3_SKILL_DEPTH,
        },
      },
      academic: {
        major: {
          score: scores.b1,
          max: weights.B1_MAJOR,
          reason: b1Result.reason,
          note,
        },
        total: {
          score: scores.b1,
          max: weights.B1_MAJOR,
        },
      },
      projects: {
        count: {
          score: scores.c1,
          max: weights.C1_PROJECT_COUNT,
        },
        relevance: {
          score: scores.c2,
          max: weights.C2_PROJECT_RELEVANCE,
          details: c2Result.details,
        },
        complexity: {
          score: scores.c3,
          max: weights.C3_PROJECT_COMPLEXITY,
        },
        total: {
          score: scores.c1 + scores.c2 + scores.c3,
          max: weights.C1_PROJECT_COUNT + weights.C2_PROJECT_RELEVANCE + weights.C3_PROJECT_COMPLEXITY,
          note: projectNote,
        },
      },
      certifications: {
        score: scores.d,
        max: weights.D_CERTIFICATIONS,
      },
      experience: {
        score: scores.e,
        max: weights.E_EXPERIENCE,
        details: eResult.details,
        note,
      },
      ...(Object.keys(customSections).length > 0 ? { custom_sections: customSections } : {}),
      metadata: {
        total_score: standardTotal + customTotal,
        total_max: 100,
        dynamic_weights_applied: isCustomized || !hasProjects,
        weight_adjustments: adjustments,
      },
    };
  }
}

export default new CvScoringService();
