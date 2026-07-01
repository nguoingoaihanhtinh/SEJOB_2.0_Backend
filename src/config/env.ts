// src/config/env.ts
import dotenv from "dotenv";

dotenv.config();

const jwtExpiresInMs = process.env.JWT_EXPIRES_IN ? parseInt(process.env.JWT_EXPIRES_IN, 10) : 10800000;

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  SUPABASE_URL: process.env.SUPABASE_URL!,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY!,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  SUPABASE_BUCKET_NAME: process.env.SUPABASE_BUCKET_NAME || "DEV",
  JWT_EXPIRES_IN_MS: jwtExpiresInMs,
  JWT_SECRET: process.env.JWT_SECRET,
  ES_HOST: process.env.ES_HOST,
};

// Validate required env vars
if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY || !env.JWT_SECRET || !env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing required environment variables");
}
