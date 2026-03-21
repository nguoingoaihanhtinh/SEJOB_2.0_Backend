import _ from "lodash";
import { Request, Response } from "express-serve-static-core";
import { supabase } from "@/config/supabase";
import { BadRequestError } from "@/utils/errors";
import { MessageUtil } from "@/utils/MessageUtil";

export async function getProvinces(req: Request, res: Response) {
  const { data, error, count } = await supabase.from("provinces").select("id, country_id, name", { count: "exact" });

  if (error) throw error;

  res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");

  res.status(200).json({
    success: true,
    data: data,
  });
}

export async function getWards(req: Request, res: Response) {
  const province_id = req.params.provinceId;

  if (!province_id) throw new BadRequestError({ message: MessageUtil.get("MISSING_PARAMS_PROVINCEID") });

  const { data, error, count } = await supabase
    .from("wards")
    .select("id, province_id, name", { count: "exact" })
    .eq("province_id", province_id);

  if (error) throw error;

  res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");

  res.status(200).json({
    success: true,
    data: data,
  });
}
