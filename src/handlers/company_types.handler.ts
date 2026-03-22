import _ from "lodash";
import validate from "@/utils/validate";
import { Request, Response } from "express-serve-static-core";
import CompanyTypesService from "@/services/company_type.service";
import { BadRequestError } from "@/utils/errors";
import { createCompanyTypeSchema } from "@/dtos/company/CreateCompanyType.dto";
import { updateCompanyTypeSchema } from "@/dtos/company/UpdateComnayType.dto";
import convert from "@/utils/convert";
import { MessageUtil } from "@/utils/MessageUtil";

export async function getCompanyTypes(req: Request, res: Response) {
  const { page, limit, company_type_ids } = req.query;

  const { data: companyTypes, pagination } = await CompanyTypesService.findAll({
    page: _.toInteger(page) || 1,
    limit: _.toInteger(limit) || 10,
    company_type_ids: convert.split(company_type_ids as string, ',', Number),
  });

  res.status(200).json({
    success: true,
    data: companyTypes,
    pagination,
  });
}

export async function getCompanyType(req: Request, res: Response) {
  const id = req.params.id;

  if (!id) {
    throw new BadRequestError({ message: MessageUtil.get("MISSING_REQUIRED_PARAM_ID")});
  }

  const companyType = await CompanyTypesService.findOne({ company_type_id: _.toNumber(id) });

  res.status(200).json({
    success: true,
    data: companyType,
  });
}

export async function createCompanyType(request: Request, response: Response) {

  const companyTypeData = validate.schema_validate(createCompanyTypeSchema, request.body);    

  const newCompany = await CompanyTypesService.create({ companyTypeData });

  response.status(201).json({
    success: true,
    data: newCompany
  });
}

export async function updateCompanyType(request: Request, response: Response) {
  const id = request.params.id;
  if (!id) {
    throw new BadRequestError({ message: MessageUtil.get("MISSING_REQUIRED_PARAM_ID")});
  }

  const companyTypeData = validate.schema_validate(updateCompanyTypeSchema, request.body);

  const updatedCompanyType = await CompanyTypesService.update({ companyTypeId: _.toNumber(id), companyTypeData });

  response.status(200).json({
    success: true,
    data: updatedCompanyType,
  });
}

export async function deleteCompanyType(request: Request, response: Response) {
  const id = request.params.id;
  if (!id) {
    throw new BadRequestError({ message: MessageUtil.get("MISSING_REQUIRED_PARAM_ID")});
  }

  await CompanyTypesService.delete(_.toNumber(id));

  response.status(200).json({
    success: true,
  });
}
