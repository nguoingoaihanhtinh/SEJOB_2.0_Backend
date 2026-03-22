import { CreateCvDTO, UpdateCvDTO } from "@/dtos/student/Cv.dto";
import CVRepository from "@/repositories/cv.repository";

import { NotFoundError, BadRequestError } from "@/utils/errors";
import { MessageUtil } from "@/utils/MessageUtil";

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
};
