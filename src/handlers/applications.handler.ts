import { Request, Response } from "express";
import validate from "@/utils/validate";
import { createApplicationSchema, updateApplicationStatusSchema } from "@/dtos/user/Application.dto";
import { ApplicationService } from "@/services/applications.service";
import { UnauthorizedError, NotFoundError, BadRequestError } from "@/utils/errors";
import convert from "@/utils/convert";
import { ApplicationStatus, LIST_EMPLOYER_ALLOWED_UPDATE_STATUS, LIST_STUDENT_ALLOWED_UPDATE_STATUS, Job } from "@/types/common";
import _ from "lodash";
import companyService from "@/services/company.service";
import jobRepository from "@/repositories/job.repository";
import { MessageUtil } from "@/utils/MessageUtil";
import cvScoringService from "@/services/cv_scoring.service";

export async function listApplications(req: Request, res: Response) {
  if (!req.user) throw new UnauthorizedError({ message: MessageUtil.get("AUTHENTICATION_REQUIRED") });

  const { data, pagination } = await ApplicationService.findAll({
    user_id: req.user.userId,
    job_id: _.toNumber(req.query.job_id) || null,
    statuses: convert.split(req.query.statuses as string, ',', String) as ApplicationStatus[],
    page: _.toNumber(req.query.page) || 1,
    limit: _.toNumber(req.query.limit) || 10,
  });

  res.status(200).json({ success: true, data, pagination });
}

export async function getApplication(req: Request, res: Response) {
  if (!req.user) throw new UnauthorizedError({ message: MessageUtil.get("AUTHENTICATION_REQUIRED") });

  const id = Number(req.params.id);

  if (_.isNaN(id)) {
    throw new BadRequestError({ message: MessageUtil.get("INVALID_APPLICATION_ID") });
  }

  const application = await ApplicationService.findOne({ id, user_id: req.user.userId });

  res.status(200).json({ success: true, data: application });
}

export async function getApplicationByJobId(req: Request, res: Response) {
  if (!req.user) throw new UnauthorizedError({ message: "Authentication required" });

  const job_id = Number(req.params.jobId);

  if (_.isNaN(job_id)) {
    throw new BadRequestError({ message: "Invalid job_id!" });
  }

  const application = await ApplicationService.findOne({ job_id, user_id: req.user.userId });

  res.status(200).json({ success: true, data: application });
}

export async function updateApplication(req: Request, res: Response) {
  if (!req.user) throw new UnauthorizedError({ message: MessageUtil.get("AUTHENTICATION_REQUIRED") });

  const id = Number(req.params.id);

  if (_.isNaN(id)) {
    throw new BadRequestError({ message: MessageUtil.get("INVALID_APPLICATION_ID") });
  }

  const payload = validate.schema_validate(updateApplicationStatusSchema, req.body);

  if (payload.status && !LIST_STUDENT_ALLOWED_UPDATE_STATUS.includes(payload.status as ApplicationStatus)) {
    throw new BadRequestError({ message: `Invalid update status application, list allowed: ${LIST_STUDENT_ALLOWED_UPDATE_STATUS.join(',')}` })
  }

  const application = await ApplicationService.update(id, {
    status: payload.status
  });

  res.status(200).json({ success: true, data: application });
}

export async function createApplication(req: Request, res: Response) {
  if (!req.user) throw new UnauthorizedError({ message: MessageUtil.get("AUTHENTICATION_REQUIRED") });

  const payload = validate.schema_validate(createApplicationSchema, req.body);

  const applicationData = {
    ...payload,
    user_id: req.user.userId,
  };

  const created = await ApplicationService.create(applicationData);

  // Trigger scoring in the background so it's ready when the employer views the list
  cvScoringService.scoreApplication(created.id).catch((err) => {
    console.error(`Background scoring failed for application ${created.id}:`, err.message);
  });

  res.status(201).json({ success: true, data: created });
}

// --- Admin Routes ---

export async function adminListApplications(req: Request, res: Response) {
  if (!req.user) throw new UnauthorizedError({ message: MessageUtil.get("AUTHENTICATION_REQUIRED") });

  const { data, pagination } = await ApplicationService.findAll({
    company_id: _.toNumber(req.query.company_id) || null,
    job_id: _.toNumber(req.query.job_id) || null,
    user_id: _.toNumber(req.query.user_id) || null,
    statuses: convert.split(req.query.statuses as string, ',', String) as ApplicationStatus[],
    page: _.toNumber(req.query.page) || 1,
    limit: _.toNumber(req.query.limit) || 10,
  });

  res.status(200).json({ success: true, data, pagination });
}

// --- Company Routes ---

export async function companyListApplications(req: Request, res: Response) {
  if (!req.user) throw new UnauthorizedError({ message: MessageUtil.get("AUTHENTICATION_REQUIRED") });

  const company = await companyService.findOne({
    user_id: req.user.userId,
  });

  if (req.query.job_id) {
    const { job } = await jobRepository.findOne(_.toNumber(req.query.job_id) || 0);
    if (job && job?.company_id !== company.id) {
      throw new UnauthorizedError({ message: MessageUtil.get("AUTHENTICATION_REQUIRED") });
    }
  }

  const { data, pagination } = await ApplicationService.findAll({
    company_id: company.id,
    job_id: _.toNumber(req.query.job_id) || null,
    statuses: convert.split(req.query.statuses as string, ',', String) as ApplicationStatus[],
    page: _.toNumber(req.query.page) || 1,
    limit: _.toNumber(req.query.limit) || 10,
  });

  res.status(200).json({ success: true, data, pagination });
}

export async function companyGetApplication(req: Request, res: Response) {
  if (!req.user) throw new UnauthorizedError({ message: MessageUtil.get("AUTHENTICATION_REQUIRED") });

  const id = Number(req.params.id);

  if (_.isNaN(id)) {
    throw new BadRequestError({ message: MessageUtil.get("INVALID_APPLICATION_ID") });
  }

  const company = await companyService.findOne({
    user_id: req.user.userId,
  });

  const application = await ApplicationService.findOne({
    id,
    company_id: company.id
  });

  res.status(200).json({ success: true, data: application });
}

export async function companyUpdateApplication(req: Request, res: Response) {
  if (!req.user) throw new UnauthorizedError({ message: MessageUtil.get("AUTHENTICATION_REQUIRED") });

  const id = Number(req.params.id);

  if (_.isNaN(id)) {
    throw new BadRequestError({ message: MessageUtil.get("INVALID_APPLICATION_ID") });
  }

  const payload = validate.schema_validate(updateApplicationStatusSchema, req.body);

  const oldApplication = await ApplicationService.findOne({ id });
  const oldStatus: ApplicationStatus = oldApplication.status as ApplicationStatus;

  if (payload.status && !LIST_EMPLOYER_ALLOWED_UPDATE_STATUS[oldStatus].includes(payload.status)) {
    throw new BadRequestError({ message: `Invalid update status application, list allowed: ${LIST_EMPLOYER_ALLOWED_UPDATE_STATUS[oldStatus].join(',')}` })
  }

  if (payload.status === 'Interview_Scheduled') {
    if (!payload.interview_time || !payload.interview_location) {
      throw new BadRequestError({ message: MessageUtil.get("INTERVIEW_TIME_AND_INTERVIEW_LOCATION_ARE_REQUIRED") });
    }
  }

  if (payload.status === 'Offered') {
    if (!payload.offered_salary) {
      throw new BadRequestError({ message: MessageUtil.get("OFFERED_SALARY_IS_REQUIRED_FOR_OFFERED_STATUS") });
    }
  }

  const application = await ApplicationService.update(id, {
    status: payload.status,
    feedback: payload.feedback,
    interview_time: payload.interview_time,
    interview_location: payload.interview_location,
    offered_salary: payload.offered_salary,
  });

  res.status(200).json({ success: true, data: application });
}

export async function scoreApplication(req: Request, res: Response) {
  if (!req.user) throw new UnauthorizedError({ message: MessageUtil.get("AUTHENTICATION_REQUIRED") });

  const id = Number(req.params.id);
  if (_.isNaN(id)) {
    throw new BadRequestError({ message: MessageUtil.get("INVALID_APPLICATION_ID") });
  }

  const forceRefresh = req.query.forceRefresh === 'true';
  const scoreResult = await cvScoringService.scoreApplication(id, forceRefresh);

  res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
  res.status(200).json({ success: true, data: scoreResult });
}
