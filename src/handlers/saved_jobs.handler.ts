import { Request, Response } from "express-serve-static-core";
import validate from "@/utils/validate";

import { BadRequestError } from "@/utils/errors";
import { saveJobSchema } from "@/dtos/user/SaveJob.dto";
import saved_jobsService from "@/services/saved_jobs.service";
import { MessageUtil } from "@/utils/MessageUtil";

export async function saveJob(req: Request, res: Response) {
  const user_id = req.user!.userId;
  const role = req.user!.role;

  if (role !== "Student") {
    throw new BadRequestError({ message: MessageUtil.get("ONLY_STUDENTS_CAN_SAVE_JOBS") });
  }

  const { job_id } = validate.schema_validate(saveJobSchema, req.body);

  const saved = await saved_jobsService.saveJob({ user_id, job_id });

  res.status(201).json({ success: true, saved });
}

export async function unsaveJob(req: Request, res: Response) {
  const user_id = req.user!.userId;
  const role = req.user!.role;

  if (role !== "Student") {
    throw new BadRequestError({ message: MessageUtil.get("ONLY_STUDENTS_CAN_UNSAVE_JOBS") });
  }

  const { job_id } = req.params;
  const jobIdNum = Number(job_id);

  if (isNaN(jobIdNum) || jobIdNum <= 0) {
    throw new BadRequestError({ message: MessageUtil.get("INVALID_JOB_ID") });
  }

  await saved_jobsService.unsaveJob({ user_id, job_id: jobIdNum });

  res.status(204).send();
}

export async function getSavedJobs(req: Request, res: Response) {
  const user_id = req.user!.userId;

  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;

  if (page < 1 || limit < 1 || limit > 100) {
    throw new BadRequestError({ message: MessageUtil.get("INVALID_PAGINATION_PARAMETERS") });
  }

  const result = await saved_jobsService.getSavedJobsByUser(user_id, page, limit);

  res.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination,
  });
}
