import _ from "lodash";
import validate from "@/utils/validate";
import { Request, Response } from "express-serve-static-core";
import { loginSchema } from "@/dtos/user/Login.dto";
import UsersService from "@/services/users.service";
import { registerSchema } from "@/dtos/user/Register.dto";
import { generateRefreshToken, verifyToken, generateToken } from "@/utils/jwt.util";
import { forgotPasswordSchema, resetPasswordSchema, changePasswordSchema } from "@/dtos/user/Password.dto";
import { MessageUtil } from "@/utils/MessageUtil";

export async function login(req: Request, res: Response) {
  const loginData = validate.schema_validate(loginSchema, req.body);

  const { user, token } = await UsersService.login({ loginData });

  const refreshToken = generateRefreshToken({ userId: user.user_id, email: user.email, role: user.role });

  res.cookie("access_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: parseInt(process.env.JWT_EXPIRES_IN!, 10),
    path: "/",
  });

  res.cookie("refresh_token", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: "/",
  });
  const fullUser = await UsersService.findOne({ userId: user.user_id });
  return res.status(200).json({
    success: true,
    data: { user: fullUser },
  });
}

export async function register(req: Request, res: Response) {
  const registerData = validate.schema_validate(registerSchema, req.body);

  const user = await UsersService.register({ registerData });

  res.status(200).json({
    success: true,
    data: user,
  });
}

export async function getMe(req: Request, res: Response) {
  const user = await UsersService.findOne({ userId: req.user!.userId });

  res.status(200).json({
    success: true,
    data: user,
  });
}
export async function logout(req: Request, res: Response) {
  res.clearCookie("access_token", { path: "/" });
  res.clearCookie("refresh_token", { path: "/" });
  res.status(200).json({
    success: true,
    message: MessageUtil.get("LOGGED_OUT_SUCCESSFULLY"),
  });
}
export async function refreshToken(req: Request, res: Response) {
  try {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: MessageUtil.get("REFRESH_TOKEN_MISSING") });
    }

    let payload;
    try {
      payload = verifyToken(refreshToken);
    } catch (err) {
      return res.status(401).json({ success: false, message: MessageUtil.get("INVALID_OR_EXPIRED_REFRESH_TOKEN") });
    }
    const newAccessToken = generateToken({
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    });
    res.cookie("access_token", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: parseInt(process.env.JWT_EXPIRES_IN!, 10),
      path: "/",
    });

    return res.status(200).json({ success: true, message: MessageUtil.get("TOKEN_REFRESHED") });
  } catch (error) {
    return res.status(500).json({ success: false, message: MessageUtil.get("INTERNAL_SERVER_ERROR") });
  }
}

export async function requestPasswordReset(req: Request, res: Response) {
  const { email } = validate.schema_validate(forgotPasswordSchema, req.body);

  await UsersService.requestPasswordReset({ email });

  res.status(200).json({
    success: true,
    message: MessageUtil.get("N_U_EMAIL_T_N_T_I_B_N_S_NH_N_C_M_OTP_TRONG_V_I_GI"),
  });
}

export async function resetPassword(req: Request, res: Response) {
  const { email, otp, new_password } = validate.schema_validate(resetPasswordSchema, req.body);

  await UsersService.resetPassword({ email, otp, new_password });

  res.status(200).json({ success: true, message: MessageUtil.get("PASSWORD_RESET_SUCCESSFULLY") });
}

export async function changePassword(req: Request, res: Response) {
  const { old_password, new_password } = validate.schema_validate(changePasswordSchema, req.body);
  const userId = req.user!.userId;
  await UsersService.resetPassword({ old_password, new_password, userId });
  res.status(200).json({ success: true, message: MessageUtil.get("PASSWORD_CHANGED_SUCCESSFULLY") });
}
