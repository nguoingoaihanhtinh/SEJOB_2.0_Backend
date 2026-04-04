import OpenAI from "openai";
import jobRepository from "@/repositories/job.repository";
import studentRepository from "@/repositories/student.repository";
import applicationRepository from "@/repositories/application.repository";
import { supabase } from "@/config/supabase";
import skillMappingService from "@/services/skill_mapping.service";
import axios from "axios";
const pdfParse = require("pdf-parse");

function getOpenAI() {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  return new OpenAI({
    baseURL: process.env.OPENROUTER_API_KEY ? "https://openrouter.ai/api/v1" : undefined,
    apiKey: apiKey,
    defaultHeaders: process.env.OPENROUTER_API_KEY
      ? {
          "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "http://localhost:3000",
          "X-Title": process.env.OPENROUTER_SITE_NAME || "SEJob-Recruiter-AI",
        }
      : undefined,
  });
}

export class CvScoringService {
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

    // 2. Fetch Job details
    const { job } = await jobRepository.findOne(jobId);

    // 3. Fetch Student (CV Data)
    const student = await studentRepository.findByUserId(userId);
    let educations: any[] = [];
    let experiences: any[] = [];
    let projects: any[] = [];
    let explicitStudentSkills: string[] = [];

    if (student) {
      explicitStudentSkills = (student as any).skills || [];
      const [eduRes, expRes, projRes] = await Promise.all([
        supabase.from("educations").select("*").eq("student_id", student.id),
        supabase.from("experiences").select("*").eq("student_id", student.id),
        supabase.from("projects").select("*").eq("student_id", student.id),
      ]);
      educations = eduRes.data || [];
      experiences = expRes.data || [];
      projects = projRes.data || [];
    }

    const jobSkillNames = (job.skills || []).map((s: any) => s.name);

    // Retain user's custom synonym expansion
    const expandedCandidateSkills = await skillMappingService.expandSkills(explicitStudentSkills);
    const expandedJobSkills = await skillMappingService.expandSkills(jobSkillNames);

    // --- 4. Load Common Skills for Extraction ---
    let pdfText = "";
    let cvUrl = application.resume_url;

    if (!cvUrl && student?.id) {
       const { data: cvData } = await supabase.from('cv').select('filepath').eq('studentid', student.id).order('createdat', { ascending: false }).limit(1).single();
       cvUrl = cvData?.filepath;
    }

    const downloadAndParse = async (url: string) => {
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      const dataBuffer = Buffer.from(response.data);
      const pdfParse = require('pdf-parse');
      const pdfData = await pdfParse(dataBuffer);
      let text = pdfData.text || "";

      // Fallback Strategy: If PDF is an image (no text), use OCR.space Free API
      if (text.trim().length < 50 && url.startsWith("http")) {
         try {
             console.log("PDF appears to be an image. Booting OCR.space fallback...");
             const ocrUrl = `https://api.ocr.space/parse/imageurl?apikey=helloworld&url=${encodeURIComponent(url)}&language=eng&isOverlayRequired=false`;
             const ocrRes = await axios.get(ocrUrl);
             if (ocrRes.data && ocrRes.data.ParsedResults && ocrRes.data.ParsedResults.length > 0) {
                 text = ocrRes.data.ParsedResults.map((r: any) => r.ParsedText).join("\n") || "";
                 console.log("OCR successfully recovered missing text! Extracted characters:", text.length);
             }
         } catch (ocrErr: any) {
             console.warn("OCR.space fallback failed:", ocrErr.message);
         }
      }

      return text;
    };

    if (cvUrl && cvUrl.toLowerCase().endsWith(".pdf")) {
      try {
        pdfText = await downloadAndParse(cvUrl);
      } catch (err: any) {
        console.warn(`Failed to parse PDF from ${cvUrl}:`, err.message);
        if (application.resume_url && student?.id) {
          const { data: cvData } = await supabase.from('cv').select('filepath').eq('studentid', student.id).order('createdat', { ascending: false }).limit(1).single();
          if (cvData?.filepath && cvData.filepath !== cvUrl) {
            try {
              pdfText = await downloadAndParse(cvData.filepath);
              console.log("Successfully parsed fallback CV from cv table.");
            } catch (fallbackErr: any) {
              console.warn(`Fallback CV also failed:`, fallbackErr.message);
            }
          }
        }
      }
    }

    const { data: commonSkillsPayload } = await supabase.from("common_skills").select("*");
    const commonSkills = commonSkillsPayload || [];

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
      const prompt = `
You are a highly detailed CV Extraction specialist. Your task is to extract EVERY skill the candidate possesses that matches our predefined list.

# CONTEXT:
We have a master list of valid skills. You must match strings from the candidate's CV to these skills.
Be sensitive to synonyms (e.g., "React.js" matches "React", "ASP.NET Core" matches ".NET").

# INSTRUCTIONS:
1. Thoroughly analyze the "RAW PDF RESUME EXTRACT" provided below. It is high priority.
2. Cross-reference every sentence and word with the "Valid Skills" list.
3. Return a JSON object with a "skill_ids" key containing a flat array of IDs.
4. DO NOT be lazy. If the text mentions "Java", you MUST include the ID for Java. If it mentions "C#", you MUST include the ID for C#.

Valid Skills:
${commonSkills.map((s) => `ID: ${s.id}, Name: ${s.name}`).join("\n")}

Candidate Data:
${cvText}

Output EXTRACTLY as JSON:
{ "skill_ids": [id1, id2, ...] }
            `;

      try {
        const response = await openaiInstance.chat.completions.create({
          model: process.env.OPENROUTER_API_KEY ? "qwen/qwen-2.5-coder-32b-instruct" : "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0.1,
        });
        const parsed = JSON.parse(response.choices[0]?.message?.content || "{}");
        aiExtractedSkillIds = parsed.skill_ids || [];
      } catch (err: any) {
        console.warn("OpenAI common_skills extraction failed:", err.message);
      }
    }

    const explicitSkillIds = commonSkills
      .filter((cs) => expandedCandidateSkills.some((s) => s.toLowerCase() === cs.name.toLowerCase()))
      .map((cs) => cs.id);

    const allCandidateSkillIds = Array.from(new Set([...explicitSkillIds, ...aiExtractedSkillIds]));
    const candidateSkillNames = allCandidateSkillIds
      .map((id) => commonSkills.find((s) => s.id === id)?.name)
      .filter(Boolean) as string[];

    // --- 6. Bulk Insert candidate_skills to DB ---
    if (allCandidateSkillIds.length > 0) {
      const inserts = allCandidateSkillIds.map((id) => ({
        candidate_id: userId,
        common_skill_id: id,
      }));
      await supabase.from("candidate_skills").upsert(inserts, { onConflict: "candidate_id, common_skill_id" });
    }

    // --- 7. Apply 4-Tier User Weighted Scoring (60 / 20 / 10 / 10) ---
    const SCORING_WEIGHTS = { REQUIRED: 60, NICE: 20, CATEGORY: 10, EDUCATION: 10 };
    const candidateSkillStr = candidateSkillNames.join(" ").toLowerCase();

    let matchedReqs: string[] = [];
    let missingReqs: string[] = [];

    // A. Required Skill Match (60%)
    let reqScore = 0;
    const jobRequirements = [...(job.requirement || []), ...expandedJobSkills].filter(Boolean);
    if (jobRequirements.length > 0) {
      let requiredMatched = 0;
      for (const req of jobRequirements) {
        const reqLower = req.toLowerCase();
        if (
          candidateSkillStr.includes(reqLower) ||
          candidateSkillNames.some((skill) => reqLower.includes(skill.toLowerCase()))
        ) {
          requiredMatched++;
          matchedReqs.push(req);
        } else {
          missingReqs.push(req);
        }
      }
      reqScore = (requiredMatched / jobRequirements.length) * SCORING_WEIGHTS.REQUIRED;
    } else {
      reqScore = SCORING_WEIGHTS.REQUIRED;
    }

    // B. Nice-to-have Match (20%)
    let niceScore = 0;
    const jobNice = job.nice_to_haves || [];
    if (jobNice.length > 0) {
      let niceMatched = 0;
      for (const req of jobNice) {
        const reqLower = req.toLowerCase();
        if (
          candidateSkillStr.includes(reqLower) ||
          candidateSkillNames.some((skill) => reqLower.includes(skill.toLowerCase()))
        ) {
          niceMatched++;
          matchedReqs.push(req);
        } else {
          missingReqs.push(req);
        }
      }
      niceScore = (niceMatched / jobNice.length) * SCORING_WEIGHTS.NICE;
    } else {
      niceScore = SCORING_WEIGHTS.NICE;
    }

    // C. Category Match (10%)
    let categoryScore = 0;
    const jobCategories = (job.categories || []).map((c: any) => c.name?.toLowerCase());

    let hasMatchingCategory = false;
    for (const cat of jobCategories) {
      if (
        commonSkills.some(
          (cs) => allCandidateSkillIds.includes(cs.id) && cs.category && cs.category.toLowerCase() === cat,
        )
      ) {
        hasMatchingCategory = true;
        break;
      }
    }
    if (hasMatchingCategory || jobCategories.length === 0) {
      categoryScore = SCORING_WEIGHTS.CATEGORY;
    }

    // D. Education Match (10%)
    let educationScore = 0;
    let educationReason = "No relevant IT education found";
    const itKeywords = [
      "computer",
      "information technology",
      "software",
      "it",
      "programming",
      "công nghệ thông tin",
      "khoa học máy tính",
      "kỹ thuật phần mềm",
    ];
    for (const edu of educations) {
      const eduText = `${edu.degree || ""} ${edu.field_of_study || ""}`.toLowerCase();
      if (itKeywords.some((kw) => eduText.includes(kw))) {
        educationScore = SCORING_WEIGHTS.EDUCATION;
        educationReason = `Matched: "${edu.degree || ""} - ${edu.field_of_study || ""}"`;
        break;
      }
    }

    // 8. Construct Final Score & Persist
    const finalScore = Math.min(100, Math.round(reqScore + niceScore + categoryScore + educationScore));

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

    const breakdown = {
      required_score: { score: Math.round(reqScore), max: SCORING_WEIGHTS.REQUIRED },
      nice_to_have_score: { score: Math.round(niceScore), max: SCORING_WEIGHTS.NICE },
      category_score: { score: Math.round(categoryScore), max: SCORING_WEIGHTS.CATEGORY },
      education_score: { score: Math.round(educationScore), max: SCORING_WEIGHTS.EDUCATION, reason: educationReason },
    };

    try {
      await supabase
        .from("applications")
        .update({
          cv_score: finalScore,
          cv_analysis: analysis,
          cv_matched_skills: candidateSkillNames,
          cv_missing_requirements: missingReqs,
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
      missing_requirements: missingReqs,
      analysis: analysis,
      score_breakdown: breakdown,
      debug: {
        candidate_skills_expanded: expandedCandidateSkills,
        jd_skills_expanded: expandedJobSkills,
        openai_common_skills_extracted: candidateSkillNames,
      },
      is_cached: false,
    };
  }
}

export default new CvScoringService();
