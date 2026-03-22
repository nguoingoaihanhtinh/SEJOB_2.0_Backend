import EducationRepository from "@/repositories/educations.repository";
import { CreateEducationDTO, UpdateEducationDTO } from "@/dtos/student/Educations.dto";
import { NotFoundError, BadRequestError } from "@/utils/errors";
import { MessageUtil } from "@/utils/MessageUtil";

export const EducationService = {
  async findAll(options: { page: number; limit: number }) {
    return EducationRepository.findAll(options);
  },

  async findByStudentId(studentId: number, options: { page: number; limit: number }) {
    return EducationRepository.findByStudentId(studentId, options);
  },

  async getOne(id: number) {
    const rec = await EducationRepository.findOne(id);
    if (!rec) throw new NotFoundError({ message: MessageUtil.get("EDUCATION_NOT_FOUND") });
    return rec;
  },

  async create(payload: CreateEducationDTO) {
    if (!payload.school) throw new BadRequestError({ message: MessageUtil.get("SCHOOL_IS_REQUIRED") });
    return EducationRepository.insert(payload as any);
  },

  async update(id: number, payload: UpdateEducationDTO) {
    await this.getOne(id);
    return EducationRepository.update(id, payload as any);
  },

  async remove(id: number) {
    await this.getOne(id);
    return EducationRepository.remove(id);
  },
};
