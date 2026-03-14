import { z } from "zod";

export const createSocialLinkSchema = z.object({
  platform: z.enum(["linkedin", "facebook", "github", "twitter", "instagram", "other"]),
  url: z.url(),
});

export const updateSocialLinkSchema = z.object({
  url: z.url(),
});

export type CreateSocialLinkDto = z.infer<typeof createSocialLinkSchema>;
export type UpdateSocialLinkDto = z.infer<typeof updateSocialLinkSchema>;
