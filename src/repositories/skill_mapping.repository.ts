import { supabase } from "@/config/supabase";
import { SupabaseClient } from "@supabase/supabase-js";
import _ from "lodash";

export interface SkillMapping {
  id: number;
  skill_name: string;
  category: string | null;
  synonyms: string[];
  related_skills: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SkillMappingQueryParams {
  page?: number;
  limit?: number;
  pagination?: boolean;
  skill_name?: string;
  category?: string;
  is_active?: boolean;
  fields?: string;
}

export interface SkillMappingInsert {
  skill_name: string;
  category?: string;
  synonyms?: string[];
  related_skills?: string[];
  is_active?: boolean;
}

export interface SkillMappingUpdate {
  skill_name?: string;
  category?: string;
  synonyms?: string[];
  related_skills?: string[];
  is_active?: boolean;
}

export class SkillMappingRepository {
  private readonly db: SupabaseClient;
  public readonly fields = "id, skill_name, category, synonyms, related_skills, is_active, created_at, updated_at";

  constructor() {
    this.db = supabase;
  }

  async findAll(input: SkillMappingQueryParams) {
    const { page, limit, pagination, skill_name, category, is_active } = input;
    const hasPagination = pagination && page && limit;
    const fields = _.get(input, "fields", this.fields);

    let dbQuery = this.db.from("skill_mappings").select(fields, { count: "exact" });

    if (skill_name) dbQuery = dbQuery.ilike("skill_name", `%${skill_name}%`);
    if (category) dbQuery = dbQuery.eq("category", category);
    if (is_active !== undefined) dbQuery = dbQuery.eq("is_active", is_active);

    const executeQuery = hasPagination ? dbQuery.range((page - 1) * limit, page * limit - 1) : dbQuery;

    const { data, error, count } = await executeQuery;

    if (error) throw error;

    return {
      data,
      pagination: hasPagination && {
        page,
        limit,
        total: count || 0,
        total_pages: count ? Math.ceil(count / limit) : 0,
      },
    };
  }

  async findOne(id: number) {
    const { data, error } = await this.db.from("skill_mappings").select(this.fields).eq("id", id).maybeSingle();

    if (error) throw error;

    return data;
  }

  async findBySkillName(skillName: string) {
    const { data, error } = await this.db
      .from("skill_mappings")
      .select(this.fields)
      .eq("skill_name", skillName)
      .eq("is_active", true)
      .maybeSingle();

    if (error) throw error;

    return data;
  }

  async findBySynonym(synonym: string) {
    const { data, error } = await this.db
      .from("skill_mappings")
      .select(this.fields)
      .eq("is_active", true)
      .filter("synonyms", "cs", `{"${synonym}"}`)
      .maybeSingle();

    if (error) throw error;

    return data;
  }

  async findByCategory(category: string) {
    const { data, error } = await this.db
      .from("skill_mappings")
      .select(this.fields)
      .eq("category", category)
      .eq("is_active", true);

    if (error) throw error;

    return data;
  }

  async create(input: SkillMappingInsert) {
    const { data, error } = await this.db.from("skill_mappings").insert([input]).select(this.fields).single();

    if (error) throw error;

    return data;
  }

  async update(id: number, input: SkillMappingUpdate) {
    const filteredData = _.pickBy(input, (v) => v !== null && v !== undefined);

    const { data, error } = await this.db
      .from("skill_mappings")
      .update(filteredData)
      .eq("id", id)
      .select(this.fields)
      .maybeSingle();

    if (error) throw error;

    return data;
  }

  async delete(id: number) {
    const { data, error } = await this.db
      .from("skill_mappings")
      .delete()
      .eq("id", id)
      .select(this.fields)
      .maybeSingle();

    if (error) throw error;

    return data;
  }

  async bulkUpsert(mappings: SkillMappingInsert[]) {
    if (!mappings || mappings.length === 0) return [];

    const { data, error } = await this.db
      .from("skill_mappings")
      .upsert(mappings, { onConflict: "skill_name" })
      .select(this.fields);

    if (error) throw error;

    return data;
  }

  async searchBySynonym(synonym: string) {
    const { data, error } = await this.db
      .from("skill_mappings")
      .select(this.fields)
      .eq("is_active", true)
      .filter("synonyms", "ov", `%${synonym}%`)
      .limit(10);

    if (error) throw error;

    return data;
  }

  async findAllActive() {
    const { data, error } = await this.db.from("skill_mappings").select(this.fields).eq("is_active", true);

    if (error) throw error;

    return data;
  }
}

export default new SkillMappingRepository();
