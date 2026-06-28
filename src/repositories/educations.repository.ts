import { supabase } from "@/config/supabase";
import { Education, EducationInsert, EducationUpdate } from "@/types/common";
import { de } from "zod/v4/locales";

const EducationRepository = {
  async findAll(options: {
    page: number;
    limit: number;
  }): Promise<{ data: Education[]; pagination: { page: number; limit: number; total: number } }> {
    const { page, limit } = options;
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { data, error, count } = await supabase.from("educations").select("*", { count: "exact" }).range(from, to);
    if (error) throw error;
    return {
      data: data as Education[],
      pagination: {
        page,
        limit,
        total: count || 0,
      },
    };
  },

  async findByStudentId(
    studentId: number,
    options: { page: number; limit: number }
  ): Promise<{ data: Education[]; pagination: { page: number; limit: number; total: number } }> {
    const { page, limit } = options;
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { data, error, count } = await supabase
      .from("educations")
      .select("*", { count: "exact" })
      .eq("student_id", studentId)
      .range(from, to);
    if (error) throw error;
    return {
      data: data as Education[],
      pagination: {
        page,
        limit,
        total: count || 0,
      },
    };
  },

  async findOne(id: number): Promise<Education | null> {
    const { data, error } = await supabase.from("educations").select("*").eq("id", id).single();
    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return data as Education;
  },

  async insert(payload: EducationInsert): Promise<Education> {
    const { data, error } = await supabase.from("educations").insert(payload).select().single();
    if (error) throw error;
    return data as Education;
  },

  async update(id: number, payload: EducationUpdate): Promise<Education> {
    const { data, error } = await supabase.from("educations").update(payload).eq("id", id).select().single();
    if (error) throw error;
    return data as Education;
  },

  async remove(id: number): Promise<void> {
    const { error } = await supabase.from("educations").delete().eq("id", id);
    if (error) throw error;
    return;
  },

  async bulkDelete(studentId: number) {
    const { data, error } = await supabase.from("educations").delete().eq("student_id", studentId).select("id");
    if (error) throw error;
    return data;
  }
};
export default EducationRepository;
