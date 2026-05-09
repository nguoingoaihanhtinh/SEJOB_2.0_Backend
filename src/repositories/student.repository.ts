import { supabase } from "@/config/supabase";
import { StudentUpdate, StudentInsert, StudentQueryParams, Student, StudentQueryAllParams } from "@/types/common";
import { NotFoundError } from "@/utils/errors";
import { SupabaseClient } from "@supabase/supabase-js";
import _ from "lodash";
export class StudentRepository {
  private readonly db: SupabaseClient;
  public readonly fields =
    "id, user_id, about, location, location_id, skills, open_for_opportunities, phone_number, desired_positions, date_of_birth, gender, created_at, updated_at";

  constructor() {
    this.db = supabase;
  }

  // BUG: https://github.com/supabase/supabase-js/issues/1571
  async findAll<T>(input: StudentQueryAllParams) {
    const fields = _.get(input, "fields", this.fields);
    const page = _.get(input, "page");
    const limit = _.get(input, "limit");
    const keyword = _.get(input, "keyword");
    const student_ids = _.get(input, "student_ids") || [];
    const user_ids = _.get(input, "user_ids") || [];
    const hasPagination = page && limit;

    let selectString = fields;
    selectString = `${selectString}, users!inner(user_id, avatar, first_name, last_name, is_active, email)`;

    let dbQuery = this.db.from("student").select(selectString, { count: "exact" });

    if (student_ids.length) {
      dbQuery = dbQuery.in("id", student_ids);
    }

    if (user_ids.length) {
      dbQuery = dbQuery.in("user_id", user_ids);
    }
    const executeQuery = hasPagination ? dbQuery.range((page - 1) * limit, page * limit - 1) : dbQuery;

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

  async findOne(input: StudentQueryParams) {
    // const { user_id, student_id = [], fields } = input;
    const { user_id, student_id, fields } = input;
    const select_fields = fields || this.fields;

    let dbQuery = this.db.from("student").select(select_fields);

    if (user_id) {
      dbQuery = dbQuery.eq("user_id", user_id);
    }

    if (student_id) {
      dbQuery = dbQuery.eq("id", student_id);
    }

    const { data, error } = await dbQuery.maybeSingle<Student>();

    if (error) throw error;

    return data;
  }

  async create(input: { studentData: StudentInsert }) {
    const { data, error } = await this.db.from("student").insert([input.studentData]).select(this.fields).single();

    if (error) {
      throw new Error(`Failed to create student: ${error.message}`);
    }

    return data;
  }

  async update(input: { userId?: number; studentId?: number; studentData: StudentUpdate }) {
    const { studentId, userId, studentData } = input;

    if (!studentId && !userId) {
      throw new Error("Either studentId or userId must be provided");
    }

    let query = this.db.from("student").update(studentData);

    if (studentId) {
      query = query.eq("id", studentId);
    }
    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query.select(this.fields).maybeSingle();

    if (error) {
      if (error.message.includes("no rows found")) {
        throw new NotFoundError({
          message: `Student not found with ${studentId ? `studentId ${studentId}` : `userId ${userId}`}`,
        });
      }
      throw new Error(
        `Failed to update student with ${studentId ? `studentId ${studentId}` : `userId ${userId}`}: ${error.message}`
      );
    }

    return data;
  }

  async delete(studentId: number) {
    const { data, error } = await this.db
      .from("student")
      .delete()
      .eq("id", studentId)
      .select(this.fields)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }
  async findByUserId(user_id: number) {
    const { data, error } = await this.db
      .from("student")
      .select(this.fields)
      .eq("user_id", user_id)
      .maybeSingle<Student>();

    if (error) throw error;
    return data;
  }
}

export default new StudentRepository();
