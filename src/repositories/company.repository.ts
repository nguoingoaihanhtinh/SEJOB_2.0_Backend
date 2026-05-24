import { supabase } from "@/config/supabase";
import {
  UserInsert,
  UserUpdate,
  User,
  UserQueryParams,
  CompanyInsert,
  CompanyUpdate,
  Company,
  CompanyQueryParams,
  CompanyQueryAllParams,
  CompanyAfterJoined,
} from "@/types/common";
import { NotFoundError } from "@/utils/errors";
import { SupabaseClient } from "@supabase/supabase-js";
import _ from "lodash";

export class CompanyRepository {
  private readonly db: SupabaseClient;
  public readonly fields =
    "id, external_id, name, is_active, tech_stack, logo, background, description, phone, email, website_url, socials, images, employee_count, user_id, created_at, updated_at, is_verified";

  constructor() {
    this.db = supabase;
  }

  // BUG: https://github.com/supabase/supabase-js/issues/1571
  async findAll(input: CompanyQueryAllParams) {
    const fields = _.get(input, "fields", this.fields);
    const page = _.get(input, "page");
    const limit = _.get(input, "limit");
    const keyword = _.get(input, "keyword");
    const employee_count_from = _.get(input, "employee_count_from");
    const employee_count_to = _.get(input, "employee_count_to");
    const hasPagination = page && limit;
    const company_ids = _.get(input, "company_ids") || [];
    const company_type_ids = _.get(input, "company_type_ids") || [];
    const user_ids = _.get(input, "user_ids") || [];
    const order = _.get(input, "order") || "created_at:desc";

    let selectString = fields;

    selectString = `${fields}, company_branches(id, name, company_id, country_id, province_id, address, created_at, updated_at, countries(id, name), provinces(id, name))`;

    selectString = `${selectString}, company_types!inner(id, name)`;

    selectString = `${selectString}, users!inner(user_id, first_name, last_name, is_active)`;

    selectString = `${selectString}, jobs(id, status)`;

    let dbQuery = this.db.from("companies").select(selectString, { count: "exact" });

    if (company_ids.length > 0) dbQuery = dbQuery.in("id", company_ids);
    if (company_type_ids.length > 0) dbQuery = dbQuery.in("company_types.id", company_type_ids);
    if (user_ids.length > 0) dbQuery = dbQuery.in("user_id", user_ids);
    if (keyword) dbQuery = dbQuery.ilike("name", `%${keyword}%`);
    if (employee_count_from) dbQuery = dbQuery.gte("employee_count", employee_count_from);
    if (employee_count_to) dbQuery = dbQuery.lte("employee_count", employee_count_to);

    let [orderBy, direction] = order.split(":");
    const ascending = (direction || "desc") === "asc";

    dbQuery = dbQuery.order(orderBy as string, { ascending });

    const executeQuery = hasPagination ? dbQuery.range((page - 1) * limit, page * limit - 1) : dbQuery;

    const { data, error, count } = await executeQuery;

    if (error) throw error;

    return {
      data: (data as unknown as CompanyAfterJoined[]),
      pagination: hasPagination && {
        page,
        limit,
        total: count || 0,
        total_pages: count ? Math.ceil(count / limit) : 0,
      },
    };
  }

  async findOne(input: CompanyQueryParams) {
    const { company_id, user_id, email, fields } = input;
    const select_fields = fields || this.fields;

    let selectString = select_fields;

    selectString = `${select_fields}, 
      company_branches(
        id,
        name,
        company_id,
        province_id,
        province:provinces!inner(id, name),
        ward:wards!inner(id, name),
        country:countries!inner(id, name),
        address,
        created_at,
        updated_at
      )`;

    selectString = `${selectString}, company_types!inner(id, name)`;

    selectString = `${selectString}, 
      jobs(
        id, 
        status, 
        title,
        created_at,
        job_types:job_employment_types(
          type:employment_types(id, name)
        ),
        job_levels(
          levels(id, name)
        )
      )`;

    let dbQuery = this.db.from("companies").select(selectString, { count: "exact" });

    if (company_id) {
      dbQuery = dbQuery.eq("id", company_id);
    }

    if (email) {
      dbQuery = dbQuery.eq("email", email);
    }

    if (user_id) {
      dbQuery = dbQuery.eq("user_id", user_id);
    }

    const { data, error } = await dbQuery.maybeSingle<CompanyAfterJoined>();

    if (error) throw error;

    return data;
  }

  async create(input: { companyData: CompanyInsert }) {
    const { data, error } = await this.db.from("companies").insert([input.companyData]).select(this.fields).single();

    if (error) {
      throw new Error(`Failed to create company: ${error.message}`);
    }

    return data;
  }

  async update(input: { companyId: number; companyData: CompanyUpdate }) {
    const { data, error } = await this.db
      .from("companies")
      .update(input.companyData)
      .eq("id", input.companyId)
      .select(this.fields)
      .maybeSingle();

    if (error) {
      if (error.message.includes("no rows found")) {
        throw new NotFoundError({ message: `Company with ID ${input.companyId} not found` });
      }
      throw new Error(`Failed to update company with ID ${input.companyId}: ${error.message}`);
    }

    return data;
  }

  async delete(companyId: number) {
    const { data, error } = await this.db
      .from("companies")
      .delete()
      .eq("id", companyId)
      .select(this.fields)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }
}

export default new CompanyRepository();
