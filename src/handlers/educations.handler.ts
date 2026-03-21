import { Request, Response } from "express";
import validate from "@/utils/validate";
import { createEducationSchema, updateEducationSchema } from "@/dtos/student/Educations.dto";
import { EducationService } from "@/services/educations.service";
import { UnauthorizedError } from "@/utils/errors";
import studentRepository from "@/repositories/student.repository";
import { MessageUtil } from "@/utils/MessageUtil";

export async function listEducations(req: Request, res: Response) {
  const { page, limit } = req.query;
  const { data: educations, pagination } = await EducationService.findAll({
    page: Number(page) || 1,
    limit: Number(limit) || 10,
  });
  res.status(200).json({ success: true, data: educations, pagination });
}

export async function getEducation(req: Request, res: Response) {
  const id = Number(req.params.id);
  const data = await EducationService.getOne(id);
  res.status(200).json({ success: true, data });
}

export async function createEducation(req: Request, res: Response) {
  if (!req.user) throw new UnauthorizedError({ message: MessageUtil.get("AUTHENTICATION_REQUIRED") });
  if (req.user.role !== "Student") {
    throw new UnauthorizedError({ message: MessageUtil.get("ONLY_STUDENTS_CAN_ADD_EDUCATION") });
  }

  const payload = validate.schema_validate(createEducationSchema, req.body);

  const student = await studentRepository.findByUserId(req.user.userId);
  if (!student) {
    throw new UnauthorizedError({ message: MessageUtil.get("STUDENT_PROFILE_NOT_FOUND") });
  }

  const finalPayload = {
    ...payload,
    student_id: student.id,
  };

  const created = await EducationService.create(finalPayload);
  res.status(201).json({ success: true, created });
}

export async function updateEducation(req: Request, res: Response) {
  if (!req.user) throw new UnauthorizedError({ message: MessageUtil.get("AUTHENTICATION_REQUIRED") });
  const id = Number(req.params.id);
  const payload = validate.schema_validate(updateEducationSchema, req.body);
  const updated = await EducationService.update(id, payload);
  res.status(200).json({ success: true, data: updated });
}

export async function deleteEducation(req: Request, res: Response) {
  if (!req.user) throw new UnauthorizedError({ message: MessageUtil.get("AUTHENTICATION_REQUIRED") });
  const id = Number(req.params.id);
  await EducationService.remove(id);
  res.status(204).send();
}

export async function getEducationByStudentId(req: Request, res: Response) {
  if (!req.user) throw new UnauthorizedError({ message: MessageUtil.get("AUTHENTICATION_REQUIRED") });
  if (req.user.role !== "Student") {
    throw new UnauthorizedError({ message: MessageUtil.get("ONLY_STUDENTS_HAVE_EDUCATION_RECORDS") });
  }

  const student = await studentRepository.findByUserId(req.user.userId);
  if (!student) {
    return res.status(200).json({
      success: true,
      data: [],
      pagination: { page: 1, limit: 10, total: 0, total_pages: 0 },
    });
  }

  const { page, limit } = req.query;
  const { data: educations, pagination } = await EducationService.findByStudentId(student.id, {
    page: Number(page) || 1,
    limit: Number(limit) || 10,
  });
  res.status(200).json({ success: true, educations, pagination });
}
