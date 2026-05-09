export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      application_status_details: {
        Row: {
          application_id: number | null
          created_at: string | null
          id: number
          interview_location: string | null
          interview_time: string | null
          offered_salary: string | null
          status: Database["public"]["Enums"]["applicationstatus"]
          updated_at: string | null
        }
        Insert: {
          application_id?: number | null
          created_at?: string | null
          id?: number
          interview_location?: string | null
          interview_time?: string | null
          offered_salary?: string | null
          status: Database["public"]["Enums"]["applicationstatus"]
          updated_at?: string | null
        }
        Update: {
          application_id?: number | null
          created_at?: string | null
          id?: number
          interview_location?: string | null
          interview_time?: string | null
          offered_salary?: string | null
          status?: Database["public"]["Enums"]["applicationstatus"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_status_details_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          additional_information: string | null
          company_id: number
          created_at: string
          cv_analysis: string | null
          cv_matched_skills: string[] | null
          cv_missing_requirements: string[] | null
          cv_score: number | null
          cv_score_breakdown: Json | null
          email: string
          feedback: string | null
          full_name: string
          id: number
          job_id: number
          linkedin_url: string | null
          phone: string
          portfolio_url: string | null
          previous_job: string | null
          resume_url: string
          reviewed_at: string | null
          status: Database["public"]["Enums"]["applicationstatus"]
          submitted_at: string
          updated_at: string
          user_id: number
        }
        Insert: {
          additional_information?: string | null
          company_id: number
          created_at?: string
          cv_analysis?: string | null
          cv_matched_skills?: string[] | null
          cv_missing_requirements?: string[] | null
          cv_score?: number | null
          cv_score_breakdown?: Json | null
          email: string
          feedback?: string | null
          full_name: string
          id?: never
          job_id: number
          linkedin_url?: string | null
          phone: string
          portfolio_url?: string | null
          previous_job?: string | null
          resume_url: string
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["applicationstatus"]
          submitted_at?: string
          updated_at?: string
          user_id: number
        }
        Update: {
          additional_information?: string | null
          company_id?: number
          created_at?: string
          cv_analysis?: string | null
          cv_matched_skills?: string[] | null
          cv_missing_requirements?: string[] | null
          cv_score?: number | null
          cv_score_breakdown?: Json | null
          email?: string
          feedback?: string | null
          full_name?: string
          id?: never
          job_id?: number
          linkedin_url?: string | null
          phone?: string
          portfolio_url?: string | null
          previous_job?: string | null
          resume_url?: string
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["applicationstatus"]
          submitted_at?: string
          updated_at?: string
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "application_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      candidate_skills: {
        Row: {
          candidate_id: number
          common_skill_id: number
          id: number
        }
        Insert: {
          candidate_id: number
          common_skill_id: number
          id?: number
        }
        Update: {
          candidate_id?: number
          common_skill_id?: number
          id?: number
        }
        Relationships: [
          {
            foreignKeyName: "candidate_skills_common_skill_id_fkey"
            columns: ["common_skill_id"]
            isOneToOne: false
            referencedRelation: "common_skills"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          id: number
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      certifications: {
        Row: {
          certification_url: string | null
          created_at: string | null
          description: string | null
          id: number
          issue_date: string | null
          name: string
          organization: string
          student_id: number | null
          updated_at: string | null
        }
        Insert: {
          certification_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: number
          issue_date?: string | null
          name: string
          organization: string
          student_id?: number | null
          updated_at?: string | null
        }
        Update: {
          certification_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: number
          issue_date?: string | null
          name?: string
          organization?: string
          student_id?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certifications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          created_at: string | null
          employer_id: number | null
          id: number
          job_id: number | null
          student_id: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          employer_id?: number | null
          id?: number
          job_id?: number | null
          student_id?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          employer_id?: number | null
          id?: number
          job_id?: number | null
          student_id?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "chat_conversations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: number | null
          created_at: string | null
          id: number
          is_read: boolean | null
          sender_id: number | null
        }
        Insert: {
          content: string
          conversation_id?: number | null
          created_at?: string | null
          id?: number
          is_read?: boolean | null
          sender_id?: number | null
        }
        Update: {
          content?: string
          conversation_id?: number | null
          created_at?: string | null
          id?: number
          is_read?: boolean | null
          sender_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      common_skills: {
        Row: {
          category: string | null
          id: number
          name: string
        }
        Insert: {
          category?: string | null
          id?: number
          name: string
        }
        Update: {
          category?: string | null
          id?: number
          name?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          background: string | null
          created_at: string | null
          description: string | null
          email: string | null
          employee_count: number | null
          external_id: number | null
          id: number
          images: string[] | null
          is_verified: boolean | null
          logo: string | null
          name: string
          phone: string | null
          socials: Json | null
          tech_stack: string[] | null
          updated_at: string | null
          user_id: number | null
          website_url: string | null
        }
        Insert: {
          background?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          employee_count?: number | null
          external_id?: number | null
          id?: number
          images?: string[] | null
          is_verified?: boolean | null
          logo?: string | null
          name: string
          phone?: string | null
          socials?: Json | null
          tech_stack?: string[] | null
          updated_at?: string | null
          user_id?: number | null
          website_url?: string | null
        }
        Update: {
          background?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          employee_count?: number | null
          external_id?: number | null
          id?: number
          images?: string[] | null
          is_verified?: boolean | null
          logo?: string | null
          name?: string
          phone?: string | null
          socials?: Json | null
          tech_stack?: string[] | null
          updated_at?: string | null
          user_id?: number | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      company_branches: {
        Row: {
          address: string | null
          company_id: number | null
          country_id: number | null
          created_at: string | null
          id: number
          name: string
          province_id: number | null
          updated_at: string | null
          ward_id: number | null
        }
        Insert: {
          address?: string | null
          company_id?: number | null
          country_id?: number | null
          created_at?: string | null
          id?: number
          name: string
          province_id?: number | null
          updated_at?: string | null
          ward_id?: number | null
        }
        Update: {
          address?: string | null
          company_id?: number | null
          country_id?: number | null
          created_at?: string | null
          id?: number
          name?: string
          province_id?: number | null
          updated_at?: string | null
          ward_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "company_branches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_branches_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_branches_province_id_fkey"
            columns: ["province_id"]
            isOneToOne: false
            referencedRelation: "provinces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_branches_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "wards"
            referencedColumns: ["id"]
          },
        ]
      }
      company_company_types: {
        Row: {
          company_id: number
          company_type_id: number
        }
        Insert: {
          company_id: number
          company_type_id: number
        }
        Update: {
          company_id?: number
          company_type_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "company_company_types_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_company_types_company_type_id_fkey"
            columns: ["company_type_id"]
            isOneToOne: false
            referencedRelation: "company_types"
            referencedColumns: ["id"]
          },
        ]
      }
      company_types: {
        Row: {
          created_at: string | null
          id: number
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      countries: {
        Row: {
          created_at: string | null
          id: number
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      cv: {
        Row: {
          createdat: string | null
          cvid: number
          filepath: string | null
          studentid: number | null
          title: string | null
        }
        Insert: {
          createdat?: string | null
          cvid?: never
          filepath?: string | null
          studentid?: number | null
          title?: string | null
        }
        Update: {
          createdat?: string | null
          cvid?: never
          filepath?: string | null
          studentid?: number | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cv_studentid_fkey"
            columns: ["studentid"]
            isOneToOne: false
            referencedRelation: "student"
            referencedColumns: ["id"]
          },
        ]
      }
      districts: {
        Row: {
          created_at: string | null
          id: number
          name: string
          province_id: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          name: string
          province_id?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          name?: string
          province_id?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "districts_province_id_fkey"
            columns: ["province_id"]
            isOneToOne: false
            referencedRelation: "provinces"
            referencedColumns: ["id"]
          },
        ]
      }
      educations: {
        Row: {
          degree: string | null
          description: string | null
          end_date: string | null
          id: number
          major: string | null
          school: string
          start_date: string | null
          student_id: number | null
        }
        Insert: {
          degree?: string | null
          description?: string | null
          end_date?: string | null
          id?: never
          major?: string | null
          school: string
          start_date?: string | null
          student_id?: number | null
        }
        Update: {
          degree?: string | null
          description?: string | null
          end_date?: string | null
          id?: never
          major?: string | null
          school?: string
          start_date?: string | null
          student_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "educations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student"
            referencedColumns: ["id"]
          },
        ]
      }
      employment_types: {
        Row: {
          created_at: string | null
          id: number
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      experiences: {
        Row: {
          company: string
          description: string | null
          end_date: string | null
          id: number
          is_current: boolean | null
          location: string | null
          position: string
          start_date: string
          student_id: number | null
        }
        Insert: {
          company: string
          description?: string | null
          end_date?: string | null
          id?: never
          is_current?: boolean | null
          location?: string | null
          position: string
          start_date: string
          student_id?: number | null
        }
        Update: {
          company?: string
          description?: string | null
          end_date?: string | null
          id?: never
          is_current?: boolean | null
          location?: string | null
          position?: string
          start_date?: string
          student_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "experiences_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student"
            referencedColumns: ["id"]
          },
        ]
      }
      job_categories: {
        Row: {
          category_id: number
          job_id: number
        }
        Insert: {
          category_id: number
          job_id: number
        }
        Update: {
          category_id?: number
          job_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "job_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_categories_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_company_branches: {
        Row: {
          company_branch_id: number
          job_id: number
        }
        Insert: {
          company_branch_id: number
          job_id: number
        }
        Update: {
          company_branch_id?: number
          job_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "job_company_branches_company_branch_id_fkey"
            columns: ["company_branch_id"]
            isOneToOne: false
            referencedRelation: "company_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_company_branches_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_employment_types: {
        Row: {
          employment_type_id: number
          job_id: number
        }
        Insert: {
          employment_type_id: number
          job_id: number
        }
        Update: {
          employment_type_id?: number
          job_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "job_employment_types_employment_type_id_fkey"
            columns: ["employment_type_id"]
            isOneToOne: false
            referencedRelation: "employment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_employment_types_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_levels: {
        Row: {
          job_id: number
          level_id: number
        }
        Insert: {
          job_id: number
          level_id: number
        }
        Update: {
          job_id?: number
          level_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "job_levels_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_levels_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
        ]
      }
      job_media: {
        Row: {
          id: number
          job_id: number | null
          link: string | null
          type: string | null
        }
        Insert: {
          id?: never
          job_id?: number | null
          link?: string | null
          type?: string | null
        }
        Update: {
          id?: never
          job_id?: number | null
          link?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_media_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_notification_subscriptions: {
        Row: {
          created_at: string | null
          id: number
          is_active: boolean | null
          student_id: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          student_id: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          student_id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_notification_subscriptions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "student"
            referencedColumns: ["id"]
          },
        ]
      }
      job_notifications_sent: {
        Row: {
          created_at: string | null
          email_address: string
          email_sent_at: string | null
          id: number
          job_id: number
          student_id: number
        }
        Insert: {
          created_at?: string | null
          email_address: string
          email_sent_at?: string | null
          id?: number
          job_id: number
          student_id: number
        }
        Update: {
          created_at?: string | null
          email_address?: string
          email_sent_at?: string | null
          id?: number
          job_id?: number
          student_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "job_notifications_sent_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_notifications_sent_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student"
            referencedColumns: ["id"]
          },
        ]
      }
      job_skills: {
        Row: {
          job_id: number
          skill_id: number
        }
        Insert: {
          job_id: number
          skill_id: number
        }
        Update: {
          job_id?: number
          skill_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "job_skills_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          apply_guide: string | null
          apply_reasons: string[] | null
          benefit: Json | null
          company_id: number | null
          created_at: string | null
          description: string | null
          external_id: number | null
          id: number
          is_diamond: boolean | null
          is_hot: boolean | null
          is_job_flash_active: boolean | null
          job_deadline: string | null
          job_posted_at: string | null
          nice_to_haves: string[] | null
          quantity: number | null
          requirement: string[] | null
          responsibilities: string[] | null
          salary_currency: string | null
          salary_from: number | null
          salary_text: string | null
          salary_to: number | null
          status: Database["public"]["Enums"]["jobstatus"] | null
          title: string
          updated_at: string | null
          website_url: string | null
          working_time: string | null
        }
        Insert: {
          apply_guide?: string | null
          apply_reasons?: string[] | null
          benefit?: Json | null
          company_id?: number | null
          created_at?: string | null
          description?: string | null
          external_id?: number | null
          id?: never
          is_diamond?: boolean | null
          is_hot?: boolean | null
          is_job_flash_active?: boolean | null
          job_deadline?: string | null
          job_posted_at?: string | null
          nice_to_haves?: string[] | null
          quantity?: number | null
          requirement?: string[] | null
          responsibilities?: string[] | null
          salary_currency?: string | null
          salary_from?: number | null
          salary_text?: string | null
          salary_to?: number | null
          status?: Database["public"]["Enums"]["jobstatus"] | null
          title: string
          updated_at?: string | null
          website_url?: string | null
          working_time?: string | null
        }
        Update: {
          apply_guide?: string | null
          apply_reasons?: string[] | null
          benefit?: Json | null
          company_id?: number | null
          created_at?: string | null
          description?: string | null
          external_id?: number | null
          id?: never
          is_diamond?: boolean | null
          is_hot?: boolean | null
          is_job_flash_active?: boolean | null
          job_deadline?: string | null
          job_posted_at?: string | null
          nice_to_haves?: string[] | null
          quantity?: number | null
          requirement?: string[] | null
          responsibilities?: string[] | null
          salary_currency?: string | null
          salary_from?: number | null
          salary_text?: string | null
          salary_to?: number | null
          status?: Database["public"]["Enums"]["jobstatus"] | null
          title?: string
          updated_at?: string | null
          website_url?: string | null
          working_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      levels: {
        Row: {
          created_at: string | null
          id: number
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      notification: {
        Row: {
          createdat: string | null
          id: number
          isread: boolean | null
          message: string
          type: Database["public"]["Enums"]["notificationtype"] | null
          userid: number | null
        }
        Insert: {
          createdat?: string | null
          id?: never
          isread?: boolean | null
          message: string
          type?: Database["public"]["Enums"]["notificationtype"] | null
          userid?: number | null
        }
        Update: {
          createdat?: string | null
          id?: never
          isread?: boolean | null
          message?: string
          type?: Database["public"]["Enums"]["notificationtype"] | null
          userid?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_userid_fkey"
            columns: ["userid"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      notifications: {
        Row: {
          content: string
          created_at: string
          data: Json | null
          id: number
          is_read: boolean
          receiver_id: number
          sender_id: number
          sent_at: string | null
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          data?: Json | null
          id?: number
          is_read?: boolean
          receiver_id: number
          sender_id: number
          sent_at?: string | null
          status: string
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          data?: Json | null
          id?: number
          is_read?: boolean
          receiver_id?: number
          sender_id?: number
          sent_at?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_notifications_receiver"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_notifications_sender"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      portfolios: {
        Row: {
          description: string | null
          id: number
          image_url: string | null
          link: string | null
          student_id: number | null
          title: string
        }
        Insert: {
          description?: string | null
          id?: never
          image_url?: string | null
          link?: string | null
          student_id?: number | null
          title: string
        }
        Update: {
          description?: string | null
          id?: never
          image_url?: string | null
          link?: string | null
          student_id?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolios_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string | null
          description: string | null
          end_date: string | null
          id: number
          is_working_on: boolean | null
          name: string
          start_date: string | null
          student_id: number | null
          updated_at: string | null
          website_link: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: number
          is_working_on?: boolean | null
          name: string
          start_date?: string | null
          student_id?: number | null
          updated_at?: string | null
          website_link?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: number
          is_working_on?: boolean | null
          name?: string
          start_date?: string | null
          student_id?: number | null
          updated_at?: string | null
          website_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student"
            referencedColumns: ["id"]
          },
        ]
      }
      provinces: {
        Row: {
          country_id: number | null
          created_at: string | null
          id: number
          name: string
          updated_at: string | null
        }
        Insert: {
          country_id?: number | null
          created_at?: string | null
          id?: number
          name: string
          updated_at?: string | null
        }
        Update: {
          country_id?: number | null
          created_at?: string | null
          id?: number
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provinces_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          application_id: number | null
          comment: string | null
          created_at: string | null
          id: number
          is_approved: boolean | null
          rating: number
          reviewer_id: number | null
          type: string
          updated_at: string | null
        }
        Insert: {
          application_id?: number | null
          comment?: string | null
          created_at?: string | null
          id?: number
          is_approved?: boolean | null
          rating: number
          reviewer_id?: number | null
          type: string
          updated_at?: string | null
        }
        Update: {
          application_id?: number | null
          comment?: string | null
          created_at?: string | null
          id?: number
          is_approved?: boolean | null
          rating?: number
          reviewer_id?: number | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      saved_jobs: {
        Row: {
          created_at: string | null
          id: number
          job_id: number
          updated_at: string | null
          user_id: number
        }
        Insert: {
          created_at?: string | null
          id?: number
          job_id: number
          updated_at?: string | null
          user_id: number
        }
        Update: {
          created_at?: string | null
          id?: number
          job_id?: number
          updated_at?: string | null
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "saved_jobs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      skill_mappings: {
        Row: {
          category: string | null
          created_at: string | null
          id: number
          is_active: boolean | null
          related_skills: string[] | null
          skill_name: string
          synonyms: string[] | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          related_skills?: string[] | null
          skill_name: string
          synonyms?: string[] | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          related_skills?: string[] | null
          skill_name?: string
          synonyms?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      skills: {
        Row: {
          created_at: string | null
          id: number
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      social_links: {
        Row: {
          id: number
          platform: string
          student_id: number | null
          url: string
        }
        Insert: {
          id?: never
          platform: string
          student_id?: number | null
          url: string
        }
        Update: {
          id?: never
          platform?: string
          student_id?: number | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_links_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student"
            referencedColumns: ["id"]
          },
        ]
      }
      student: {
        Row: {
          about: string | null
          created_at: string | null
          date_of_birth: string | null
          desired_positions: string[] | null
          gender: string | null
          id: number
          location: string | null
          location_id: number | null
          open_for_opportunities: boolean | null
          phone_number: string | null
          skills: string[] | null
          updated_at: string | null
          user_id: number | null
        }
        Insert: {
          about?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          desired_positions?: string[] | null
          gender?: string | null
          id?: never
          location?: string | null
          location_id?: number | null
          open_for_opportunities?: boolean | null
          phone_number?: string | null
          skills?: string[] | null
          updated_at?: string | null
          user_id?: number | null
        }
        Update: {
          about?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          desired_positions?: string[] | null
          gender?: string | null
          id?: never
          location?: string | null
          location_id?: number | null
          open_for_opportunities?: boolean | null
          phone_number?: string | null
          skills?: string[] | null
          updated_at?: string | null
          user_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "student_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      users: {
        Row: {
          avatar: string | null
          created_at: string | null
          email: string
          first_name: string
          is_active: boolean
          is_verified: boolean | null
          last_name: string
          password: string
          reset_token: string | null
          reset_token_expires: string | null
          role: Database["public"]["Enums"]["role"]
          updated_at: string | null
          user_id: number
        }
        Insert: {
          avatar?: string | null
          created_at?: string | null
          email: string
          first_name: string
          is_active?: boolean
          is_verified?: boolean | null
          last_name: string
          password: string
          reset_token?: string | null
          reset_token_expires?: string | null
          role?: Database["public"]["Enums"]["role"]
          updated_at?: string | null
          user_id?: number
        }
        Update: {
          avatar?: string | null
          created_at?: string | null
          email?: string
          first_name?: string
          is_active?: boolean
          is_verified?: boolean | null
          last_name?: string
          password?: string
          reset_token?: string | null
          reset_token_expires?: string | null
          role?: Database["public"]["Enums"]["role"]
          updated_at?: string | null
          user_id?: number
        }
        Relationships: []
      }
      wards: {
        Row: {
          created_at: string | null
          id: number
          name: string
          province_id: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          name: string
          province_id?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          name?: string
          province_id?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wards_province_id_fkey"
            columns: ["province_id"]
            isOneToOne: false
            referencedRelation: "provinces"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_application: {
        Args: {
          q_company_id?: number
          q_id?: number
          q_job_id?: number
          q_user_id?: number
        }
        Returns: {
          additional_information: string
          company: Json
          company_id: number
          created_at: string
          cv_analysis: string
          cv_matched_skills: string[]
          cv_missing_requirements: string[]
          cv_score: number
          cv_score_breakdown: Json
          email: string
          feedback: string
          full_name: string
          id: number
          job: Json
          job_id: number
          linkedin_url: string
          phone: string
          portfolio_url: string
          previous_job: string
          resume_url: string
          reviewed_at: string
          status: Database["public"]["Enums"]["applicationstatus"]
          student: Json
          submitted_at: string
          updated_at: string
          user_id: number
        }[]
      }
      get_company_statistics: {
        Args: { company_id_param: number; year_param?: number }
        Returns: Json
      }
      match_cv_score: {
        Args: { search_keywords: string; target_job_id: number }
        Returns: number
      }
      search_application: {
        Args: {
          q_company_id?: number
          q_ids?: number[]
          q_job_id?: number
          q_limit?: number
          q_page?: number
          q_sort_by?: string
          q_sort_dir?: string
          q_statuses?: Database["public"]["Enums"]["applicationstatus"][]
          q_user_id?: number
        }
        Returns: {
          additional_information: string
          company_id: number
          created_at: string
          cv_analysis: string
          cv_matched_skills: string[]
          cv_missing_requirements: string[]
          cv_score: number
          cv_score_breakdown: Json
          email: string
          feedback: string
          full_name: string
          id: number
          job: Json
          job_id: number
          linkedin_url: string
          phone: string
          portfolio_url: string
          previous_job: string
          resume_url: string
          reviewed_at: string
          status: Database["public"]["Enums"]["applicationstatus"]
          student: Json
          submitted_at: string
          total: number
          updated_at: string
          user_id: number
        }[]
      }
      search_companies: {
        Args: {
          p_company_ids?: number[]
          p_company_type_ids?: number[]
          p_employee_count_from?: number
          p_employee_count_to?: number
          p_keyword?: string
          p_limit?: number
          p_page?: number
          p_user_ids?: number[]
        }
        Returns: {
          company_branches: Json
          company_types: Json
          created_at: string
          employee_count: number
          external_id: number
          id: number
          name: string
          total_count: number
          updated_at: string
          user_id: number
        }[]
      }
      search_job: {
        Args: {
          q_category_ids?: number[]
          q_company_id?: number
          q_employment_type_ids?: number[]
          q_job_ids?: number[]
          q_keyword?: string
          q_level_ids?: number[]
          q_limit?: number
          q_page?: number
          q_province_ids?: number[]
          q_salary_from?: number
          q_salary_to?: number
          q_skill_ids?: number[]
          q_sort_by?: string
          q_sort_dir?: string
          q_statuses?: Database["public"]["Enums"]["jobstatus"][]
        }
        Returns: {
          apply_guide: string
          apply_reasons: string[]
          benefit: Json
          categories: Json
          company: Json
          company_branches: Json
          company_id: number
          created_at: string
          description: string
          employment_types: Json
          external_id: number
          id: number
          is_diamond: boolean
          is_hot: boolean
          is_job_flash_active: boolean
          job_deadline: string
          job_posted_at: string
          levels: Json
          nice_to_haves: string[]
          quantity: number
          requirement: string[]
          responsibilities: string[]
          salary_currency: string
          salary_from: number
          salary_text: string
          salary_to: number
          skills: Json
          status: Database["public"]["Enums"]["jobstatus"]
          title: string
          total: number
          updated_at: string
          website_url: string
          working_time: string
        }[]
      }
    }
    Enums: {
      applicationstatus:
        | "Applied"
        | "Viewed"
        | "Interview_Scheduled"
        | "Hired"
        | "Rejected"
        | "Shortlisted"
        | "Offered"
        | "Cancelled"
      jobstatus: "Pending" | "Approved" | "Rejected" | "Closed"
      jobtype:
        | "Full-Time"
        | "Part-Time"
        | "Contract"
        | "Internship"
        | "Freelance"
      notificationtype: "System" | "Job" | "Application"
      role: "Student" | "Employer" | "Manager" | "Admin"
      status: "Active" | "Inactive" | "Banned"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      applicationstatus: [
        "Applied",
        "Viewed",
        "Interview_Scheduled",
        "Hired",
        "Rejected",
        "Shortlisted",
        "Offered",
        "Cancelled",
      ],
      jobstatus: ["Pending", "Approved", "Rejected", "Closed"],
      jobtype: [
        "Full-Time",
        "Part-Time",
        "Contract",
        "Internship",
        "Freelance",
      ],
      notificationtype: ["System", "Job", "Application"],
      role: ["Student", "Employer", "Manager", "Admin"],
      status: ["Active", "Inactive", "Banned"],
    },
  },
} as const
