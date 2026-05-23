import { supabase } from "@/config/supabase";
import { UserInsert, UserUpdate, User, UserQueryParams } from "@/types/common";
import { NotFoundError } from "@/utils/errors";
import { SupabaseClient } from "@supabase/supabase-js";
import _ from "lodash";
export class UserRepository {
  private readonly db: SupabaseClient;
  public readonly fields =
    "user_id, email, first_name, last_name, avatar, role, is_verified, is_active, created_at, updated_at";

  constructor() {
    this.db = supabase;
  }

  // BUG: https://github.com/supabase/supabase-js/issues/1571
  async findAll<T>(input: UserQueryParams) {
    const fields = _.get(input, "fields", this.fields);
    const page = _.get(input, "page");
    const limit = _.get(input, "limit");
    const user_ids = _.get(input, "user_ids") || [];
    const email = _.get(input, 'email') || '';
    const roles = _.get(input, 'roles') || [];
    const sortBy = _.get(input, 'sort_by') || 'created_at';
    const sortOrder = (_.get(input, 'sort_order') || 'desc') as 'asc' | 'desc';    
    const hasPagination = page && limit;

    let dbQuery = this.db.from("users").select(fields, { count: "exact" });

    if (user_ids.length > 0) {
      dbQuery = dbQuery.in("user_id", user_ids);
    }

    if (email) {
      dbQuery = dbQuery.ilike("email", `%${email}%`);
    }

    if (_.size(roles) > 0) {
      dbQuery = dbQuery.in("role", roles);
    }

    dbQuery = dbQuery.order(sortBy, { ascending: sortOrder === 'asc' });

    const executeQuery = hasPagination
      ? dbQuery.range((page - 1) * limit, page * limit - 1)
      : dbQuery;

    const { data, error, count } = await executeQuery;

    if (error) throw error;

    return {
      data: data as T[],
      pagination: hasPagination && {
        page,
        limit,
        total: count || 0,
        total_pages: count ? Math.ceil(count / limit) : 0,
      },
    };
  }

  async findOne(input: UserQueryParams) {
    const { user_id, email, reset_token, fields } = input;
    const select_fields = fields || this.fields;

    let dbQuery = this.db.from("users").select(select_fields);

    if (user_id) {
      dbQuery = dbQuery.eq("user_id", user_id);
    }

    if (email) {
      dbQuery = dbQuery.eq("email", email);
    }

    if (reset_token) {
      dbQuery = dbQuery.eq("reset_token", reset_token);
    }

    const { data, error } = await dbQuery.maybeSingle<User>();

    if (error) throw error;

    return data;
  }

  async create(input: { userData: UserInsert }) {
    const { data, error } = await this.db.from("users").insert([input.userData]).select(this.fields).single();

    if (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }

    return data;
  }

  async update(input: { userId: number; userData: UserUpdate }) {
    const { data, error } = await this.db
      .from("users")
      .update(input.userData)
      .eq("user_id", input.userId)
      .select(this.fields)
      .maybeSingle();

    if (error) {
      if (error.message.includes("no rows found")) {
        throw new NotFoundError({ message: `User with ID ${input.userId} not found` });
      }
      throw new Error(`Failed to update user with ID ${input.userId}: ${error.message}`);
    }

    return data;
  }

  async delete(userId: number) {
    const { data, error } = await this.db
      .from("users")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .select(this.fields)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }
}

export default new UserRepository();
