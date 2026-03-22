import { Request, Response, NextFunction } from "express";
import { MessageUtil } from "@/utils/MessageUtil";

export function authorizeRoles(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ success: false, message: MessageUtil.get("FORBIDDEN_INSUFFICIENT_PERMISSIONS") });
    }
    next();
  };
}
