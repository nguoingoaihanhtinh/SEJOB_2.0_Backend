import _ from "lodash";
import validate from "@/utils/validate";
import { Request, Response } from "express-serve-static-core";
import LevelService from "@/services/levels.service";
import { BadRequestError } from "@/utils/errors";
import { updateLevelSchema } from "@/dtos/job/UpdateLevel.dto";
import { createLevelSchema } from "@/dtos/job/CreateLevel.dto";
import convert from "@/utils/convert";
import { MessageUtil } from "@/utils/MessageUtil";

export async function getLevels(req: Request, res: Response) {
  const { page, limit, ids, hasPagination } = req.query;

  const { data: levels, pagination } = await LevelService.findAll({
    page: _.toInteger(page) || 1,
    limit: _.toInteger(limit) || 10,
    ids: convert.split(ids as string, ",", Number),
    pagination: hasPagination !== "false",
  });

  res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");

  res.status(200).json({
    success: true,
    data: levels,
    pagination,
  });
}

export async function getLevel(req: Request, res: Response) {
  const id = req.params.id;

  if (!id) {
    throw new BadRequestError({ message: MessageUtil.get("MISSING_REQUIRED_PARAM_ID") });
  }

  const level = await LevelService.findOne({ id: _.toNumber(id) });

  res.status(200).json({
    success: true,
    data: level,
  });
}

export async function createLevel(request: Request, response: Response) {
  const levelData = validate.schema_validate(createLevelSchema, request.body);

  const newJobLevel = await LevelService.create({ levelData });

  response.status(201).json({
    success: true,
    data: newJobLevel,
  });
}

export async function updateLevel(request: Request, response: Response) {
  const id = request.params.id;
  if (!id) {
    throw new BadRequestError({ message: MessageUtil.get("MISSING_REQUIRED_PARAM_ID") });
  }

  request.body.id = _.toNumber(id);
  const levelData = validate.schema_validate(updateLevelSchema, request.body);

  const updatedLevel = await LevelService.update({
    levelData: levelData,
  });

  response.status(200).json({
    success: true,
    data: updatedLevel,
  });
}

export async function deleteLevel(request: Request, response: Response) {
  const id = request.params.id;
  if (!id) {
    throw new BadRequestError({ message: MessageUtil.get("MISSING_REQUIRED_PARAM_ID") });
  }

  await LevelService.delete(_.toNumber(id));

  response.status(200).json({
    success: true,
  });
}
