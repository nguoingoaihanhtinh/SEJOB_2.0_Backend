import { supabase } from "@/config/supabase";
import { ApplicationStatusDetailsInsert, ApplicationStatusDetailsUpdate } from "@/types/common";
import { SupabaseClient } from "@supabase/supabase-js";

export class ApplicationStatusDetailsRepository {
    private readonly db: SupabaseClient;
    public readonly fields =
        "id, application_id, status, interview_time, interview_location, offered_salary, created_at, updated_at";

    constructor() {
        this.db = supabase;
    }

    async findOne(id: number) {
        const { data, error } = await this.db
            .from("application_status_details")
            .select(this.fields)
            .eq("id", id)
            .single();
        if (error) throw error;
        return data;
    }

    async getByApplicationId(application_id: number) {
        const { data, error } = await this.db
            .from("application_status_details")
            .select(this.fields)
            .eq("application_id", application_id)
            .single();

        if (error) throw error;
        return data;
    }

    async getLatestByApplicationId(application_id: number) {
        const { data, error } = await this.db
            .from("application_status_details")
            .select(this.fields)
            .eq("application_id", application_id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    async create(input: ApplicationStatusDetailsInsert) {
        const { data: result, error } = await this.db
            .from('application_status_details')
            .insert(input)
            .select()
            .single();

        if (error) throw error;
        return result;
    }

    async update(id: number, input: ApplicationStatusDetailsUpdate) {
        const { data: result, error } = await this.db
            .from('application_status_details')
            .update(input)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return result;
    }
}

export default new ApplicationStatusDetailsRepository();