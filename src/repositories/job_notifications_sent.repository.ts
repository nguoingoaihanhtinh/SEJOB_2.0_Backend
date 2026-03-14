import { supabase } from "@/config/supabase";
import { SupabaseClient } from "@supabase/supabase-js";

export interface JobNotificationSent {
  id: number;
  job_id: number;
  student_id: number;
  email_address: string;
  email_sent_at: string;
  created_at: string;
}

export interface JobNotificationSentInsert {
  job_id: number;
  student_id: number;
  email_address: string;
  email_sent_at?: string;
}

export class JobNotificationSentRepository {
  private readonly db: SupabaseClient;
  public readonly fields = "id, job_id, student_id, email_address, email_sent_at, created_at";

  constructor() {
    this.db = supabase;
  }

  async findByJobAndStudent(jobId: number, studentId: number): Promise<JobNotificationSent | null> {
    const { data, error } = await this.db
      .from("job_notifications_sent")
      .select(this.fields)
      .eq("job_id", jobId)
      .eq("student_id", studentId)
      .maybeSingle<JobNotificationSent>();

    if (error) throw error;
    return data;
  }

  async create(input: JobNotificationSentInsert): Promise<JobNotificationSent> {
    const { data, error } = await this.db
      .from("job_notifications_sent")
      .insert([input])
      .select(this.fields)
      .single<JobNotificationSent>();

    if (error) throw error;
    return data;
  }

  async findAllByJobId(jobId: number): Promise<JobNotificationSent[]> {
    const { data, error } = await this.db
      .from("job_notifications_sent")
      .select(this.fields)
      .eq("job_id", jobId);

    if (error) throw error;
    return data || [];
  }

  async deleteByJobAndStudent(jobId: number, studentId: number): Promise<void> {
    const { error } = await this.db
      .from("job_notifications_sent")
      .delete()
      .eq("job_id", jobId)
      .eq("student_id", studentId);

    if (error) throw error;
  }
}

export default new JobNotificationSentRepository();
