import { Request, Response, NextFunction } from "express";
import { verifyToken, JWTPayload } from "@/utils/jwt.util";
import { UnauthorizedError } from "@/utils/errors";
import { MessageUtil } from "@/utils/MessageUtil";

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    if (!token) {
      token = req.cookies?.access_token;
    }

    if (!token) {
      throw new UnauthorizedError({
        message: MessageUtil.get("NO_TOKEN_PROVIDED"),
        status: "NO_TOKEN",
      });
    }
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    next(error);
  }
};
