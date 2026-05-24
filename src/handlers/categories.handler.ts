import _ from "lodash";
import validate from "@/utils/validate";
import { Request, Response } from "express-serve-static-core";
import CategoryService from "@/services/categories.service";
import { BadRequestError } from "@/utils/errors";
import { updateCategorySchema } from "@/dtos/job/UpdateCategory.dto";
import { createCategorySchema } from "@/dtos/job/CreateCategory.dto";
import convert from "@/utils/convert";
import { MessageUtil } from "@/utils/MessageUtil";

export async function getCategories(req: Request, res: Response) {
  const { page, limit, ids, hasPagination } = req.query;

  const { data: categories, pagination } = await CategoryService.findAll({
    page: _.toInteger(page) || 1,
    limit: _.toInteger(limit) || 10,
    pagination: hasPagination !== "false",
    ids: convert.split(ids as string, ",", Number),
  });

  res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");

  res.status(200).json({
    success: true,
    data: categories,
    pagination,
  });
}

export async function getCategory(req: Request, res: Response) {
  const id = req.params.id;

  if (!id) {
    throw new BadRequestError({ message: MessageUtil.get("MISSING_REQUIRED_PARAM_ID") });
  }

  const category = await CategoryService.findOne({ id: _.toNumber(id) });

  res.status(200).json({
    success: true,
    data: category,
  });
}

export async function createCategory(request: Request, response: Response) {
  const categoryData = validate.schema_validate(createCategorySchema, request.body);

  const newCategory = await CategoryService.create({ categoryData });

  response.status(201).json({
    success: true,
    data: newCategory,
  });
}

export async function updateCategory(request: Request, response: Response) {
  const id = request.params.id;
  if (!id) {
    throw new BadRequestError({ message: MessageUtil.get("MISSING_REQUIRED_PARAM_ID") });
  }

  request.body.id = _.toNumber(id);
  const categoryData = validate.schema_validate(updateCategorySchema, request.body);

  const updatedCategory = await CategoryService.update({
    categoryData: categoryData,
  });

  response.status(200).json({
    success: true,
    data: updatedCategory,
  });
}

export async function deleteCategory(request: Request, response: Response) {
  const id = request.params.id;
  if (!id) {
    throw new BadRequestError({ message: MessageUtil.get("MISSING_REQUIRED_PARAM_ID") });
  }

  await CategoryService.deleteCategory(_.toNumber(id));

  response.status(200).json({
    success: true,
  });
}
