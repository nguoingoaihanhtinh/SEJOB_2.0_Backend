// src/services/test.service.ts
import { supabase } from "@/config/supabase";
import logger from "@/utils/logger";
import { MessageUtil } from "@/utils/MessageUtil";

export const testSupabaseConnection = async () => {
  logger.info("🧪 Testing Supabase connection...");

  try {
    const { data, error } = await supabase.from("test").select("id").limit(1);

    if (error) {
      logger.error("❌ Supabase test failed:", error.message);
      throw new Error(`Supabase error: ${error.message}`);
    }

    logger.info(`✅ Supabase connected successfully! Sample data:`, data);
    return { success: true, message: MessageUtil.get("SUPABASE_IS_WORKING"), data };
  } catch (err: any) {
    logger.error("💥 Unexpected error in test service:", err.message);
    throw err;
  }
};
