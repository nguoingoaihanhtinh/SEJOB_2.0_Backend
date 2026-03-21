import { BadRequestError, NotFoundError } from "@/utils/errors";

import jobRepository from "@/repositories/job.repository";
import saved_jobsRepository from "@/repositories/saved_jobs.repository";
import { SavedJobInsert } from "@/types/common";
import { MessageUtil } from "@/utils/MessageUtil";

export class SavedJobService {
  async saveJob({ user_id, job_id }: SavedJobInsert) {
    const job = await jobRepository.findOne(job_id);
    if (!job) {
      throw new NotFoundError({ message: MessageUtil.get("JOB_NOT_FOUND") });
    }

    const existing = await saved_jobsRepository.findOne({ user_id, job_id });
    if (existing) {
      return existing;
    }

    return await saved_jobsRepository.create({ savedJobData: { user_id, job_id } });
  }

  async unsaveJob({ user_id, job_id }: { user_id: number; job_id: number }) {
    const existing = await saved_jobsRepository.findOne({ user_id, job_id });
    if (!existing) {
      throw new NotFoundError({ message: MessageUtil.get("SAVED_JOB_NOT_FOUND") });
    }

    return await saved_jobsRepository.delete({ user_id, job_id });
  }

  async getSavedJobsByUser(user_id: number, page: number = 1, limit: number = 10) {
    return await saved_jobsRepository.findAllByUser(user_id, page, limit);
  }
}

export default new SavedJobService();
