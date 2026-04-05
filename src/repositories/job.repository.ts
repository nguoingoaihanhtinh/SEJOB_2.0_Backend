import { supabase } from "@/config/supabase";
import { SupabaseClient } from "@supabase/supabase-js";
import _ from "lodash";
import { CreateJobDto } from "@/dtos/job/CreateJob.dto";
import { UpdateJobDto } from "@/dtos/job/UpdateJob.dto";
import { JobAfterJoined, JobQueryParams, SORTABLE_JOB_FIELDS } from "@/types/common";
import { NotFoundError } from "@/utils/errors";
import convert from "@/utils/convert";

export class JobRepository {
  private readonly db: SupabaseClient;
  public readonly fields =
    "id, external_id, website_url, company, company_id, company_branches, company_branches_id, company_branches_ids, title, responsibilities, requirement, nice_to_haves, benefit, working_time, description, apply_guide, is_diamond, is_job_flash_active, is_hot, salary_from, salary_to, salary_text, salary_currency, job_posted_at, job_deadline, apply_reasons, status, created_at, updated_at, quantity, categories, skills, levels";

  constructor() {
    this.db = supabase;
  }

  async countFindAll(input: JobQueryParams) {
    const { data, error } = await this.db.rpc("search_job", {
      q_keyword: _.get(input, "keyword") || null,
      q_job_ids: convert.normalizeArray(input.job_ids),
      q_company_id: _.get(input, "company_id") ?? null,
      q_province_ids: convert.normalizeArray(input.province_ids),
      q_level_ids: convert.normalizeArray(input.level_ids),
      q_category_ids: convert.normalizeArray(input.category_ids),
      q_skill_ids: convert.normalizeArray(input.skill_ids),
      q_employment_type_ids: convert.normalizeArray(input.employment_type_ids),
      q_salary_from: input.salary_from || null,
      q_salary_to: input.salary_to || null,
      q_statuses: convert.normalizeArray(input.statuses),
      q_page: 1,
      q_limit: 1,
    });
    if (error) throw error;

    const total = data?.[0]?.total || 0;
    return total;
  }

  async findAll(input: JobQueryParams) {
    const fields = _.get(input, "fields", this.fields);
    const page = _.get(input, "page", 1);
    const limit = _.get(input, "limit", 10);
    const hasPagination = page > 0 && limit > 0;

    const { data, error } = await supabase.rpc("search_job", {
      q_keyword: _.get(input, "keyword") || null,
      q_company_id: _.get(input, "company_id") ?? null,
      q_province_ids: convert.normalizeArray(input.province_ids),
      q_job_ids: convert.normalizeArray(input.job_ids),
      q_level_ids: convert.normalizeArray(input.level_ids),
      q_category_ids: convert.normalizeArray(input.category_ids),
      q_skill_ids: convert.normalizeArray(input.skill_ids),
      q_employment_type_ids: convert.normalizeArray(input.employment_type_ids),
      q_salary_from: input.salary_from || null,
      q_salary_to: input.salary_to || null,
      q_sort_by: _.get(input, "sort_by", "job_posted_at"),
      q_sort_dir: _.get(input, "order", "desc"),
      q_page: page,
      q_limit: limit,
      q_statuses: convert.normalizeArray(input.statuses),
    });

    if (error) throw error;

    const total = data?.[0]?.total || 0;
    const selectedFields = fields.split(",").map((f) => f.trim());

    const rows = (data || []).map((row: any) => _.pick(row, selectedFields));

    return {
      data: rows as JobAfterJoined[],
      pagination: hasPagination && {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(jobId: number) {
    const selectString = `
      *,
      company_branches!left(
        id,
        name,
        company_id,
        address,
        created_at,
        updated_at,
        province:provinces(id, name),
        ward:wards(id, name),
        country:countries(id, name)
      ),
      company:companies!inner(
        id,
        external_id,
        name,
        tech_stack,
        logo,
        background,
        description,
        phone,
        email,
        website_url,
        socials,
        images,
        employee_count,
        user_id,
        created_at,
        updated_at
      ),
      levels!left(
        id,
        name,
        created_at,
        updated_at
      ),
      categories!inner(
        id,
        name,
        created_at,
        updated_at
      ),
      skills!left(
        id,
        name,
        created_at,
        updated_at
      ),
      employment_types!left(
        id,
        name,
        created_at,
        updated_at
      )
    `;

    const { data: job, error: jobError } = await this.db
      .from("jobs")
      .select(selectString)
      .eq("id", jobId)
      .maybeSingle();

    if (jobError) throw jobError;

    if (!job) throw new NotFoundError({ message: `Job with ID ${jobId} not found` });

    return { job };
  }

  async create(input: Partial<CreateJobDto>) {
    const { data, error } = await this.db.from("jobs").insert([input]).select("id").single();

    if (error) throw error;

    return data;
  }

  async update(jobId: number, input: Partial<UpdateJobDto>) {
    const filteredData = _.pickBy(input, (v) => v !== null && v !== undefined && v !== "");
    const { data, error } = await this.db.from("jobs").update(filteredData).eq("id", jobId).select("id").maybeSingle();

    if (error) {
      if (error.message.includes("no rows found")) {
        throw new NotFoundError({ message: `Job with ID ${jobId} not found` });
      }
      throw new Error(`Failed to update job with ID ${jobId}: ${error.message}`);
    }
    if (!data) {
      throw new NotFoundError({ message: `Job with ID ${jobId} not found` });
    }
    return data;
  }

  async delete(jobId: number) {
    const { data, error } = await this.db.from("jobs").delete().eq("id", jobId).select("id").maybeSingle();

    if (error) {
      if (error.message.includes("no rows found")) {
        throw new NotFoundError({ message: `Job with ID ${jobId} not found` });
      }
      throw new Error(`Failed to delete job with ID ${jobId}: ${error.message}`);
    }
    if (!data) {
      throw new NotFoundError({ message: `Job with ID ${jobId} not found` });
    }
    return data;
  }

  async findByCompanyId(companyId: number, params: { page: number; limit: number }) {
    const { page, limit } = params;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: jobs, error } = await supabase
      .from("jobs")
      .select("*", { count: "exact" })
      .eq("company_id", companyId)
      .range(from, to)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const { count } = await supabase
      .from("jobs")
      .select("*", { count: "exact", head: true })
      .eq("company_id", companyId);

    return {
      data: jobs,
      pagination: {
        page,
        limit,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / limit),
      },
    };
  }
}

export default new JobRepository();
