import _ from "lodash";
import validate from "@/utils/validate";
import { Request, Response } from "express-serve-static-core";

import { BadRequestError } from "@/utils/errors";
import convert from "@/utils/convert";
import EmploymentTypeService from "@/services/employment_types.service";
import { createEmploymentTypeSchema } from "@/dtos/job/CreateEmploymentType.dto";
import { updateEmploymentTypeSchema } from "@/dtos/job/UpdateEmploymentType.dto";
import { MessageUtil } from "@/utils/MessageUtil";

export async function getEmploymentTypes(req: Request, res: Response) {
  const { page, limit, ids, hasPagination } = req.query;

  const { data: employment_types, pagination } = await EmploymentTypeService.findAll({
    page: _.toInteger(page) || 1,
    limit: _.toInteger(limit) || 10,
    ids: convert.split(ids as string, ",", Number),
    pagination: hasPagination !== "false",
  });

  res.status(200).json({
    success: true,
    data: employment_types,
    pagination,
  });
}

export async function getEmploymentType(req: Request, res: Response) {
  const id = req.params.id;

  if (!id) {
    throw new BadRequestError({ message: MessageUtil.get("MISSING_REQUIRED_PARAM_ID") });
  }

  const employment_type = await EmploymentTypeService.findOne({ id: _.toNumber(id) });

  res.status(200).json({
    success: true,
    data: employment_type,
  });
}

export async function createEmploymentType(request: Request, response: Response) {
  const employmentTypeData = validate.schema_validate(createEmploymentTypeSchema, request.body);

  const newEmploymentType = await EmploymentTypeService.create({ employmentTypeData });

  response.status(201).json({
    success: true,
    data: newEmploymentType,
  });
}

export async function updateEmploymentType(request: Request, response: Response) {
  const id = request.params.id;
  if (!id) {
    throw new BadRequestError({ message: MessageUtil.get("MISSING_REQUIRED_PARAM_ID") });
  }

  request.body.id = _.toNumber(id);
  const employmentTypeData = validate.schema_validate(updateEmploymentTypeSchema, request.body);

  const updatedEmploymentType = await EmploymentTypeService.update({
    employmentTypeData: employmentTypeData,
  });

  response.status(200).json({
    success: true,
    data: updatedEmploymentType,
  });
}

export async function deleteEmploymentType(request: Request, response: Response) {
  const id = request.params.id;
  if (!id) {
    throw new BadRequestError({ message: MessageUtil.get("MISSING_REQUIRED_PARAM_ID") });
  }

  await EmploymentTypeService.delete(_.toNumber(id));

  response.status(200).json({
    success: true,
  });
}
