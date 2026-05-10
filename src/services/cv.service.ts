import { CreateCvDTO, UpdateCvDTO } from "@/dtos/student/Cv.dto";
import CVRepository from "@/repositories/cv.repository";

import { NotFoundError, BadRequestError } from "@/utils/errors";
import { MessageUtil } from "@/utils/MessageUtil";
import { downloadAndParseCv } from "@/utils/cv-parser";
import { getOpenAI, getModel } from "@/utils/openai";
import { recoverTruncatedJson } from "@/utils/json-recovery";

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

  async extractData(fileUrl: string) {
    const pdfText = await downloadAndParseCv(fileUrl);
    if (!pdfText) {
      throw new Error("Could not parse text from the provided CV.");
    }

    const prompt = `
Extract the following information from the provided CV/resume and return ONLY a valid JSON object.
Do not wrap it in \`\`\`json blocks.
Use EXACTLY the following JSON schema:
{
  "phone_number": "string, phone number including country code if available, e.g. +84 xxx or 0xxx",
  "gender": "Male" | "Female" | "Other" | null,
  "location": "string, city or province",
  "date_of_birth": "YYYY-MM-DD or null",
  "about": "string, a brief professional summary or objective from the CV",
  "desired_positions": ["string, job title or desired role"],
  "skills": ["string", "string"],
  "experiences": [
    {
      "company": "string",
      "position": "string",
      "location": "string",
      "start_date": "YYYY-MM-DD",
      "end_date": "YYYY-MM-DD or null if current",
      "is_current": false,
      "description": "string, summarize responsibilities and achievements"
    }
  ],
  "educations": [
    {
      "school": "string, name of university or school",
      "degree": "string, e.g. Bachelor, Master, etc.",
      "major": "string, field of study",
      "start_date": "YYYY-MM-DD",
      "end_date": "YYYY-MM-DD or null if still studying"
    }
  ],
  "projects": [
    {
      "projectName": "string",
      "description": "string, describe the project, technologies used, and your role",
      "startYear": 2020,
      "startMonth": 1,
      "endYear": 2021,
      "endMonth": 5,
      "isCurrentlyWorking": false,
      "websiteLink": "string, project URL if available"
    }
  ],
  "certifications": [
    {
      "name": "string",
      "organization": "string, issuing organization",
      "issue_date": "YYYY-MM-DD or null",
      "certification_url": "string, URL if available"
    }
  ]
}

IMPORTANT RULES:
- If any information is not found, use an empty array [] for arrays, null for dates, and empty string "" for strings.
- For dates, use YYYY-MM-DD format. If only year is available, use YYYY-01-01. If year and month, use YYYY-MM-01.
- For experiences: set is_current to true ONLY if the role is clearly ongoing (e.g. "Present", "Current").
- For skills: extract technical skills, programming languages, frameworks, tools, soft skills, and languages.
- For phone_number: extract the full phone number as written in the CV.
- For gender: only extract if explicitly mentioned, otherwise use null.
- For projects: extract ALL projects mentioned, including academic, personal, and professional projects.
- For certifications: include all certificates, licenses, and courses completed.

CV CONTENT:
${pdfText.substring(0, 15000)}
    `.trim();

    const openaiInstance = getOpenAI();
    if (!openaiInstance) {
      throw new Error("OpenAI is not configured.");
    }

    console.log(`[CV Extract] PDF text length: ${pdfText.length} chars`);
    console.log(`[CV Extract] PDF text preview: ${pdfText.substring(0, 200)}...`);

    if (pdfText.trim().length < 20) {
      console.warn("[CV Extract] PDF text is too short, extraction may fail.");
      throw new Error("Could not extract enough text from the CV. The PDF may be image-based or corrupted.");
    }

    // Use a dedicated model for CV extraction — Qwen often truncates large JSON responses
    const isOpenRouter = !!(process.env.OPENROUTER_API_KEY || process.env.LLM_API_KEY);
    const extractionModel = process.env.CV_EXTRACTION_MODEL 
      || (isOpenRouter ? "google/gemini-2.0-flash-001" : "gpt-4o-mini");
    
    console.log(`[CV Extract] Using model: ${extractionModel}`);

    const callAI = async (model: string) => {
      const response = await openaiInstance.chat.completions.create({
        model,
        messages: [
          { role: "system", content: "You are a professional CV parser. Extract all information accurately. Always return valid JSON matching the requested schema. Do not add any explanation outside the JSON." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 4000,
      });

      const rawContent = response.choices[0]?.message?.content || "{}";
      const finishReason = response.choices[0]?.finish_reason;
      console.log(`[CV Extract] Model: ${model}, Finish reason: ${finishReason}, Response length: ${rawContent.length}`);
      console.log(`[CV Extract] Raw response preview: ${rawContent.substring(0, 500)}`);

      if (!finishReason || finishReason !== "stop") {
        console.warn(`[CV Extract] Response may be truncated (finish_reason: ${finishReason})`);
      }

      return rawContent;
    };

    try {
      let rawContent = await callAI(extractionModel);
      let parsed = recoverTruncatedJson(rawContent);

      // If extraction returned empty and we have a fallback model
      const fallbackModel = getModel();
      if (Object.keys(parsed).length === 0 && fallbackModel !== extractionModel) {
        console.warn(`[CV Extract] Primary model returned empty, retrying with fallback: ${fallbackModel}`);
        rawContent = await callAI(fallbackModel);
        parsed = recoverTruncatedJson(rawContent);
      }

      console.log(`[CV Extract] Parsed keys:`, Object.keys(parsed));
      console.log(`[CV Extract] Skills: ${parsed.skills?.length || 0}, Exp: ${parsed.experiences?.length || 0}, Edu: ${parsed.educations?.length || 0}, Projects: ${parsed.projects?.length || 0}, Certs: ${parsed.certifications?.length || 0}`);
      console.log(`[CV Extract] Phone: ${parsed.phone_number || 'N/A'}, Location: ${parsed.location || 'N/A'}`);
      
      return parsed;
    } catch (err: any) {
      console.error("OpenAI CV extraction failed:", err.message);
      console.error("Full error:", JSON.stringify(err?.response?.data || err, null, 2));
      throw new Error("Failed to extract data from CV using AI.");
    }
  }
};
