import _ from "lodash";
import validate from "@/utils/validate";
import { Request, Response } from "express-serve-static-core";
import { createCompanySchema } from "@/dtos/company/CreateCompany.dto";
import CompanyService from "@/services/company.service";
import { BadRequestError, NotFoundError } from "@/utils/errors";
import { updateCompanySchema } from "@/dtos/company/UpdateCompany.dto";
import { updateCompanyAdminSchema } from "@/dtos/company/UpdateCompanyAdmin.dto";
import convert from "@/utils/convert";
import { MessageUtil } from "@/utils/MessageUtil";

export async function getCompanies(req: Request, res: Response) {
  const { page, limit } = req.query;

  const { data: companies, pagination } = await CompanyService.findAll({
    ...req.query,
    page: _.toInteger(page) || 1,
    limit: _.toInteger(limit) || 10,
    company_ids: convert.split(req.query.company_ids as string, ',', Number),
    company_type_ids: convert.split(req.query.company_type_ids as string, ',', Number),
  });

  res.status(200).json({
    success: true,
    data: companies,
    pagination,
  });
}

export async function getCompany(req: Request, res: Response) {
  const id = req.params.id;

  if (!id) {
    throw new BadRequestError({ message: MessageUtil.get("MISSING_REQUIRED_PARAM_ID")});
  }

  const company = await CompanyService.findOne({ company_id: _.toNumber(id) });

  res.status(200).json({
    success: true,
    data: company,
  });
}

export async function createCompany(req: Request, res: Response) {

  if (!req.user?.userId) {
    throw new BadRequestError({ message: MessageUtil.get("MISSING_USER_ID") });
  }

  const data = {
    ...req.body,
    user_id: req.user.userId
  }

  const companyData = validate.schema_validate(createCompanySchema, data);    

  const newCompany = await CompanyService.createCompany({ companyData });

  res.status(201).json({
    success: true,
    data: newCompany
  });
}

export async function updateCompany(request: Request, response: Response) {
  const id = request.params.id;
  if (!id) {
    throw new BadRequestError({ message: MessageUtil.get("MISSING_REQUIRED_PARAM_ID")});
  }

  const companyData = validate.schema_validate(updateCompanySchema, request.body);

  const updatedCompany = await CompanyService.updateCompany({ companyId: _.toNumber(id), companyData: companyData });

  response.status(200).json({
    success: true,
    data: updatedCompany,
  });
}

export async function deleteCompany(request: Request, response: Response) {
  const id = request.params.id;
  if (!id) {
    throw new BadRequestError({ message: MessageUtil.get("MISSING_REQUIRED_PARAM_ID")});
  }

  await CompanyService.delete(_.toNumber(id));

  response.status(200).json({
    success: true,
  });
}

export async function updateCompanyAdmin(request: Request, response: Response) {
  const id = request.params.id;
  if (!id) {
    throw new BadRequestError({ message: MessageUtil.get("MISSING_REQUIRED_PARAM_ID")});
  }

  const companyData = validate.schema_validate(updateCompanyAdminSchema, request.body);

  const updatedCompany = await CompanyService.updateCompanyAdmin({ companyId: _.toNumber(id), companyData: companyData });

  response.status(200).json({
    success: true,
    data: updatedCompany,
  });
}
