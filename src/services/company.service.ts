import _ from "lodash";
import companyRepository from "@/repositories/company.repository";
import companyTypeRepository from "@/repositories/company_types.repository";
import { CreateCompanyDto } from "@/dtos/company/CreateCompany.dto";
import { BadRequestError, NotFoundError } from "@/utils/errors";
import { UpdateCompanyDto } from "@/dtos/company/UpdateCompany.dto";
import { UpdateCompanyAdminDto } from "@/dtos/company/UpdateCompanyAdmin.dto";
import CompanyTypeService from "@/services/company_type.service";
import { CompanyQueryAllParams, CompanyQueryParams } from "@/types/common";
import companyBranchesRepository from "@/repositories/company_branches.repository";
import userRepository from "@/repositories/user.repository";
import { MessageUtil } from "@/utils/MessageUtil";
import JobService from "@/services/jobs.service";

export class CompanyService {
  async findAll(input: CompanyQueryAllParams) {
    const data = await companyRepository.findAll(input);

    return data;
  }

  async findOne(input: CompanyQueryParams) {
    const { company_id } = input;

    const company = await companyRepository.findOne(input);

    if (!company) {
      throw new NotFoundError({ message: `Company with ID ${company_id} not found` });
    }

    return company;
  }

  async createCompany(input: { companyData: CreateCompanyDto }) {
    const { companyData } = input;

    const companyBranchesData = _.get(companyData, 'company_branches') || [];
    const companyTypeIds: number[] = _.get(companyData, "company_types", []);

    if (companyTypeIds.length > 0) {
      const { data: companyTypes } = await CompanyTypeService.findAll({ company_type_ids: companyTypeIds });

      if (companyTypes.length !== companyTypeIds.length) {
        throw new BadRequestError({ message: MessageUtil.get("COMPANY_TYPE_NOT_FOUND") });
      }
    }

    const newCompany = await companyRepository.create({
      companyData: {
        user_id: companyData.user_id,
        name: companyData.name,
        email: companyData.email,
        phone: companyData.phone,
        background: companyData.background || null,
        description: companyData.description || null,
        employee_count: companyData.employee_count || 0,
        external_id: companyData.external_id || 0,
        website_url: companyData.website_url || null,
        images: companyData.images || [],
        tech_stack: companyData.tech_stack || [],
        logo: companyData.logo || null,
        socials: companyData.socials || [],
        is_verified: false,
      },
    });

    // TODO/BUG: HANDLE WITH TRANSACTION
    if (companyTypeIds) {
      await companyTypeRepository.bulkCreateCompanyCompanyTypes({
        companyCompanyTypesData: companyTypeIds.map((company_type_id) => ({
          company_id: newCompany.id,
          company_type_id: company_type_id,
        })),
      });
    }

    if (companyBranchesData.length > 0) {
      await companyBranchesRepository.bulkCreate({
        branchesData: companyBranchesData.map(companyBranch => ({
          ...companyBranch,
          company_id: newCompany.id,
          created_at: companyBranch.created_at || new Date().toISOString(),
          updated_at: companyBranch.updated_at || new Date().toISOString(),
        }))
      })
    }

    return newCompany;
  }

  async updateCompany(input: { companyId: number; companyData: UpdateCompanyDto }) {
    const { companyId, companyData } = input;

    const existingCompany = await this.findOne({ company_id: companyId });

    if (!existingCompany) {
      throw new NotFoundError({ message: `Company with ID ${companyId} not found` });
    }

    const companyTypeIds = _.get(companyData, "company_types");

    // Validate company_types if provided
    if (companyTypeIds && companyTypeIds.length > 0) {
      const { data: companyTypes } = await CompanyTypeService.findAll({ company_type_ids: companyTypeIds });

      if (companyTypes.length !== companyTypeIds.length) {
        throw new BadRequestError({ message: MessageUtil.get("ONE_OR_MORE_COMPANY_TYPES_NOT_FOUND") });
      }
    }

    const updateData = _.pickBy(
      {
        ..._.omit(companyData, ['company_types']),
        updated_at: companyData.updated_at || new Date().toISOString(),
      },
      (value) => value != null && value !== ""
    );

    const updatedCompany = await companyRepository.update({
      companyId,
      companyData: updateData,
    });

    // Update company_types if provided
    if (companyTypeIds !== undefined) {
      // Delete existing company_types
      await companyTypeRepository.deleteByCompanyId(companyId);

      // Create new company_types if array is not empty
      if (companyTypeIds.length > 0) {
        await companyTypeRepository.bulkCreateCompanyCompanyTypes({
          companyCompanyTypesData: companyTypeIds.map((company_type_id) => ({
            company_id: companyId,
            company_type_id: company_type_id,
          })),
        });
      }
    }

    await JobService.syncList({
      company_id: companyId
    });

    return updatedCompany;
  }

  async delete(companyId: number) {
    // Delete company_types relationship first
    await companyTypeRepository.deleteByCompanyId(companyId);

    const deletedCompany = await companyRepository.delete(companyId);

    if (!deletedCompany) {
      throw new NotFoundError({ message: `Company with ID ${companyId} not found` });
    }

    return deletedCompany;
  }

  async updateCompanyAdmin(input: { companyId: number; companyData: UpdateCompanyAdminDto }) {
    const { companyId, companyData } = input;

    const existingCompany = await this.findOne({ company_id: companyId });

    if (!existingCompany) {
      throw new NotFoundError({ message: `Company with ID ${companyId} not found` });
    }

    const companyTypeIds = _.get(companyData, "company_types");

    // Validate company_types if provided
    if (companyTypeIds && companyTypeIds.length > 0) {
      const { data: companyTypes } = await CompanyTypeService.findAll({ company_type_ids: companyTypeIds });

      if (companyTypes.length !== companyTypeIds.length) {
        throw new BadRequestError({ message: MessageUtil.get("ONE_OR_MORE_COMPANY_TYPES_NOT_FOUND") });
      }
    }

    const updateData = _.pickBy(
      {
        ..._.omit(companyData, ['company_types']),
        updated_at: companyData.updated_at || new Date().toISOString(),
      },
      (value) => value != null && value !== ""
    );

    const updatedCompany = await companyRepository.update({
      companyId,
      companyData: updateData,
    });

    // Update company_types if provided
    if (companyTypeIds !== undefined) {
      // Delete existing company_types
      await companyTypeRepository.deleteByCompanyId(companyId);

      // Create new company_types if array is not empty
      if (companyTypeIds.length > 0) {
        await companyTypeRepository.bulkCreateCompanyCompanyTypes({
          companyCompanyTypesData: companyTypeIds.map((company_type_id) => ({
            company_id: companyId,
            company_type_id: company_type_id,
          })),
        });
      }
    }

    await JobService.syncList({
      company_id: companyId
    });

    return updatedCompany;
  }
}

export default new CompanyService();
