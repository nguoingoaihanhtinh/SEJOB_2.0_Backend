import _ from "lodash";
import { Request, Response } from "express-serve-static-core";
import { BadRequestError, InternalServerError } from "@/utils/errors";
import { supabase } from "@/config/supabase";
import { env } from "@/config/env";
import { MediaService } from "@/services/media.service";
import { MessageUtil } from "@/utils/MessageUtil";

const ALLOWED_MIME_TYPE = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm", "application/pdf"];

export async function uploadMedia(req: Request, res: Response) {
  const result = await MediaService.upload(req.file!);

  res.status(200).json({
    success: true,
    ...result,
  });
}

export async function uploadMultiMedia(req: Request, res: Response) {
  const files = req.files as Express.Multer.File[];

  if (!files || files.length === 0) {
    return res.status(400).json({ success: false, message: MessageUtil.get("NO_FILES_UPLOADED") });
  }

  const uploadPromises = files.map(async (file) => {
    if (!ALLOWED_MIME_TYPE.includes(file.mimetype)) {
      return null;
    }

    const ext = file.originalname.split(".").pop();
    const fileName = `media_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage
      .from(env.SUPABASE_BUCKET_NAME)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      console.error("Upload error:", error);
      return null;
    }

    const { data: publicUrl } = supabase.storage
      .from(env.SUPABASE_BUCKET_NAME)
      .getPublicUrl(fileName);

    return {
      fileName,
      url: publicUrl.publicUrl,
      type: file.mimetype,
    };
  });

  const uploadedFiles = (await Promise.all(uploadPromises)).filter(Boolean);

  return res.status(200).json({
    success: true,
    count: uploadedFiles.length,
    files: uploadedFiles,
  });
}

export async function deleteMedia(req: Request, res: Response) {
  const { fileName } = req.params;

  if (!fileName && _.isString(fileName)) {
    throw new BadRequestError({ message: MessageUtil.get("FILENAME_IS_REQUIRED") });
  }

  const { error } = await supabase.storage.from(env.SUPABASE_BUCKET_NAME).remove([fileName as string]);

  if (error) {
    throw new InternalServerError({ message: MessageUtil.get("DELETE_FAILED") });
  }

  return res.status(200).json({
    success: true,
    message: MessageUtil.get("FILE_DELETED"),
    fileName,
  });
}
