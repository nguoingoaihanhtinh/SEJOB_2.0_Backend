import _ from "lodash";
import validate from "@/utils/validate";
import { Request, Response } from "express-serve-static-core";

import { BadRequestError } from "@/utils/errors";
import SkillService from "@/services/skills.service";
import { createSkillSchema } from "@/dtos/job/CreateSkill.dto";
import { updateSkillSchema } from "@/dtos/job/UpdateSkill.dto";
import convert from "@/utils/convert";
import { MessageUtil } from "@/utils/MessageUtil";

export async function getSkills(req: Request, res: Response) {
  const { page, limit, ids, hasPagination } = req.query;

  const { data: skills, pagination } = await SkillService.findAll({
    page: _.toInteger(page) || 1,
    limit: _.toInteger(limit) || 10,
    pagination: hasPagination !== "false",
    ids: convert.split(ids as string, ",", Number),
  });

  res.status(200).json({
    success: true,
    data: skills,
    pagination,
  });
}

export async function getSkill(req: Request, res: Response) {
  const id = req.params.id;

  if (!id) {
    throw new BadRequestError({ message: MessageUtil.get("MISSING_REQUIRED_PARAM_ID") });
  }

  const skill = await SkillService.findOne({ id: _.toNumber(id) });

  res.status(200).json({
    success: true,
    data: skill,
  });
}

export async function createSkill(request: Request, response: Response) {
  const skillData = validate.schema_validate(createSkillSchema, request.body);

  const newSkill = await SkillService.create({
    skillData,
  });

  response.status(201).json({
    success: true,
    data: newSkill,
  });
}

export async function updateSkill(request: Request, response: Response) {
  const id = request.params.id;
  if (!id) {
    throw new BadRequestError({ message: MessageUtil.get("MISSING_REQUIRED_PARAM_ID") });
  }
  request.body.id = _.toNumber(id);
  const skillData = validate.schema_validate(updateSkillSchema, request.body);

  const updatedSkill = await SkillService.update({ skillData });

  response.status(200).json({
    success: true,
    data: updatedSkill,
  });
}

export async function deleteSkill(request: Request, response: Response) {
  const id = request.params.id;
  if (!id) {
    throw new BadRequestError({ message: MessageUtil.get("MISSING_REQUIRED_PARAM_ID") });
  }

  await SkillService.delete(_.toNumber(id));

  response.status(200).json({
    success: true,
  });
}
