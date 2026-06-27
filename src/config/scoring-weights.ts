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
  A1_REQUIRED: 30,
  A2_NICE: 5,
  A3_SKILL_DEPTH: 10,
  B1_MAJOR: 10,
  B2_COURSES: 0,
  C1_PROJECT_COUNT: 10,
  C2_PROJECT_RELEVANCE: 10,
  C3_PROJECT_COMPLEXITY: 10,
  D_CERTIFICATIONS: 5,
  E_EXPERIENCE: 10,
};

/**
 * When a student has 0 projects, the entire C category (30 points: C1=10, C2=10, C3=10) is
 * redistributed to A1 (+12), A3 (+5), B1 (+5), D (+3), and E (+5). B2_COURSES is disabled (0 pts).
 * This ensures the total always equals 100 without awarding "free" points.
 */
export function getDynamicWeights(hasProjects: boolean, extraKeys?: Record<string, number>): ScoringWeights {
  const base = hasProjects
    ? { ...DEFAULT_WEIGHTS }
    : { ...DEFAULT_WEIGHTS, A1_REQUIRED: DEFAULT_WEIGHTS.A1_REQUIRED + 12, A3_SKILL_DEPTH: DEFAULT_WEIGHTS.A3_SKILL_DEPTH + 5, B1_MAJOR: DEFAULT_WEIGHTS.B1_MAJOR + 5, D_CERTIFICATIONS: DEFAULT_WEIGHTS.D_CERTIFICATIONS + 3, E_EXPERIENCE: DEFAULT_WEIGHTS.E_EXPERIENCE + 5, C1_PROJECT_COUNT: 0, C2_PROJECT_RELEVANCE: 0, C3_PROJECT_COMPLEXITY: 0 };

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
  E_EXPERIENCE: "Internship & Work Experience",
};

export function buildWeightsText(weights: ScoringWeights, prompts?: Record<string, string>): string {
  const lines: string[] = [];
  for (const [key, val] of Object.entries(weights)) {
    if (typeof val !== "number" || val <= 0) continue;
    if (key.startsWith("CUSTOM_")) {
      const keyword = key.slice(7);
      const label = keyword.replace(/_/g, " ");
      const hint = prompts?.[keyword] ? ` — Score based on: ${prompts[keyword]}` : " — search for this keyword in CV";
      lines.push(`- [Custom] ${label}: ${val} points max${hint}`);
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

export const DEFAULT_SCORING_PROMPT = `You are a precise CV scoring engine for a platform serving students and fresh graduates. Score the candidate against the job posting below.

=== SCORING METHODOLOGY (for reference) ===
This rubric combines industry best practices:
- Weighted rubric evaluation (HireSort, futurecraft.pro): each criterion scored 0-max with observable levels
- Context-aware matching (TopCV/Toppy AI): a skill in project/experience description > same skill in plain list
- Evidence-based scoring (ResumeWorded, NACE): each score must cite a specific phrase from the CV
- Student-oriented: no seniority expectation; values projects, internships, and learning signals
- Bias mitigation: evaluate content, not writing style; ignore university prestige, age, gender

=== RULES ===
- Score each component 0 to its max weight using the rubric levels below.
- For EACH component, provide a brief reason with a specific quote or evidence from the CV.
- 0 = no evidence found. Be critical. Do NOT inflate.
- Vague descriptions without evidence = lower score.
- Education/graduation requirements (e.g. "Graduated in IT", "Final year CS student") can be satisfied by the candidate's Education entries — check their major and degree level there.
- Return ONLY valid JSON.

Job Title: {{jobTitle}}
Requirements: {{requirements}}
Nice-to-Haves: {{niceToHaves}}

Weights:
{{weightsText}}

=== CANDIDATE PROFILE ===
Education: {{educations}}
Skills Listed: {{skills}}
About: {{about}}
Projects:
{{projects}}
Work Experience:
{{experiences}}
Certifications: {{certifications}}
CV Text Extract: {{cvExtract}}

=== SCORING RUBRIC ===

A1_REQUIRED (0-{{A1_REQUIRED}}) — Required Skills Match:
  - HIGH (75-100%): Candidate lists MOST required skills AND uses them in projects/internship descriptions (not just skill list)
  - MEDIUM (25-75%): Lists some skills but no demonstrated usage
  - LOW (1-25%): Mentions 1-2 skills vaguely
  - 0: No overlap
  Context matters: "React" in a project description > "React" in a comma-separated skill list.

A2_NICE (0-{{A2_NICE}}) — Nice-to-have Skills Match:
  Same scale as A1 based on percentage of nice-to-have skills matched.

A3_SKILL_DEPTH (0-{{A3_SKILL_DEPTH}}) — Skill Depth:
  - HIGH: Multiple skills demonstrated together in 1+ project (e.g. "Built React frontend with Node.js API and MongoDB")
  - MEDIUM: Skills mentioned in project descriptions but shallow
  - LOW: Skills appear only in the skill list, never in context
  - 0: No skills found

B1_MAJOR (0-{{B1_MAJOR}}) — Major / Education Fit:
  - MAX: Major is IT (CS, SE, IT, IS, Cybersecurity, Data Science, AI...) at any recognized school
  - MAX: Any major from a recognized IT-specialized Vietnamese university
  - HIGH: Related field (Math, Electronics, Telecommunications) at top IT school
  - HALF: Related field elsewhere, or non-IT major at IT school
  - LOW: Unrelated major at top IT school
  - 0: No relevant education found
  Vietnamese IT-specialized universities (Tier S): UIT, UET, PTIT, FPT, HUST,
  HCMUT, DUT, HCMUS, HUS, ACT, MTA, USTH

C1_PROJECT_COUNT (0-{{C1_PROJECT_COUNT}}) — Project Count:
  Count all: coursework projects, personal projects, team projects, hackathons.
  - MAX: 3+ projects with meaningful descriptions
  - 2 projects
  - 1 project
  - 0: No projects

C2_PROJECT_RELEVANCE (0-{{C2_PROJECT_RELEVANCE}}) — Project Relevance to Job:
  - HIGH: Project tech stack AND domain clearly match the job requirements
  - MEDIUM: Tech stack OR domain partially overlaps
  - LOW: Projects are unrelated
  - 0: No projects

C3_PROJECT_COMPLEXITY (0-{{C3_PROJECT_COMPLEXITY}}) — Project Complexity:
  For students, "complex" = real-world applicability, not pure CRUD:
  - HIGH: Deployed (live URL), uses CI/CD, Docker, team collaboration, or solves a real problem with measurable outcome
  - MEDIUM: Full-stack with API + database but local only
  - LOW: Simple CRUD, tutorial projects, basic scripts
  - 0: No projects

D_CERTIFICATIONS (0-{{D_CERTIFICATIONS}}) — Certifications:
  Consider the level/proficiency of each certification:
  - Language: TOEIC 950+ / IELTS 7.5+ → full score, TOEIC 850+ / IELTS 6.5+ → high, TOEIC 750+ / IELTS 6.0+ → medium, below → low
  - IT: Professional-level certs (AWS Certified, Google Professional, etc.) → high, entry-level (AWS Practitioner, etc.) → medium
  - MAX: 2+ relevant certifications at high/medium level; or 1 high-level + 1 medium
  - HALF: 1 relevant certification, or multiple low-relevance certs
  - LOW: Irrelevant or expired certifications
  - 0: None

E_EXPERIENCE (0-{{E_EXPERIENCE}}) — Internship & Work Experience:
  - MAX: 1+ IT internship with clear technical responsibilities described
  - MEDIUM: Freelance / part-time IT work, or internship without technical details
  - LOW: Non-IT work experience
  - 0: No experience

List which specific requirements from the job posting are found in the CV (skills AND education).
Check skills against the candidate's skill list, project tech stack, and work experience.
Check education/graduation requirements against the candidate's Education entries (major and degree).
Be precise — only mark as matched if actually present in the CV content.

Return JSON:
{
  "A1_REQUIRED": 0-{{A1_REQUIRED}}, "A1_REQUIRED_reason": "score with CV evidence quote",
  "A2_NICE": 0-{{A2_NICE}}, "A2_NICE_reason": "score with CV evidence quote",
  "A3_SKILL_DEPTH": 0-{{A3_SKILL_DEPTH}}, "A3_SKILL_DEPTH_reason": "list which skills are demonstrated vs just listed",
  "B1_MAJOR": 0-{{B1_MAJOR}}, "B1_MAJOR_reason": "degree and relevance",
  "C1_PROJECT_COUNT": 0-{{C1_PROJECT_COUNT}}, "C1_PROJECT_COUNT_reason": "count and brief description",
  "C2_PROJECT_RELEVANCE": 0-{{C2_PROJECT_RELEVANCE}}, "C2_PROJECT_RELEVANCE_reason": "how project tech aligns with job",
  "C3_PROJECT_COMPLEXITY": 0-{{C3_PROJECT_COMPLEXITY}}, "C3_PROJECT_COMPLEXITY_reason": "complexity signals found",
  "D_CERTIFICATIONS": 0-{{D_CERTIFICATIONS}}, "D_CERTIFICATIONS_reason": "which certs and relevance",
  "E_EXPERIENCE": 0-{{E_EXPERIENCE}}, "E_EXPERIENCE_reason": "type of experience and technical relevance",
{{customSectionsOutput}}
  "matched_skills": ["skill1", "skill2"],
  "missing_requirements": ["skill or education requirement not found in CV"],
  "missing_nice_to_haves": ["nice-to-have text not found in CV"],
  "strengths": ["top 2-3 candidate strengths from CV"],
  "weaknesses": ["top 2-3 gaps or concerns"],
  "reasoning": "2-3 sentence overall assessment"
}`;
