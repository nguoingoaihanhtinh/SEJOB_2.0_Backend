// handlers/socialLink.handler.ts
import { Request, Response } from "express";

import validate from "@/utils/validate";

import { BadRequestError } from "@/utils/errors";
import socialLinkService from "@/services/social_links.service";
import { createSocialLinkSchema, updateSocialLinkSchema } from "@/dtos/student/SocialLinks.dto";
import studentRepository from "@/repositories/student.repository";
import _ from "lodash";

export async function createSocialLink(req: Request, res: Response) {
  const userId = _.toNumber(req.params.userId);
  const linkData = validate.schema_validate(createSocialLinkSchema, req.body);

  const student = await studentRepository.findOne({ user_id: userId });
  if (!student) {
    throw new BadRequestError({ message: "Student profile not found" });
  }

  const link_created = await socialLinkService.create({
    student_id: student.id,
    linkData,
  });

  res.status(201).json({ success: true, data: link_created });
}

export async function updateSocialLink(req: Request, res: Response) {
  const userId = _.toNumber(req.params.userId);
  const platform = req.body.platform;
  const update_data = validate.schema_validate(updateSocialLinkSchema, req.body);

  if (!platform) {
    throw new BadRequestError({ message: "platform is required" });
  }

  const student = await studentRepository.findOne({ user_id: userId });
  if (!student) {
    throw new BadRequestError({ message: "Student profile not found" });
  }

  const updated_link = await socialLinkService.update({
    student_id: student.id,
    platform,
    update_data,
  });

  res.status(200).json({ success: true, data: updated_link });
}

export async function deleteSocialLink(req: Request, res: Response) {
  const userId = _.toNumber(req.params!.userId);
  const platform = req.query.platform;

  if (!platform) {
    throw new BadRequestError({ message: "platform is required" });
  }

  const student = await studentRepository.findOne({ user_id: userId });
  if (!student) {
    throw new BadRequestError({ message: "Student profile not found" });
  }

  await socialLinkService.delete({
    student_id: student.id,
    platform: platform as string,
  });

  res.status(200).json({ success: true, message: "Social link deleted" });
}

export async function listSocialLinks(req: Request, res: Response) {
  const userId = req.user!.userId;

  const student = await studentRepository.findOne({ user_id: userId });
  if (!student || student.id == null) {
    throw new BadRequestError({ message: "Student profile not found" });
  }

  const links = await socialLinkService.list({ student_id: student.id, userId });
  res.status(200).json({ success: true, links });
}

export async function getSocialLink(req: Request, res: Response) {
  const userId = req.params.userId;

  const student = await studentRepository.findOne({ user_id: _.toNumber(userId) });
  if (!student || student.id == null) {
    throw new BadRequestError({ message: "Student profile not found" });
  }

  const data = await socialLinkService.findOne({
    student_id: student.id,
    platform: req.query.platform as string,
  });

  res.status(200).json({ success: true, data });
}
