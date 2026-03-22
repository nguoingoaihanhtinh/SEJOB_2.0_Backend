import EducationRepository from "@/repositories/educations.repository";
import { CreateEducationDTO, UpdateEducationDTO } from "@/dtos/student/Educations.dto";
import { NotFoundError, BadRequestError, InternalServerError } from "@/utils/errors";
import { supabase } from "@/config/supabase";
import { env } from "@/config/env";
import { MessageUtil } from "@/utils/MessageUtil";

const ALLOWED_MIME_TYPE = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm", "application/pdf"];

export const MediaService = {
  async upload(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestError({ message: MessageUtil.get("NO_FILE_UPLOADED") });
    }

    if (!ALLOWED_MIME_TYPE.includes(file.mimetype)) {
      throw new BadRequestError({ message: MessageUtil.get("FILE_TYPE_NOT_ALLOWED") });
    }

    const ext = file.originalname.split(".").pop();
    const fileName = `media_${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from(env.SUPABASE_BUCKET_NAME).upload(fileName, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

    if (error) {
      throw new InternalServerError({ message: error.message });
    }

    const { data } = supabase.storage.from(env.SUPABASE_BUCKET_NAME).getPublicUrl(fileName);

    return {
      url: data.publicUrl,
      fileName,
      type: file.mimetype,
    };
  },
  async clone(fileName: string) {
    if (!fileName) {
      throw new BadRequestError({ message: MessageUtil.get("FILENAME_IS_REQUIRED") });
    }

    const ext = fileName.split(".").pop();
    const newFileName = `media_${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from(env.SUPABASE_BUCKET_NAME).copy(fileName, newFileName);

    if (error) {
      if (error.message.includes("not found")) {
        throw new NotFoundError({ message: MessageUtil.get("SOURCE_FILE_NOT_FOUND") });
      }
      throw new InternalServerError({ message: error.message });
    }

    const { data } = supabase.storage.from(env.SUPABASE_BUCKET_NAME).getPublicUrl(newFileName);

    return {
      url: data.publicUrl,
      fileName: newFileName,
    };
  },
};
