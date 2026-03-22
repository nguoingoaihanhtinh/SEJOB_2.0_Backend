import { createExperienceSchema, updateExperienceSchema } from "@/dtos/student/Experiences.dto";
import experiencesService from "@/services/experiences.service";
import { BadRequestError, UnauthorizedError } from "@/utils/errors";
import validate from "@/utils/validate";
import { Request, Response } from "express-serve-static-core";
import studentRepository from "@/repositories/student.repository";
import _ from "lodash";
import { MessageUtil } from "@/utils/MessageUtil";

export async function getExperiences(req: Request, res: Response) {
    const { page, limit } = req.query;
    const { data, pagination} = await experiencesService.findAll({
        page: _.toInteger(page) || 1,
        limit: _.toInteger(limit) || 10,
    });

    res.status(200).json({
        success: true,
        data: data,
        pagination: pagination,
    });
}

export async function getExperienceById(req: Request, res: Response) {
    const id = _.toNumber(req.params.id);

    if (!id) {
      throw new BadRequestError({ message: MessageUtil.get("MISSING_REQUIRED_PARAM_ID")});
    }

    const data = await experiencesService.findOne(id);

    if (!data) {
      throw new BadRequestError({ message: `Experience with ID ${id} not found` });
    }

    res.status(200).json({
        success: true,
        data: data,
    });
}

export async function createExperience(req: Request, res: Response) {
  if (!req.user) throw new UnauthorizedError({ message: MessageUtil.get("AUTHENTICATION_REQUIRED") });

  if (req.user.role !== "Student") {
    throw new UnauthorizedError({ message: MessageUtil.get("ONLY_STUDENTS_CAN_CREATE_EXPERIENCES") });
  }

  const userData = validate.schema_validate(createExperienceSchema, req.body);
  const student = await studentRepository.findByUserId(req.user.userId);
  if (!student) {
    throw new BadRequestError({ message: MessageUtil.get("STUDENT_PROFILE_NOT_FOUND") });
  }

  const newExperience = await experiencesService.create(userData);
  res.status(201).json({
      success: true,
      data: newExperience,
  });
}

export async function updateExperience(req: Request, res: Response) {
  if (!req.user) throw new UnauthorizedError({ message: MessageUtil.get("AUTHENTICATION_REQUIRED") });
    const id = _.toNumber(req.params.id);
    if (!id) {
      throw new BadRequestError({ message: MessageUtil.get("MISSING_REQUIRED_PARAM_ID")});
    }
    const userData = validate.schema_validate(updateExperienceSchema, req.body);
    const updatedExperience = await experiencesService.update({ id, data: userData });

    res.status(200).json({
        success: true,
        data: updatedExperience,
    });
}

export async function deleteExperience(req: Request, res: Response) {
  if (!req.user) throw new UnauthorizedError({ message: MessageUtil.get("AUTHENTICATION_REQUIRED") });
    const id = _.toNumber(req.params.id);
    if (!id) {
      throw new BadRequestError({ message: MessageUtil.get("MISSING_REQUIRED_PARAM_ID")});
    }
    await experiencesService.delete(id);

    res.status(204).send();
}

export async function getExperiencesByStudentId(req: Request, res: Response) {
  if (!req.user) throw new UnauthorizedError({ message: MessageUtil.get("AUTHENTICATION_REQUIRED") });
  if (req.user.role !== "Student") {
    throw new UnauthorizedError({ message: MessageUtil.get("ONLY_STUDENTS_HAVE_EXPERIENCES") });
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
  const { data: experiences, pagination } = await experiencesService.findAll({
    page: Number(page) || 1,
    limit: Number(limit) || 10,
    student_id: student.id,
  });
  res.status(200).json({ success: true, data: experiences, pagination });
}
