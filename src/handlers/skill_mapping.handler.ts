import _ from "lodash";
import { Request, Response } from "express-serve-static-core";
import { BadRequestError } from "@/utils/errors";
import SkillMappingService from "@/services/skill_mapping.service";
import { MessageUtil } from "@/utils/MessageUtil";

export async function getSkillMappings(req: Request, res: Response) {
  const { page, limit, skill_name, category, is_active, hasPagination } = req.query;

  const queryParams: any = {
    page: _.toInteger(page) || 1,
    limit: _.toInteger(limit) || 20,
    pagination: hasPagination !== "false",
    skill_name: skill_name as string,
    category: category as string,
  };
  if (is_active !== undefined) {
    queryParams.is_active = is_active === "true";
  }

  const { data, pagination } = await SkillMappingService.findAll(queryParams);

  res.status(200).json({
    success: true,
    data,
    pagination,
  });
}

export async function getSkillMapping(req: Request, res: Response) {
  const id = req.params.id;
  if (!id) {
    throw new BadRequestError({ message: MessageUtil.get("MISSING_REQUIRED_PARAM_ID") });
  }

  const mapping = await SkillMappingService.findOne(_.toNumber(id));

  res.status(200).json({
    success: true,
    data: mapping,
  });
}

export async function createSkillMapping(req: Request, res: Response) {
  const { skill_name, category, synonyms, related_skills } = req.body;

  if (!skill_name) {
    throw new BadRequestError({ message: "skill_name is required" });
  }

  const newMapping = await SkillMappingService.create({
    skill_name,
    category,
    synonyms: synonyms || [],
    related_skills: related_skills || [],
  });

  res.status(201).json({
    success: true,
    data: newMapping,
  });
}

export async function updateSkillMapping(req: Request, res: Response) {
  const id = req.params.id;
  if (!id) {
    throw new BadRequestError({ message: MessageUtil.get("MISSING_REQUIRED_PARAM_ID") });
  }

  const { skill_name, category, synonyms, related_skills, is_active } = req.body;

  const updated = await SkillMappingService.update(_.toNumber(id), {
    skill_name,
    category,
    synonyms,
    related_skills,
    is_active,
  });

  res.status(200).json({
    success: true,
    data: updated,
  });
}

export async function deleteSkillMapping(req: Request, res: Response) {
  const id = req.params.id;
  if (!id) {
    throw new BadRequestError({ message: MessageUtil.get("MISSING_REQUIRED_PARAM_ID") });
  }

  await SkillMappingService.delete(_.toNumber(id));

  res.status(200).json({
    success: true,
  });
}

export async function expandSkills(req: Request, res: Response) {
  const { skills } = req.body;

  if (!skills || !Array.isArray(skills)) {
    throw new BadRequestError({ message: "skills array is required" });
  }

  const expanded = await SkillMappingService.expandSkills(skills);

  res.status(200).json({
    success: true,
    data: {
      input: skills,
      expanded,
      count: expanded.length,
    },
  });
}
