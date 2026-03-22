import jwt from "jsonwebtoken";
import { JWTError, InternalServerError } from "./errors";
import { env } from "@/config/env";
import { MessageUtil } from "@/utils/MessageUtil";

export interface JWTPayload {
  userId: number;
  email: string;
  role: string;
}

export const generateToken = (payload: JWTPayload): string => {
  if (!env.JWT_SECRET) {
    throw new InternalServerError({
      message: MessageUtil.get("JWT_SECRET_IS_NOT_DEFINED"),
      status: "JWT_CONFIG_ERROR",
    });
  }
  const expiresInSeconds = Math.floor(env.JWT_EXPIRES_IN_MS / 1000);

  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: expiresInSeconds,
  });
};
export const generateRefreshToken = (payload: JWTPayload): string => {
  if (!env.JWT_SECRET) {
    throw new InternalServerError({
      message: MessageUtil.get("JWT_SECRET_IS_NOT_DEFINED"),
      status: "JWT_CONFIG_ERROR",
    });
  }
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

export const verifyToken = (token: string): JWTPayload => {
  try {
    if (!env.JWT_SECRET) {
      throw new InternalServerError({
        message: MessageUtil.get("JWT_SECRET_IS_NOT_DEFINED"),
        status: "JWT_CONFIG_ERROR",
      });
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new JWTError({
        message: MessageUtil.get("INVALID_TOKEN"),
        status: "INVALID_TOKEN",
      });
    } else if (error instanceof jwt.TokenExpiredError) {
      throw new JWTError({
        message: MessageUtil.get("TOKEN_HAS_EXPIRED"),
        status: "TOKEN_EXPIRED",
      });
    }
    throw new JWTError({
      message: MessageUtil.get("TOKEN_VERIFICATION_FAILED"),
      status: "TOKEN_ERROR",
    });
  }
};
