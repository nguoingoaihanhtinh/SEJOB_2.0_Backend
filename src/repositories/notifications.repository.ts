import { supabase } from "@/config/supabase";
import { SupabaseClient } from "@supabase/supabase-js";
import _ from "lodash";
import { NotificationInsert, NotificationQueryAll, NotificationUpdate } from "@/types/common";

export class NotificationRepository {
  private readonly db: SupabaseClient;
  public readonly fields = "id, type, title, content, sender_id, receiver_id, status, is_read, sent_at, created_at, updated_at";

  constructor() {
    this.db = supabase;
  }

  async findAll(input: NotificationQueryAll) {
    const { page, limit, receiver_id } = input;
    const hasPagination = page && limit;
    const fields = _.get(input, "fields", this.fields);

    let dbQuery = this.db.from("notifications").select(fields, { count: "exact" });

    if (receiver_id) {
      dbQuery = dbQuery.eq("receiver_id", receiver_id);
    }

    dbQuery = dbQuery.order("created_at", { ascending: false });

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
    const { data, error } = await this.db.from("notifications").select(this.fields).eq("id", id).maybeSingle();

    if (error) throw error;

    return data;
  }

  async create(input: { data: NotificationInsert }) {
    const { data, error } = await this.db.from("notifications").insert([input.data]).select(this.fields).single();

    if (error) throw error;

    return data;
  }

  async update(query: NotificationQueryAll, input: NotificationUpdate) {
    const filteredData = _.pickBy(input, (v) => v !== null && v !== undefined && v !== "");

    let dbQuery = this.db.from("notifications").update(filteredData);

    if (query.receiver_id) {
      dbQuery = dbQuery.eq("receiver_id", query.receiver_id);
    }
    
    if (query.ids && query.ids.length > 0) {
      dbQuery = dbQuery.in("id", query.ids);
    }

    const { data, error } = await dbQuery.select(this.fields);

    if (error) throw error;

    return data;
  }

  async delete(id: number) {
    const { data, error } = await this.db.from("notifications").delete().eq("id", id).select(this.fields).maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }
}

export default new NotificationRepository();
