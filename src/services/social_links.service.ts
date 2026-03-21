// services/socialLink.service.ts

import { BadRequestError, NotFoundError } from "@/utils/errors";
import studentRepo from "@/repositories/student.repository";
import { CreateSocialLinkDto, UpdateSocialLinkDto } from "@/dtos/student/SocialLinks.dto";
import socialLinksRepository from "@/repositories/social_links.repository";
import { SocialLinkQueryParams } from "@/types/common";
import { MessageUtil } from "@/utils/MessageUtil";

export class SocialLinkService {
  async assertStudentOwnership(student_id: number, userId: number) {
    const student = await studentRepo.findOne({ student_id });
    if (!student) {
      throw new NotFoundError({ message: MessageUtil.get("STUDENT_PROFILE_NOT_FOUND") });
    }
    if (student.user_id !== userId) {
      throw new BadRequestError({ message: MessageUtil.get("YOU_DO_NOT_OWN_THIS_STUDENT_PROFILE") });
    }
  }

  async create(input: { student_id: number; linkData: CreateSocialLinkDto }) {
    const { student_id, linkData } = input;

    const { data: link } = await socialLinksRepository.findOne({ student_id, platform: linkData.platform });

    if (link) {
      throw new BadRequestError({ message: `Link for ${linkData.platform} already exists` });
    }

    return await socialLinksRepository.create({
      student_id,
      platform: linkData.platform,
      url: linkData.url,
    });
  }

  async update(input: { student_id: number; platform: string; update_data: UpdateSocialLinkDto }) {
    const { student_id, platform, update_data } = input;

    const { data: link } = await socialLinksRepository.findOne({ student_id, platform });
    if (!link) {
      throw new NotFoundError({ message: `Social link for ${platform} not found` });
    }

    return await socialLinksRepository.update({ student_id, platform, update_data });
  }

  async delete(input: { student_id: number; platform: string }) {
    const { student_id, platform } = input;

    await socialLinksRepository.delete(student_id, platform);
  }

  async list(input: { student_id: number; userId: number }) {
    const { student_id, userId } = input;

    const { data: links } = await socialLinksRepository.findAll({ student_id });
    return links;
  }

  async findOne(query: SocialLinkQueryParams) {
    const { data: link } = await socialLinksRepository.findOne(query);

    return link;
  }
}

export default new SocialLinkService();
