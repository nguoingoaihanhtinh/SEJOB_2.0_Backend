import { supabase } from "@/config/supabase";
import { Certification, CertificationInsert, CertificationUpdate } from "@/types/common";

const certificationsRepository = {
  async findAll(options: {
    page: number;
    limit: number;
  }): Promise<{ data: Certification[]; pagination: { page: number; limit: number; total: number } }> {
    const { page, limit } = options;
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { data, error, count } = await supabase
      .from("certifications")
      .select("*", { count: "exact" })
      .range(from, to);
    if (error) throw error;
    return {
      data: data as Certification[],
      pagination: {
        page,
        limit,
        total: count || 0,
      },
    };
  },

  async findByStudentId(
    student_id: number,
    options: { page: number; limit: number }
  ): Promise<{ data: Certification[]; pagination: { page: number; limit: number; total: number } }> {
    const { page, limit } = options;
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { data, error, count } = await supabase
      .from("certifications")
      .select("*", { count: "exact" })
      .eq("student_id", student_id)
      .range(from, to);
    if (error) throw error;
    return {
      data: data as Certification[],
      pagination: {
        page,
        limit,
        total: count || 0,
      },
    };
  },

  async findOne(id: number): Promise<Certification | null> {
    const { data, error } = await supabase.from("certifications").select("*").eq("id", id).single();
    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return data as Certification;
  },

  async insert(payload: CertificationInsert): Promise<Certification> {
    const { data, error } = await supabase.from("certifications").insert(payload).select().single();
    if (error) throw error;
    return data as Certification;
  },

  async update(id: number, payload: CertificationUpdate): Promise<Certification> {
    const { data, error } = await supabase.from("certifications").update(payload).eq("id", id).select().single();
    if (error) throw error;
    return data as Certification;
  },

  async remove(id: number): Promise<void> {
    const { error } = await supabase.from("certifications").delete().eq("id", id);
    if (error) throw error;
    return;
  },

  async bulkDelete(studentId: number) {
    const { data, error } = await supabase.from("certifications").delete().eq("student_id", studentId).select("id");
    if (error) throw error;
    return data;
  }
};

export default certificationsRepository;
