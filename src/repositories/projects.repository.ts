import { supabase } from "@/config/supabase";
import { Project, ProjectInsert, ProjectUpdate } from "@/types/common";

const projectsRepository = {
  async findAll(options: {
    page: number;
    limit: number;
  }): Promise<{ data: Project[]; pagination: { page: number; limit: number; total: number } }> {
    const { page, limit } = options;
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { data, error, count } = await supabase.from("projects").select("*", { count: "exact" }).range(from, to);
    if (error) throw error;
    return {
      data: data as Project[],
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
  ): Promise<{ data: Project[]; pagination: { page: number; limit: number; total: number } }> {
    const { page, limit } = options;
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { data, error, count } = await supabase
      .from("projects")
      .select("*", { count: "exact" })
      .eq("student_id", student_id)
      .range(from, to);
    if (error) throw error;
    return {
      data: data as Project[],
      pagination: {
        page,
        limit,
        total: count || 0,
      },
    };
  },

  async findOne(id: number): Promise<Project | null> {
    const { data, error } = await supabase.from("projects").select("*").eq("id", id).single();
    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return data as Project;
  },

  async insert(payload: ProjectInsert): Promise<Project> {
    const { data, error } = await supabase.from("projects").insert(payload).select().single();
    if (error) throw error;
    return data as Project;
  },

  async update(id: number, payload: ProjectUpdate): Promise<Project> {
    const { data, error } = await supabase.from("projects").update(payload).eq("id", id).select().single();
    if (error) throw error;
    return data as Project;
  },

  async remove(id: number): Promise<void> {
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) throw error;
    return;
  },

  async bulkDelete(studentId: number) {
    const { data, error } = await supabase.from("projects").delete().eq("student_id", studentId).select("id");
    if (error) throw error;
    return data;
  }
};

export default projectsRepository;
