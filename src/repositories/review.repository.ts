import { supabase } from "@/config/supabase";
import { Review, ReviewInsert, ReviewQueryParams, ReviewUpdate, ReviewType } from "@/types/common";
import _ from "lodash";

const ReviewRepository = {
  async findAll(params: ReviewQueryParams) {
    const page = _.get(params, "page", 1);
    const limit = _.get(params, "limit", 10);
    const hasPagination = page > 0 && limit > 0;

    let query = supabase.from("reviews").select("*, applications(*, companies(*))", { count: "exact" });

    if (params.id) query = query.eq("id", params.id);
    if (params.application_id) query = query.eq("application_id", params.application_id);
    if (params.reviewer_id) query = query.eq("reviewer_id", params.reviewer_id);
    if (params.type) query = query.eq("type", params.type);
    if (params.is_approved !== undefined) query = query.eq("is_approved", params.is_approved);
    
    // Fetch reviews for a company (via application table)
    if (params.company_id) {
       // Fetch only reviews where the linked application belongs to this company
       query = supabase.from("reviews").select("*, applications!inner(*, companies(*))", { count: "exact" });
       query = query.eq("applications.company_id", params.company_id);
    }

    if (hasPagination) {
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);
    }

    const order = _.get(params, "order", "desc");
    query = query.order("created_at", { ascending: order === "asc" });

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      data: data as any[],
      pagination: hasPagination && {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
      },
    };
  },

  async findOne(id: number): Promise<Review | null> {
    const { data, error } = await supabase
        .from("reviews")
        .select("*, applications(*, companies(*))")
        .eq("id", id)
        .single();
    
    if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
    }
    return data as any;
  },

  async create(payload: ReviewInsert): Promise<Review> {
    const { data, error } = await supabase.from("reviews").insert(payload).select().single();
    if (error) throw error;
    return data as Review;
  },

  async update(id: number, payload: ReviewUpdate): Promise<Review> {
    const { data, error } = await supabase.from("reviews").update(payload).eq("id", id).select().single();
    if (error) throw error;
    return data as Review;
  },

  async delete(id: number): Promise<void> {
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) throw error;
  },

  async findByApplicationIdAndType(applicationId: number, type: ReviewType): Promise<Review | null> {
    const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("application_id", applicationId)
        .eq("type", type)
        .maybeSingle();
    
    if (error) throw error;
    return data as Review;
  }
};

export default ReviewRepository;
