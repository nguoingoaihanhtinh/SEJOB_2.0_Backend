import { z } from "zod";

/**
 * Scoring weights configuration for CV assessment.
 */
export interface ScoringWeights {
  A1_REQUIRED: number;
  A2_NICE: number;
  A3_SKILL_DEPTH: number;
  B1_MAJOR: number;
  B2_COURSES: number;
  C1_PROJECT_COUNT: number;
  C2_PROJECT_RELEVANCE: number;
  C3_PROJECT_COMPLEXITY: number;
  D_CERTIFICATIONS: number;
  E_EXPERIENCE: number;
  [key: `CUSTOM_${string}`]: number | undefined;
}

export const scoringWeightsSchema = z.object({
  A1_REQUIRED: z.number().min(0).max(100),
  A2_NICE: z.number().min(0).max(100),
  A3_SKILL_DEPTH: z.number().min(0).max(100),
  B1_MAJOR: z.number().min(0).max(100),
  B2_COURSES: z.number().min(0).max(100),
  C1_PROJECT_COUNT: z.number().min(0).max(100),
  C2_PROJECT_RELEVANCE: z.number().min(0).max(100),
  C3_PROJECT_COMPLEXITY: z.number().min(0).max(100),
  D_CERTIFICATIONS: z.number().min(0).max(100),
  E_EXPERIENCE: z.number().min(0).max(100),
}).catchall(z.number().min(0).max(100));

export const DEFAULT_WEIGHTS: ScoringWeights = {
  A1_REQUIRED: 35,
  A2_NICE: 10,
  A3_SKILL_DEPTH: 5,
  B1_MAJOR: 10,
  B2_COURSES: 0,
  C1_PROJECT_COUNT: 5,
  C2_PROJECT_RELEVANCE: 10,
  C3_PROJECT_COMPLEXITY: 5,
  D_CERTIFICATIONS: 10,
  E_EXPERIENCE: 10,
};

/**
 * When a student has 0 projects, the entire C category (20 points: C1=5, C2=10, C3=5) is
 * redistributed to A1 (+10), B1 (+5), and E (+5). B2_COURSES is disabled (0 pts).
 * This ensures the total always equals 100 without awarding "free" points.
 */
export function getDynamicWeights(hasProjects: boolean, extraKeys?: Record<string, number>): ScoringWeights {
  const base = hasProjects
    ? { ...DEFAULT_WEIGHTS }
    : { ...DEFAULT_WEIGHTS, A1_REQUIRED: DEFAULT_WEIGHTS.A1_REQUIRED + 10, B1_MAJOR: DEFAULT_WEIGHTS.B1_MAJOR + 5, E_EXPERIENCE: DEFAULT_WEIGHTS.E_EXPERIENCE + 5, C1_PROJECT_COUNT: 0, C2_PROJECT_RELEVANCE: 0, C3_PROJECT_COMPLEXITY: 0 };

  if (extraKeys) {
    for (const [key, val] of Object.entries(extraKeys)) {
      if (key.startsWith("CUSTOM_") && typeof val === "number") {
        (base as any)[key] = val;
      }
    }
  }
  return base;
}

export function verifyWeights(weights: ScoringWeights): void {
  const total = Object.values(weights).reduce((sum, v) => sum + (typeof v === "number" ? v : 0), 0);

  if (total !== 100) {
    throw new Error(`Weight total is ${total}, expected 100!`);
  }
}

const WEIGHT_LABELS: Record<keyof ScoringWeights, string> = {
  A1_REQUIRED: "Required Skills Match",
  A2_NICE: "Nice-to-have Skills Match",
  A3_SKILL_DEPTH: "Skill Depth (demonstrated in projects/experience)",
  B1_MAJOR: "Major / Field of Study",
  B2_COURSES: "Course Mapping (disabled)",
  C1_PROJECT_COUNT: "Project Count",
  C2_PROJECT_RELEVANCE: "Project Relevance to Job",
  C3_PROJECT_COMPLEXITY: "Project Complexity",
  D_CERTIFICATIONS: "Certifications",
  E_EXPERIENCE: "Work Experience",
};

export function buildWeightsText(weights: ScoringWeights): string {
  const lines: string[] = [];
  for (const [key, val] of Object.entries(weights)) {
    if (typeof val !== "number" || val <= 0) continue;
    if (key.startsWith("CUSTOM_")) {
      const label = key.slice(7).replace(/_/g, " ");
      lines.push(`- [Custom] ${label}: ${val} points max — search for this keyword in CV`);
    } else if (key in WEIGHT_LABELS) {
      lines.push(`- ${WEIGHT_LABELS[key as keyof ScoringWeights]}: ${val} points max`);
    }
  }
  return lines.join("\n");
}

const DB_KEY_TO_CANONICAL: Record<string, keyof ScoringWeights> = {
  require_skills: "A1_REQUIRED",
  nice_to_have: "A2_NICE",
  skill_depth: "A3_SKILL_DEPTH",
  major_match: "B1_MAJOR",
  academic_total: "B2_COURSES",
  project_count: "C1_PROJECT_COUNT",
  project_relevance: "C2_PROJECT_RELEVANCE",
  project_complexity: "C3_PROJECT_COMPLEXITY",
  certifications: "D_CERTIFICATIONS",
  experience: "E_EXPERIENCE",
};

function tryParseScoreConfig(raw: unknown): any {
  if (!raw) return null;
  try {
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
}

function fillMissingWeights(partial: Partial<ScoringWeights>): ScoringWeights | null {
  const merged = { ...DEFAULT_WEIGHTS, ...partial };
  const total = (Object.keys(DEFAULT_WEIGHTS) as (keyof ScoringWeights)[]).reduce((sum, k) => sum + (merged[k] ?? 0), 0);
  if (total !== 100) return null;
  return merged as ScoringWeights;
}

/**
 * Converts `company.scoring_config` (saved by ScoringConfigTab)
 * to our canonical ScoringWeights format.
 *
 * Accepts:
 *   - Array format: [{ name, key, max_score }, ...]
 *   - Object format: { require_skills: 25, ... }
 *
 * Returns null if config is missing, unparseable, or total != 100.
 */
export function convertCompanyScoringConfig(raw: unknown): ScoringWeights | null {
  const parsed = tryParseScoreConfig(raw);
  if (!parsed) return null;

  // Array format from ScoringConfigTab
  if (Array.isArray(parsed)) {
    const result: Partial<ScoringWeights> = {};
    for (const item of parsed) {
      const ck = DB_KEY_TO_CANONICAL[item?.key];
      if (ck && typeof item.max_score === "number") {
        result[ck] = item.max_score;
      }
    }
    return fillMissingWeights(result);
  }

  // Object format (legacy)
  if (typeof parsed === "object" && parsed !== null) {
    const result: Partial<ScoringWeights> = {};
    for (const [key, val] of Object.entries(parsed)) {
      const ck = DB_KEY_TO_CANONICAL[key];
      if (ck && typeof val === "number") {
        result[ck] = val;
      }
    }
    return fillMissingWeights(result);
  }

  return null;
}

export const DEFAULT_SCORING_PROMPT = `You are a precise CV scoring engine. Score a candidate against a job posting.

For each component below, assign a score from 0 to its max weight based strictly on the evidence provided.
- 0 = no match / none, max = perfect match
- Be critical and honest. Do NOT inflate scores.
- For EACH component, provide a brief reason explaining why that score was assigned.
- Return ONLY valid JSON with no extra text.

Job Title: {{jobTitle}}
Requirements: {{requirements}}
Nice-to-Haves: {{niceToHaves}}

Weights:
{{weightsText}}

Candidate Info:
- Education: {{educations}}
- Skills: {{skills}}
- Projects: {{projects}}
- Work Experience: {{experiences}}
- Certifications: {{certifications}}

Return JSON:
{
  "A1_REQUIRED": 0-{{A1_REQUIRED}}, "A1_REQUIRED_reason": "why this score",
  "A2_NICE": 0-{{A2_NICE}}, "A2_NICE_reason": "why this score",
  "A3_SKILL_DEPTH": 0-{{A3_SKILL_DEPTH}}, "A3_SKILL_DEPTH_reason": "why this score",
  "B1_MAJOR": 0-{{B1_MAJOR}}, "B1_MAJOR_reason": "why this score",
  "C1_PROJECT_COUNT": 0-{{C1_PROJECT_COUNT}}, "C1_PROJECT_COUNT_reason": "why this score",
  "C2_PROJECT_RELEVANCE": 0-{{C2_PROJECT_RELEVANCE}}, "C2_PROJECT_RELEVANCE_reason": "why this score",
  "C3_PROJECT_COMPLEXITY": 0-{{C3_PROJECT_COMPLEXITY}}, "C3_PROJECT_COMPLEXITY_reason": "why this score",
  "D_CERTIFICATIONS": 0-{{D_CERTIFICATIONS}}, "D_CERTIFICATIONS_reason": "why this score",
  "E_EXPERIENCE": 0-{{E_EXPERIENCE}}, "E_EXPERIENCE_reason": "why this score",
{{customSectionsOutput}}
  "reasoning": "Brief summary of key strengths and weaknesses"
}`;
