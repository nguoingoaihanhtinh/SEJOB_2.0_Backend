import projectsRepository from "@/repositories/projects.repository";
import { CreateProjectDTO, UpdateProjectDTO } from "@/dtos/student/ProjectsCertifications.dto";
import { NotFoundError, BadRequestError } from "@/utils/errors";
import { MessageUtil } from "@/utils/MessageUtil";

export const projectsService = {
  async findAll(options: { page: number; limit: number }) {
    return projectsRepository.findAll(options);
  },

  async findByStudentId(studentId: number, options: { page: number; limit: number }) {
    return projectsRepository.findByStudentId(studentId, options);
  },

  async getOne(id: number) {
    const rec = await projectsRepository.findOne(id);
    if (!rec) throw new NotFoundError({ message: MessageUtil.get("PROJECT_NOT_FOUND") });
    return rec;
  },

  async create(payload: CreateProjectDTO) {
    if (!payload.name) throw new BadRequestError({ message: MessageUtil.get("NAME_IS_REQUIRED") });
    return projectsRepository.insert(payload as any);
  },

  async update(id: number, payload: UpdateProjectDTO) {
    await this.getOne(id);
    return projectsRepository.update(id, payload as any);
  },

  async remove(id: number) {
    await this.getOne(id);
    return projectsRepository.remove(id);
  },
};
