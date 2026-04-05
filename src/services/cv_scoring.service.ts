import OpenAI from "openai";
import { getOpenAI, getModel } from "@/utils/openai";
import jobRepository from "@/repositories/job.repository";
import studentRepository from "@/repositories/student.repository";
import applicationRepository from "@/repositories/application.repository";
import { supabase } from "@/config/supabase";
import skillMappingService from "@/services/skill_mapping.service";
import axios from "axios";
const pdfParse = require("pdf-parse");

const clamp = (value: number, max: number, min: number = 0): number => Math.min(Math.max(value, min), max);

/** Escape regex special characters in a string */
function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function recoverTruncatedJson(raw: string): any {
  // console.log(`[recoverTruncatedJson] Raw input (first 500 chars): ${raw.substring(0, 500)}`);

  // Step 1: Strip markdown fences
  let s = raw
    .replace(/^```(?:json)?[^\n]*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();

  // console.log(`[recoverTruncatedJson] After fence strip (first 500 chars): ${s.substring(0, 500)}`);

  // Step 2: Try parsing as-is first
  try {
    const match = s.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch (e: any) {
    // console.log(`[recoverTruncatedJson] Initial parse failed: ${e.message}`);
  }

  // Step 3: Recovery — fix common truncation issues
  // Remove trailing commas
  s = s.replace(/,\s*$/, "");
  // Fix hanging key with no value: "key": } or "key":\n}
  s = s.replace(/:\s*([,}\]])/g, ": null$1");
  // Fix hanging key at end of string: "key":
  s = s.replace(/:\s*$/, ": null");
  // Close unclosed arrays
  const openBrackets = (s.match(/\[/g) || []).length;
  const closeBrackets = (s.match(/\]/g) || []).length;
  for (let i = 0; i < openBrackets - closeBrackets; i++) s += "]";
  // Close unclosed objects
  const openBraces = (s.match(/\{/g) || []).length;
  const closeBraces = (s.match(/\}/g) || []).length;
  for (let i = 0; i < openBraces - closeBraces; i++) s += "}";
  // Remove trailing commas before ] or }
  s = s.replace(/,\s*([}\]])/g, "$1");

  // console.log(`[recoverTruncatedJson] After recovery (first 500 chars): ${s.substring(0, 500)}`);

  try {
    const match = s.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch (e: any) {
    // console.log(`[recoverTruncatedJson] Recovery parse also failed: ${e.message}`);
  }

  console.warn("[recoverTruncatedJson] All recovery attempts failed. Returning empty object.");
  return {};
}

/**
 * Scoring weights configuration.
 *
 * B2 (Course Mapping) is temporarily 0 because student_courses and
 * course_job_mappings tables don't exist yet. The 15 points are redistributed:
 * - A1: +7 (25 → 32)
 * - C2: +5 (10 → 15)
 * - D: +3 (10 → 13)
 *
 * When a student has 0 projects, the entire C category (25 points) is
 * redistributed to A1 (+10), B1 (+10), and E (+5) via getDynamicWeights().
 */
interface ScoringWeights {
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
}

/**
 * Scoring weights configuration according to Issue #6.
 *
 * When a student has 0 projects, the entire C category (20 points: C1=5, C2=10, C3=5) is
 * redistributed to A1 (+10), B1 (+5), and E (+5) via getDynamicWeights().
 */
interface ScoringWeights {
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
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  A1_REQUIRED: 30,
  A2_NICE: 10,
  A3_SKILL_DEPTH: 5,
  B1_MAJOR: 10,
  B2_COURSES: 15,
  C1_PROJECT_COUNT: 5,
  C2_PROJECT_RELEVANCE: 10,
  C3_PROJECT_COMPLEXITY: 5,
  D_CERTIFICATIONS: 5,
  E_EXPERIENCE: 5,
};

//When a student has 0 projects, the entire C category (20 points) is redistributed to A1 (+10), B1 (+5), and E (+5). This ensures the total always equals 100 without awarding "free" points.

function getDynamicWeights(hasProjects: boolean): ScoringWeights {
  if (hasProjects) {
    return { ...DEFAULT_WEIGHTS };
  }

  // 0 projects: redistribute C (5+10+5=20) to A1/B1/E
  return {
    ...DEFAULT_WEIGHTS,
    A1_REQUIRED: DEFAULT_WEIGHTS.A1_REQUIRED + 10,
    B1_MAJOR: DEFAULT_WEIGHTS.B1_MAJOR + 5,
    E_EXPERIENCE: DEFAULT_WEIGHTS.E_EXPERIENCE + 5,
    C1_PROJECT_COUNT: 0,
    C2_PROJECT_RELEVANCE: 0,
    C3_PROJECT_COMPLEXITY: 0,
  };
}

function verifyWeights(weights: ScoringWeights): void {
  const total =
    weights.A1_REQUIRED +
    weights.A2_NICE +
    weights.A3_SKILL_DEPTH +
    weights.B1_MAJOR +
    weights.B2_COURSES +
    weights.C1_PROJECT_COUNT +
    weights.C2_PROJECT_RELEVANCE +
    weights.C3_PROJECT_COMPLEXITY +
    weights.D_CERTIFICATIONS +
    weights.E_EXPERIENCE;

  if (total !== 100) {
    throw new Error(`Weight total is ${total}, expected 100!`);
  }
}

// ============================================================================
// PDF PARSING HELPER
// ============================================================================

/**
 * Robust helper to download and parse PDF/Text with fallback to OCR
 */
async function downloadAndParseCv(url: string): Promise<string> {
  try {
    const response = await axios.get(url, { responseType: "arraybuffer" });
    const dataBuffer = Buffer.from(response.data);
    const pdfData = await pdfParse(dataBuffer);
    let text = pdfData.text || "";

    // Fallback Strategy: If PDF is an image (no text), use OCR.space Free API
    if (text.trim().length < 50 && url.startsWith("http")) {
      try {
        // console.log("PDF appears to be an image. Booting OCR.space fallback...");
        const ocrUrl = `https://api.ocr.space/parse/imageurl?apikey=helloworld&url=${encodeURIComponent(url)}&language=eng&isOverlayRequired=false`;
        const ocrRes = await axios.get(ocrUrl);
        if (ocrRes.data && ocrRes.data.ParsedResults && ocrRes.data.ParsedResults.length > 0) {
          text = ocrRes.data.ParsedResults.map((r: any) => r.ParsedText).join("\n") || "";
          //   console.log("OCR successfully recovered missing text! Extracted characters:", text.length);
        }
      } catch (ocrErr: any) {
        console.warn("OCR.space fallback failed:", ocrErr.message);
      }
    }
    return text;
  } catch (err: any) {
    console.warn(`Failed to parse PDF from ${url}:`, err.message);
    return "";
  }
}

export class CvScoringService {
  /**
   * A1. Required Skills Match — 30đ (default) or 40đ (0-project fallback)
   * Uses multiple matching strategies:
   * 1. Direct word-boundary regex match
   * 2. Bidirectional skill↔requirement matching
   * 3. Normalized prefix-stripped matching (handles "Experience with X", "At least N years of Y")
   */
  private scoreRequiredSkills(
    candidateSkillNames: string[],
    jobRequirements: string[],
    maxScore: number,
  ): { score: number; matched: string[]; missing: string[] } {
    const candidateSkillStr = candidateSkillNames.join(" ").toLowerCase();
    const candidateSkillsLower = candidateSkillNames.map((s) => s.toLowerCase().trim());
    let matchedCount = 0;
    const matched: string[] = [];
    const missing: string[] = [];

    // Common prefixes in JD requirement sentences
    const sentencePrefixes = [
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

    for (const req of jobRequirements) {
      const reqLower = req.toLowerCase().trim();
      const escapedReq = escapeRegex(reqLower);

      // Strategy 1: Direct word-boundary match
      let hasMatch = new RegExp(`\\b${escapedReq}\\b`, "i").test(candidateSkillStr);

      // Strategy 2: Bidirectional matching
      if (!hasMatch) {
        hasMatch = candidateSkillNames.some((skill) => {
          const skillLower = skill.toLowerCase();
          const escapedSkill = escapeRegex(skillLower);

          if (new RegExp(`\\b${escapedReq}\\b`, "i").test(skillLower)) return true;

          if (reqLower.includes(" ")) {
            return new RegExp(`\\b${escapedSkill}\\b`, "i").test(reqLower) || reqLower.includes(skillLower);
          }
          return false;
        });
      }

      // Strategy 3: Strip common sentence prefixes and match the core skill name
      if (!hasMatch) {
        let strippedReq = reqLower;
        // Remove leading "at least N years" type patterns
        strippedReq = strippedReq.replace(
          /^at least \d+\+?\s*(years?|yrs?)\s*(of\s*)?(experience\s*)?(with\s*|in\s*)?/i,
          "",
        );
        for (const prefix of sentencePrefixes) {
          if (strippedReq.startsWith(prefix)) {
            strippedReq = strippedReq.slice(prefix.length).trim();
            break;
          }
        }
        strippedReq = strippedReq.replace(/[.,;:!?]+$/, "").trim();

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

    const score = jobRequirements.length > 0 ? (matchedCount / jobRequirements.length) * maxScore : maxScore; // No requirements → full score

    return { score: Math.round(score), matched, missing };
  }

  /**
   * A2. Nice-to-have Skills Match — 10đ
   * Uses multiple matching strategies:
   * 1. Direct word-boundary regex match
   * 2. Bidirectional skill↔requirement matching
   * 3. Normalized prefix-stripped matching (handles "Experience with X", "Knowledge of Y")
   */
  private scoreNiceToHave(
    candidateSkillNames: string[],
    jobNiceToHaves: string[],
    maxScore: number,
  ): { score: number; matched: string[]; missing: string[] } {
    const candidateSkillStr = candidateSkillNames.join(" ").toLowerCase();
    const candidateSkillsLower = candidateSkillNames.map((s) => s.toLowerCase().trim());
    let matchedCount = 0;
    const matched: string[] = [];
    const missing: string[] = [];

    // Common prefixes in nice-to-have sentences that wrap actual skill names
    const sentencePrefixes = [
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

    for (const req of jobNiceToHaves) {
      const reqLower = req.toLowerCase().trim();
      const escapedReq = escapeRegex(reqLower);

      // Strategy 1: Direct word-boundary match of full requirement in candidate skills
      let hasMatch = new RegExp(`\\b${escapedReq}\\b`, "i").test(candidateSkillStr);

      // Strategy 2: Bidirectional matching (same as A1)
      if (!hasMatch) {
        hasMatch = candidateSkillNames.some((skill) => {
          const skillLower = skill.toLowerCase();
          const escapedSkill = escapeRegex(skillLower);

          if (new RegExp(`\\b${escapedReq}\\b`, "i").test(skillLower)) return true;

          if (reqLower.includes(" ")) {
            return new RegExp(`\\b${escapedSkill}\\b`, "i").test(reqLower) || reqLower.includes(skillLower);
          }
          return false;
        });
      }

      // Strategy 3: Strip common sentence prefixes and match the core skill name
      if (!hasMatch) {
        let strippedReq = reqLower;
        for (const prefix of sentencePrefixes) {
          if (strippedReq.startsWith(prefix)) {
            strippedReq = strippedReq.slice(prefix.length).trim();
            break;
          }
        }
        // Also remove trailing punctuation
        strippedReq = strippedReq.replace(/[.,;:!?]+$/, "").trim();

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

    const score = jobNiceToHaves.length > 0 ? (matchedCount / jobNiceToHaves.length) * maxScore : maxScore; // No nice-to-haves → full score

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
      "công nghệ thông tin",
      "khoa học máy tính",
      "kỹ thuật phần mềm",
      "hệ thống thông tin",
      "an toàn thông tin",
      "mạng máy tính",
      "computer science",
      "software engineering",
      "information technology",
      "information systems",
      "cybersecurity",
      "data science",
    ];

    const relatedMajors = [
      "toán tin",
      "toán ứng dụng",
      "điện tử",
      "viễn thông",
      "kỹ thuật điện",
      "kỹ thuật điều khiển",
      "applied mathematics",
      "electronics",
      "telecommunications",
      "electrical engineering",
    ];

    for (const edu of educations) {
      const eduText = JSON.stringify(edu).toLowerCase();

      if (itMajors.some((kw) => eduText.includes(kw))) {
        return {
          score: maxScore,
          reason: `IT major: "${edu.degree || ""} - ${edu.field_of_study || ""}"`,
        };
      }

      if (relatedMajors.some((kw) => eduText.includes(kw))) {
        return {
          score: Math.round(maxScore * 0.6),
          reason: `Related field: "${edu.degree || ""} - ${edu.field_of_study || ""}"`,
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

    console.log(`[E] Experience scores: ${experienceDetails.join(", ")}`);
    console.log(`[E] Final score: ${bestScore}/${maxScore} (best of ${experiences.length} experiences)`);

    return { score: bestScore, details: experienceDetails.join("; ") || "No IT-related experience" };
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

    let demonstratedCount = 0;

    candidateSkillNames.forEach((skill) => {
      const escapedSkill = escapeRegex(skill.toLowerCase());
      const regex = new RegExp(`\\b${escapedSkill}\\b`, "i");

      const usedInProjects = projects.some(
        (p) => regex.test(p.description || "") || regex.test((p.technologies || []).join(" ")),
      );

      const usedInExperience = experiences.some((exp) => regex.test(exp.description || ""));

      if (usedInProjects || usedInExperience) {
        demonstratedCount++;
      }
    });

    // Award maxScore if at least 50% of listed skills have demonstrated usage
    return demonstratedCount >= candidateSkillNames.length * 0.5 ? maxScore : 0;
  }

  /**
   * C3. Project Complexity — 5đ
   * Keyword detection for complex project traits vs simple homework.
   */
  private scoreProjectComplexity(projects: any[], maxScore: number): number {
    if (!projects || projects.length === 0) return 0;

    const complexityKeywords = [
      "deploy",
      "production",
      "live",
      "rest api",
      "api",
      "microservice",
      "ci/cd",
      "pipeline",
      "docker",
      "kubernetes",
      "aws",
      "azure",
      "gcp",
      "team",
      "collaborate",
      "agile",
      "scrum",
      "github",
      "git",
      "database",
      "postgresql",
      "mongodb",
      "redis",
      "authentication",
      "authorization",
      "oauth",
      "jwt",
      "payment",
      "stripe",
    ];

    const basicKeywords = ["exercise", "tutorial", "homework", "assignment", "lab", "practice"];

    const projectText = projects
      .map((p) => `${p.name} ${p.description || ""} ${(p.technologies || []).join(" ")}`)
      .join(" ")
      .toLowerCase();

    const hasAdvancedKeywords = complexityKeywords.some((kw) => projectText.includes(kw));
    const hasBasicKeywords = basicKeywords.some((kw) => projectText.includes(kw));

    if (hasAdvancedKeywords) {
      return maxScore;
    } else if (hasBasicKeywords) {
      return 2;
    } else if (projects.some((p) => p.description && p.description.trim().length > 0)) {
      return 3;
    }
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

    for (const cert of certifications) {
      const certText = `${cert.name} ${cert.organization} ${cert.description || ""}`.toLowerCase();

      // Direct match
      if (
        jobRequirements.some((req) => cert.name.toLowerCase().includes(req.toLowerCase())) ||
        jobSkillNames.some((skill) => cert.name.toLowerCase().includes(skill.toLowerCase()))
      ) {
        certScore = maxScore;
        break; // max score achieved, stop checking
      }

      // Indirect match
      if (
        jobRequirements.concat(jobSkillNames).some((req) => {
          if (req.length <= 4) return false; // avoid noise from short acronyms
          return certText.includes(req.toLowerCase());
        })
      ) {
        certScore = Math.max(certScore, Math.round(maxScore * 0.5)); // Half points
      }
    }

    return certScore;
  }

  /**
   * C2. Project Relevance — 10đ
   * Uses OpenAI to score project relevance to the job.
   */
  private async scoreProjectRelevance(
    job: any,
    projects: any[],
    maxScore: number,
  ): Promise<{ score: number; details: string }> {
    if (!projects || projects.length === 0) return { score: 0, details: "No projects" };
    if (!job.title) return { score: 0, details: "Missing job title" };

    const prompt = `
You are evaluating how relevant a candidate's projects are to a job opening.

Job Title: ${job.title}
Job Description: ${job.description || "N/A"}
Job Requirements: ${(job.requirement || job.requirements || []).join(", ")}

Candidate's Projects:
${projects
  .map(
    (p, i) => `
Project ${i + 1}: ${p.name}
Description: ${p.description || "No description"}
Technologies: ${(p.technologies || []).join(", ")}
`,
  )
  .slice(0, 5)
  .join("\n")}

For each project, return a relevance score (0-10):
- 0: Completely unrelated to job
- 5: Somewhat related (shares some skills/technologies)
- 10: Highly relevant (directly demonstrates job-required skills)

Return JSON:
{
  "projects": [
    { "project_index": 1, "relevance_score": 8, "reason": "Uses React and Node.js which are required" }
  ]
}
    `.trim();

    const openaiInstance = getOpenAI();
    if (!openaiInstance) return { score: 0, details: "AI not available" };

    try {
      const response = await openaiInstance.chat.completions.create({
        model: getModel(),
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 4096,
      });

      const rawContent = response.choices[0]?.message?.content || "{}";

      const parsed = recoverTruncatedJson(rawContent) as { projects: any[] };

      const projectScores = parsed.projects || [];
      if (projectScores.length === 0) return { score: 0, details: "AI returned no project scores" };

      let bestScore = 0;
      let reasons: string[] = [];

      projectScores.forEach((ps: any) => {
        const sc = ps.relevance_score || 0;
        const normalizedScore = (sc / 10) * maxScore;
        if (normalizedScore > bestScore) {
          bestScore = normalizedScore;
        }
        reasons.push(`P${ps.project_index}: ${sc}/10 (${ps.reason})`);
      });

      return {
        score: Math.round(bestScore),
        details: reasons.join(" | "),
      };
    } catch (err: any) {
      console.warn("OpenAI project relevance extraction failed:", err.message);
      return { score: 0, details: "AI extraction failed" };
    }
  }

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

    // --- 5. AI Scan for Candidate's Common Skills & Categories ---
    let aiExtractedSkillIds: number[] = [];
    let cvText = `
--- CANDIDATE TEXT PROFILES ---
About: ${(student as any)?.about || "N/A"}
Experiences: ${experiences.map((e) => `${e.position} ${e.description}`).join(" ")}
Projects: ${projects.map((p) => `${p.name} ${p.description}`).join(" ")}
Platform Explicit Skills: ${expandedCandidateSkills.join(", ")}

--- RAW PDF RESUME EXTRACT (CRITICAL PRIORITY) ---
${pdfText.substring(0, 10000)}
--- END PDF RESUME ---
    `.trim();

    const openaiInstance = getOpenAI();

    if (openaiInstance && cvText.length > 20 && commonSkills.length > 0) {
      const skillNamesList = commonSkills.map((s) => s.name).join(", ");
      const prompt =
        `Analyze this CV. Return JSON with: skills (from the valid list only, match synonyms), extracted_major (string or null), experience_level ("internship"|"full-time"|"part-time"|"freelance"|"none"), has_it_cert (boolean).

Candidate Data:
${cvText.substring(0, 5000)}

Valid Skills (use EXACT names): ${skillNamesList}

Return: {"skills":["..."],"extracted_major":"...","experience_level":"...","has_it_cert":false}`.trim();

      try {
        const response = await openaiInstance.chat.completions.create({
          model: getModel(),
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0.1,
          max_tokens: 4096,
        });

        const rawContent = response.choices[0]?.message?.content || "{}";
        const finishReason = response.choices[0]?.finish_reason;
        if (finishReason === "length") {
          console.warn("[CV Scoring] AI response truncated (finish_reason=length). Partial results may be returned.");
        }

        // Robust JSON recovery
        const parsed = recoverTruncatedJson(rawContent);
        const extractedNames: string[] = Array.isArray(parsed.skills)
          ? parsed.skills.filter((s: any) => typeof s === "string")
          : [];

        if (educations.length === 0) {
          // console.log(
          //   `[CV Scoring Diagnostics] Educations array is empty. AI returned major: ${parsed.extracted_major}`,
          // );
          if (parsed.extracted_major) {
            educations.push({ degree: "AI Extracted", field_of_study: parsed.extracted_major });
            // console.log(`[CV Scoring Diagnostics] -> Successfully injected major!`);
          }
        }

        if (experiences.length === 0) {
          // console.log(
          //   `[CV Scoring Diagnostics] Experiences array is empty. AI returned experience_level: ${parsed.experience_level}`,
          // );
          if (parsed.experience_level && parsed.experience_level !== "none") {
            experiences.push({
              position: "AI Extracted Role",
              company: "CV Reference",
              description: parsed.experience_level,
            });
            // console.log(`[CV Scoring Diagnostics] -> Successfully injected experience!`);
          }
        }

        if (certifications.length === 0 && parsed.has_it_cert) {
          certifications.push({ name: "AI Extracted IT Certification" });
          // console.log(`[CV Scoring Diagnostics] -> Successfully injected certification!`);
        }

        aiExtractedSkillIds = extractedNames
          .map((name) => {
            const match = commonSkills.find((cs) => cs.name.toLowerCase() === name.toLowerCase().trim());
            return match?.id ?? null;
          })
          .filter((id): id is number => id !== null);

        // console.log(`[CV Scoring] AI extracted names: [${extractedNames.join(", ")}]`);
        // console.log(`[CV Scoring] Mapped to ${aiExtractedSkillIds.length} skill IDs (finish_reason: ${finishReason}).`);
      } catch (err: any) {
        console.warn("OpenAI common_skills extraction failed:", err.message);

        // FALLBACK: Try a simpler skills-only prompt
        try {
          // console.log("[CV Scoring] Attempting fallback with skills-only prompt...");
          const fallbackPrompt = `Extract skills from this CV. Return JSON: {"skills":["..."]}. Only use names from this list: ${skillNamesList}\n\nCV:\n${cvText.substring(0, 5000)}`;
          const fallbackResponse = await openaiInstance.chat.completions.create({
            model: getModel(),
            messages: [{ role: "user", content: fallbackPrompt }],
            response_format: { type: "json_object" },
            temperature: 0.1,
            max_tokens: 2048,
          });
          const fallbackRaw = fallbackResponse.choices[0]?.message?.content || "{}";
          const fallbackParsed = recoverTruncatedJson(fallbackRaw);
          const fallbackNames: string[] = Array.isArray(fallbackParsed.skills)
            ? fallbackParsed.skills.filter((s: any) => typeof s === "string")
            : [];

          aiExtractedSkillIds = fallbackNames
            .map((name) => {
              const match = commonSkills.find((cs) => cs.name.toLowerCase() === name.toLowerCase().trim());
              return match?.id ?? null;
            })
            .filter((id): id is number => id !== null);

          // console.log(
          //   `[CV Scoring] Fallback extracted ${fallbackNames.length} names, mapped to ${aiExtractedSkillIds.length} IDs.`,
          // );
        } catch (fallbackErr: any) {
          console.warn("[CV Scoring] Fallback extraction also failed:", fallbackErr.message);
        }
      }
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
    const weights = getDynamicWeights(hasProjects);
    verifyWeights(weights);

    // console.log(
    //   `[CV Scoring] Weights: hasProjects=${hasProjects}, A1=${weights.A1_REQUIRED}, B1=${weights.B1_MAJOR}, C2=${weights.C2_PROJECT_RELEVANCE}, D=${weights.D_CERTIFICATIONS}, E=${weights.E_EXPERIENCE}`,
    // );

    // --- 8. Score Each Component ---

    // A1. Required Skills Match
    const jobRequirements = [...(job.requirement || []), ...expandedJobSkills].filter(Boolean);
    const a1Result = this.scoreRequiredSkills(candidateSkillNames, jobRequirements, weights.A1_REQUIRED);
    const a1Score = clamp(a1Result.score, weights.A1_REQUIRED);

    // A2. Nice-to-have Match
    const jobNice = job.nice_to_haves || [];
    const a2Result = this.scoreNiceToHave(candidateSkillNames, jobNice, weights.A2_NICE);
    const a2Score = clamp(a2Result.score, weights.A2_NICE);

    // A3. Skill Depth Bonus
    const a3Score = this.scoreSkillDepth(candidateSkillNames, projects, experiences, weights.A3_SKILL_DEPTH);

    // B1. Major/Field Match
    const b1Result = this.scoreMajor(educations, weights.B1_MAJOR);
    const b1Score = clamp(b1Result.score, weights.B1_MAJOR);

    // B2. Course Mapping — temporary logic
    // If student has IT major (b1Score === weights.B1_MAJOR), give full 15 points
    const b2Score = b1Score === weights.B1_MAJOR ? weights.B2_COURSES : 0;

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
      console.error(`[CV Scoring] BUG: Component sum ${componentSum} exceeds 100! Clamping applied.`);
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
      console.error("Failed to persist score to db", dbError);
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
        ai_extraction_ran: openaiInstance !== null && cvText.length > 20 && commonSkills.length > 0,
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
  ) {
    const note = !hasProjects ? "Weight increased due to 0 projects" : undefined;
    const projectNote = !hasProjects ? "No projects — weight redistributed to A1/B1/E" : undefined;

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
        courses: {
          score: scores.b2,
          max: weights.B2_COURSES,
          note: "Temporary logic: full points if IT major",
        },
        total: {
          score: scores.b1 + scores.b2,
          max: weights.B1_MAJOR + weights.B2_COURSES,
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
      metadata: {
        total_score:
          scores.a1 +
          scores.a2 +
          scores.a3 +
          scores.b1 +
          scores.b2 +
          scores.c1 +
          scores.c2 +
          scores.c3 +
          scores.d +
          scores.e,
        total_max: 100,
        dynamic_weights_applied: !hasProjects,
        weight_adjustments: !hasProjects
          ? [
              `A1: ${DEFAULT_WEIGHTS.A1_REQUIRED} → ${weights.A1_REQUIRED} (+${weights.A1_REQUIRED - DEFAULT_WEIGHTS.A1_REQUIRED})`,
              `B1: ${DEFAULT_WEIGHTS.B1_MAJOR} → ${weights.B1_MAJOR} (+${weights.B1_MAJOR - DEFAULT_WEIGHTS.B1_MAJOR})`,
              `E: ${DEFAULT_WEIGHTS.E_EXPERIENCE} → ${weights.E_EXPERIENCE} (+${weights.E_EXPERIENCE - DEFAULT_WEIGHTS.E_EXPERIENCE})`,
            ]
          : [],
      },
    };
  }
}

export default new CvScoringService();
