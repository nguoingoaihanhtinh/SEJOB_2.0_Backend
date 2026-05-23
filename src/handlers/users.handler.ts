import _ from "lodash";
import validate from "@/utils/validate";
import UserService from "@/services/users.service";
import { Request, Response } from "express-serve-static-core";
import { createUserSchema } from "@/dtos/user/CreateUser.dto";
import { BadRequestError, NotFoundError } from "@/utils/errors";
import { updateUserSchema } from "@/dtos/user/UpdateUser.dto";
import { MessageUtil } from "@/utils/MessageUtil";
import { getProvinces } from "./address.handler";
import { supabase } from "@/config/supabase";
import convert from "@/utils/convert";

export async function getUsers(req: Request, res: Response) {
  const { page, limit, email, roles } = req.query;
  const { data: users, pagination } = await UserService.findAll({
    page: _.toInteger(page) || 1,
    limit: _.toInteger(limit) || 10,
    email: _.toString(email) || "",
    roles: convert.split(_.toString(roles)),
  });

  res.status(200).json({
    success: true,
    data: users,
    pagination,
  });
}

export async function getUserById(req: Request, res: Response) {
  const id = req.params.id;

  if (!id) {
    throw new BadRequestError({ message: MessageUtil.get("MISSING_REQUIRED_PARAM_ID")});
  }

  const user = await UserService.findOne({ userId: _.toNumber(id) });
  if (!user) {
    throw new NotFoundError({ message: `User with ID ${id} not found` });
  }

  res.status(200).json({
    success: true,
    data: user,
  });
}


export async function createUser(request: Request, response: Response) {

  const userData = validate.schema_validate(createUserSchema, request.body);

  const newUser = await UserService.createUser({ userData });

  response.status(201).json({
    success: true,
    data: newUser,
  });
}

export async function updateUser(request: Request, response: Response) {
  const id = request.params.id;
  if (!id) {
    throw new BadRequestError({ message: MessageUtil.get("MISSING_REQUIRED_PARAM_ID")});
  }

  const userData = validate.schema_validate(updateUserSchema, request.body);

  if (userData?.student_info?.location) {
    const { data: provinces } = await supabase.from("provinces").select("id, name", { count: "exact" });

    const province = _.find(provinces, { name: userData.student_info.location });

    if (province) {
      userData.student_info.location_id = province.id;
    }
  }

  const updatedUser = await UserService.updateUser({ userId: _.toNumber(id), userData: userData });

  response.status(200).json({
    success: true,
    data: updatedUser,
  });
}

export async function deleteUser(request: Request, response: Response) {
  const id = request.params.id;
  if (!id) {
    throw new BadRequestError({ message: MessageUtil.get("MISSING_REQUIRED_PARAM_ID")});
  }

  await UserService.deleteUser(_.toNumber(id));

  response.status(200).json({
    success: true,
  });
}

export async function activeUser(request: Request, response: Response) {
  const id = request.params.id;
  if (!id) {
    throw new BadRequestError({ message: MessageUtil.get("MISSING_REQUIRED_PARAM_ID")});
  }

  await UserService.activeUser(_.toNumber(id));

  response.status(200).json({
    success: true,
  });
}
