import { Request, Response } from "express";
import validate from "@/utils/validate";
import { createProjectSchema, updateProjectSchema } from "@/dtos/student/ProjectsCertifications.dto";
import { projectsService } from "@/services/projects.service";
import { BadRequestError, UnauthorizedError } from "@/utils/errors";
import studentRepository from "@/repositories/student.repository";
import { MessageUtil } from "@/utils/MessageUtil";

export async function listProjects(req: Request, res: Response) {
  const { page, limit } = req.query;
  const { data: projects, pagination } = await projectsService.findAll({
    page: Number(page) || 1,
    limit: Number(limit) || 10,
  });
  res.status(200).json({ success: true, data: projects, pagination });
}

export async function getProject(req: Request, res: Response) {
  const id = Number(req.params.id);
  const data = await projectsService.getOne(id);
  res.status(200).json({ success: true, data });
}

export async function createProject(req: Request, res: Response) {
  if (!req.user) throw new UnauthorizedError({ message: MessageUtil.get("AUTHENTICATION_REQUIRED") });

  if (req.user.role !== "Student") {
    throw new UnauthorizedError({ message: MessageUtil.get("ONLY_STUDENTS_CAN_CREATE_PROJECTS") });
  }

  const payload = validate.schema_validate(createProjectSchema, req.body);

  const student = await studentRepository.findByUserId(req.user.userId);
  if (!student) {
    throw new BadRequestError({ message: MessageUtil.get("STUDENT_PROFILE_NOT_FOUND") });
  }

  const finalPayload = {
    ...payload,
    student_id: student.id,
  };

  const created = await projectsService.create(finalPayload);
  res.status(201).json({ success: true, data: created });
}

export async function updateProject(req: Request, res: Response) {
  if (!req.user) throw new UnauthorizedError({ message: MessageUtil.get("AUTHENTICATION_REQUIRED") });
  const id = Number(req.params.id);
  const payload = validate.schema_validate(updateProjectSchema, req.body);
  const updated = await projectsService.update(id, payload);
  res.status(200).json({ success: true, data: updated });
}

export async function deleteProject(req: Request, res: Response) {
  if (!req.user) throw new UnauthorizedError({ message: MessageUtil.get("AUTHENTICATION_REQUIRED") });
  const id = Number(req.params.id);
  await projectsService.remove(id);
  res.status(204).send();
}

export async function getProjectsByStudentId(req: Request, res: Response) {
  if (!req.user) throw new UnauthorizedError({ message: MessageUtil.get("AUTHENTICATION_REQUIRED") });
  if (req.user.role !== "Student") {
    throw new UnauthorizedError({ message: MessageUtil.get("ONLY_STUDENTS_HAVE_PROJECTS") });
  }

  const student = await studentRepository.findByUserId(req.user.userId);
  if (!student) {
    return res.status(200).json({ success: true, data: [], pagination: { page: 1, limit: 10, total: 0 } });
  }

  const { page, limit } = req.query;
  const { data: projects, pagination } = await projectsService.findByStudentId(student.id, {
    page: Number(page) || 1,
    limit: Number(limit) || 10,
  });
  res.status(200).json({ success: true, data: projects, pagination });
}
