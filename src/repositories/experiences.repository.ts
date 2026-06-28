import { supabase } from "@/config/supabase";
import { Experience, ExperienceInsert, ExperienceQueryParams, ExperienceUpdate } from "@/types/common";
import { SupabaseClient } from "@supabase/supabase-js";
import _ from "lodash";

export class ExperiencesRepository {
    private readonly db: SupabaseClient;
    public readonly fields =
        "id, student_id, company, position, location, start_date, end_date, description, is_current";

    constructor() {
        this.db = supabase;
    }

    async findAll(input: ExperienceQueryParams): Promise<{ data: Experience[]; pagination: any }> {
        const { page, limit } = input;
        const hasPagination = page && limit;
        const fields = _.get(input, "fields", this.fields);
        const student_id = _.get(input, "student_id");
        const company = _.get(input, "company");

        let dbQuery = this.db.from("experiences").select(fields, { count: "exact" });

        if (student_id) {
            dbQuery = dbQuery.eq("student_id", student_id);
        }
        if (company) {
            dbQuery = dbQuery.eq("company", company);
        }
        const executeQuery = hasPagination ? dbQuery.range((page - 1) * limit, page * limit - 1) : dbQuery;

        const { data, error, count } = await executeQuery;
        if (error) throw error;

        return {
            data: data as unknown as Experience[],
            pagination: hasPagination && {
                page,
                limit,
                total: count || 0,
                total_pages: count ? Math.ceil(count / limit) : 0,
            },
        };
    }

    async findOne(id: number) {
        const { data, error } = await this.db.from("experiences").select(this.fields).eq("id", id).maybeSingle();
        if (error) {
          if (error.code === "PGRST116") return null;
          throw error;
        }
        return data;
    }

    async create(payload: ExperienceInsert): Promise<Experience> {
        const { data, error } = await this.db.from("experiences").insert(payload).select(this.fields).single();
        if (error) throw error;
        return data as Experience;
    }

    async update(id: number, input: ExperienceUpdate): Promise<Experience> {
        const filteredData = _.pickBy(input, (v) => v !== null && v !== undefined && v !== "");
        const { data, error } = await this.db.from("experiences").update(filteredData).eq("id", id).select(this.fields).maybeSingle();
        if (error) throw error;
        return data as Experience;
    }

    async delete(id: number) {
        const { data, error } = await this.db.from("experiences").delete().eq("id", id).select("id").maybeSingle();
        if (error) throw error;
        return data;
    }

    async bulkDelete(studentId: number) {
        const { data, error } = await this.db.from("experiences").delete().eq("student_id", studentId).select("id");
        if (error) throw error;
        return data;
    }
}

export default new ExperiencesRepository();
