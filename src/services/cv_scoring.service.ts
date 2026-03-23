import OpenAI from "openai";
import jobRepository from "@/repositories/job.repository";
import studentRepository from "@/repositories/student.repository";
import applicationRepository from "@/repositories/application.repository";
import { supabase } from "@/config/supabase";
import skillMappingService from "@/services/skill_mapping.service";

let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export class CvScoringService {
  async scoreApplication(applicationId: number) {
    // 1. Fetch Application
    const application = await applicationRepository.findOne({ id: applicationId });
    if (!application) throw new Error("Application not found");

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
    let skills: string[] = [];

    if (student) {
      skills = (student as any).skills || [];
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
    const allReqs = [...jobSkillNames, ...(job.requirement || []), ...(job.nice_to_haves || [])].filter(Boolean);

    console.log(`Job: "${job.title}" (ID: ${jobId})`);
    console.log(`Candidate skills (raw): [${skills.join(", ")}]`);
    console.log(`JD skill names: [${jobSkillNames.join(", ")}]`);
    console.log(`All requirements (${allReqs.length}): [${allReqs.join(" | ")}]`);

    const expandedCandidateSkills = await skillMappingService.expandSkills(skills);
    const expandedJobSkills = await skillMappingService.expandSkills(jobSkillNames);

    console.log(`   Candidate skills expanded: [${expandedCandidateSkills.join(", ")}]`);
    console.log(`   JD skills expanded: [${expandedJobSkills.join(", ")}]`);

    const expandedCandidateStr = expandedCandidateSkills.join(" ").toLowerCase();
    const matched: string[] = [];
    const missing: string[] = [];

    for (const req of allReqs) {
      const reqLower = req.toLowerCase();
      if (expandedCandidateStr.includes(reqLower)) {
        matched.push(req);
        console.log(`MATCHED (string): "${req}"`);
        continue;
      }
      const matchedStudentSkill = expandedCandidateSkills.find((s: string) => {
        const skillToken = s.toLowerCase().trim();
        if (skillToken.length <= 1) return new RegExp(`\\b${skillToken}\\b`, "i").test(reqLower);
        return reqLower.includes(skillToken);
      });
      if (matchedStudentSkill) {
        matched.push(req);
        console.log(`MATCHED (token "${matchedStudentSkill}" in): "${req}"`);
        continue;
      }
      const reqExpanded = await skillMappingService.expandSkills([req]);
      const hasOverlap = reqExpanded.some((r) => expandedCandidateSkills.includes(r));
      if (hasOverlap) {
        matched.push(req);
        console.log(`MATCHED (synonym overlap): "${req}"`);
      } else {
        missing.push(req);
        console.log(`MISSING: "${req}"`);
      }
    }

    const skillScoreRaw = allReqs.length > 0 ? matched.length / allReqs.length : 1;
    const skillScore = skillScoreRaw * 40; // Up to 40 points
    console.log(`Skill Score: ${matched.length}/${allReqs.length} matched = ${skillScore.toFixed(1)}/40`);

    let positionScore = 0;
    let positionReason = "No job title";
    if (job.title) {
      const jobTitleTokens = job.title
        .toLowerCase()
        .split(/\s+/)
        .filter((t: string) => t.length > 2 && !["developer", "engineer", "staff", "nhân", "viên"].includes(t));

      for (const exp of experiences) {
        const expTitle = (exp.position || "").toLowerCase();
        if (jobTitleTokens.length > 0 && jobTitleTokens.some((token: string) => expTitle.includes(token))) {
          positionScore = 10;
          positionReason = `Candidate position "${exp.position}" matches job title tokens [${jobTitleTokens.join(", ")}]`;
          break;
        } else if (jobTitleTokens.length === 0) {
          positionScore = 5;
          positionReason = "Job title is purely generic — partial credit";
          break;
        }
      }
      if (positionScore === 0) {
        positionReason = `No candidate position matched job title tokens [${jobTitleTokens.join(", ")}]. Candidate positions: [${experiences.map((e: any) => e.position || "N/A").join(", ")}]`;
      }
    }

    let educationScore = 0;
    let educationReason = "No IT-related education found";
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
        educationScore = 10;
        educationReason = `Matched: "${edu.degree || ""} - ${edu.field_of_study || ""}"`;
        break;
      }
    }
    if (educations.length === 0) educationReason = "No education records";

    let yoeScore = 0;
    let candidateYoE = 0;
    for (const exp of experiences) {
      if (exp.start_date) {
        const start = new Date(exp.start_date);
        const end = exp.end_date ? new Date(exp.end_date) : new Date();
        const diffMs = Math.max(0, end.getTime() - start.getTime());
        const years = diffMs / (1000 * 60 * 60 * 24 * 365.25);
        candidateYoE += years;
      }
    }

    let requiredYoE = 0;
    const reqStr = allReqs.join(" ").toLowerCase();
    const yoeMatch = reqStr.match(/(\d+)\s*(?:-|to)?\s*(?:\d+)?\s*(year|năm|yr)/i);
    if (yoeMatch && yoeMatch[1]) {
      requiredYoE = parseInt(yoeMatch[1], 10);
    } else if (reqStr.includes("fresher") || reqStr.includes("entry") || reqStr.includes("intern")) {
      requiredYoE = 0;
    } else if ((job as any).experience && typeof (job as any).experience === "string") {
      const jobExpFieldMatch = ((job as any).experience as string).match(/(\d+)/);
      if (jobExpFieldMatch && jobExpFieldMatch[1]) requiredYoE = parseInt(jobExpFieldMatch[1], 10);
    }

    if (requiredYoE === 0) {
      yoeScore = 10;
    } else if (candidateYoE >= requiredYoE) {
      yoeScore = 10;
    } else if (candidateYoE > 0) {
      yoeScore = Math.min(10, Math.round((candidateYoE / requiredYoE) * 10));
    }
    let extractedKeywords = "";
    if (openai && (experiences.length > 0 || projects.length > 0)) {
      const extractionContext = `
                Experiences: ${experiences.map((e) => `${e.position} ${e.description}`).join(" ")}
                Projects: ${projects.map((p) => `${p.name} ${p.description}`).join(" ")}
            `;
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: `Extract a raw space-separated list of ONLY the technical skills, tools, and languages from this text. No pleasantries. Text: ${extractionContext}`,
            },
          ],
          temperature: 0.1,
        });
        extractedKeywords = response.choices[0]?.message?.content || "";
      } catch (err: any) {
        console.warn("OpenAI API error. Standardizing to Explicit Skills.", err.message);
      }
    }

    const combinedKeywords = `${skills.join(" ")} ${extractedKeywords}`.trim();

    let ftsRank = 0;
    if (combinedKeywords.length > 0) {
      const { data, error } = await supabase.rpc("match_cv_score", {
        target_job_id: jobId,
        search_keywords: combinedKeywords,
      });
      if (!error && typeof data === "number") {
        ftsRank = data;
      }
    }

    const contextScore = Math.min(ftsRank * 15, 30);
    console.log(
      `OpenAI extracted keywords: "${extractedKeywords || "(none — OpenAI skipped or no experiences/projects)"}"`,
    );
    console.log(`Combined search keywords: "${combinedKeywords.substring(0, 150)}..."`);

    // Final Aggregate
    const finalScore = Math.min(100, Math.round(skillScore + positionScore + educationScore + yoeScore + contextScore));

    console.log(`Skills:    ${skillScore.toFixed(1)}/40`);
    console.log(`Position:  ${positionScore}/10`);
    console.log(`Education: ${educationScore}/10`);
    console.log(`YoE:       ${yoeScore}/10`);
    console.log(`Context:   ${contextScore}/30`);
    console.log(`================================================\n`);

    let analysis = "";
    if (finalScore >= 80) {
      analysis =
        "Excellent candidate! The profile demonstrates strong alignment with required skills, excellent relevant experience, and meets technical background requirements flawlessly.";
    } else if (finalScore >= 55) {
      analysis =
        "Solid match. The candidate possesses a fair portion of the required skills and their education/experience maps moderately to the role's expectations.";
    } else if (finalScore >= 35) {
      analysis =
        "Partial match. The candidate meets some base criteria but likely lacks the necessary duration of experience, specific required skills, or explicit relevancy in their background.";
    } else {
      analysis =
        "Low match. The candidate's listed skills, education field, and historical positions do not align well with the core requirements of this specific role.";
    }

    return {
      score: finalScore,
      matched_skills: matched,
      missing_requirements: missing,
      analysis: analysis,
      score_breakdown: {
        skills: {
          score: Math.round(skillScore * 10) / 10,
          max: 40,
          matched_count: matched.length,
          total_count: allReqs.length,
        },
        position: { score: positionScore, max: 10, reason: positionReason },
        education: { score: educationScore, max: 10, reason: educationReason },
        yoe: {
          score: yoeScore,
          max: 10,
          candidate_years: Math.round(candidateYoE * 10) / 10,
          required_years: requiredYoE,
        },
        context_fts: { score: contextScore, max: 30, fts_rank: ftsRank },
      },
      debug: {
        candidate_skills_raw: skills,
        candidate_skills_expanded: expandedCandidateSkills,
        jd_skills_expanded: expandedJobSkills,
        openai_extracted_keywords: extractedKeywords || null,
        combined_search_keywords: combinedKeywords,
      },
    };
  }
}

export default new CvScoringService();
