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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      applications: {
        Row: {
          appliedAt: string
          id: string
          jobId: string
          note: string | null
          status: Database["public"]["Enums"]["ApplicationStatus"]
          updatedAt: string
          userId: string
        }
        Insert: {
          appliedAt?: string
          id?: string
          jobId: string
          note?: string | null
          status?: Database["public"]["Enums"]["ApplicationStatus"]
          updatedAt: string
          userId: string
        }
        Update: {
          appliedAt?: string
          id?: string
          jobId?: string
          note?: string | null
          status?: Database["public"]["Enums"]["ApplicationStatus"]
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_jobId_fkey"
            columns: ["jobId"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      card_assets: {
        Row: {
          card_id: string
          created_at: string
          generation_id: string | null
          id: string
          metadata: Json
          note: string
          owner_id: string
          scene_key: string | null
          source: string
          storage_path: string | null
          title: string
          type: string
          updated_at: string
          url: string
        }
        Insert: {
          card_id: string
          created_at?: string
          generation_id?: string | null
          id?: string
          metadata?: Json
          note?: string
          owner_id: string
          scene_key?: string | null
          source?: string
          storage_path?: string | null
          title: string
          type: string
          updated_at?: string
          url: string
        }
        Update: {
          card_id?: string
          created_at?: string
          generation_id?: string | null
          id?: string
          metadata?: Json
          note?: string
          owner_id?: string
          scene_key?: string | null
          source?: string
          storage_path?: string | null
          title?: string
          type?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_assets_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "content_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_assets_generation_id_fkey"
            columns: ["generation_id"]
            isOneToOne: false
            referencedRelation: "generation_records"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          createdAt: string
          description: string | null
          id: string
          location: string | null
          logoUrl: string | null
          name: string
          updatedAt: string
          verified: boolean
          website: string | null
        }
        Insert: {
          createdAt?: string
          description?: string | null
          id?: string
          location?: string | null
          logoUrl?: string | null
          name: string
          updatedAt: string
          verified?: boolean
          website?: string | null
        }
        Update: {
          createdAt?: string
          description?: string | null
          id?: string
          location?: string | null
          logoUrl?: string | null
          name?: string
          updatedAt?: string
          verified?: boolean
          website?: string | null
        }
        Relationships: []
      }
      content_cards: {
        Row: {
          ai_suggestions: Json
          analytics_journal: Json
          created_at: string
          experiment_tags: string[]
          format: string
          id: string
          inbox_item_id: string | null
          owner_id: string
          platform: string
          script_lab: Json
          shoot_pack: Json
          status: string
          title: string
          topic_tags: string[]
          updated_at: string
        }
        Insert: {
          ai_suggestions?: Json
          analytics_journal?: Json
          created_at?: string
          experiment_tags?: string[]
          format: string
          id?: string
          inbox_item_id?: string | null
          owner_id: string
          platform: string
          script_lab?: Json
          shoot_pack?: Json
          status: string
          title: string
          topic_tags?: string[]
          updated_at?: string
        }
        Update: {
          ai_suggestions?: Json
          analytics_journal?: Json
          created_at?: string
          experiment_tags?: string[]
          format?: string
          id?: string
          inbox_item_id?: string | null
          owner_id?: string
          platform?: string
          script_lab?: Json
          shoot_pack?: Json
          status?: string
          title?: string
          topic_tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_content_cards_inbox_item"
            columns: ["inbox_item_id"]
            isOneToOne: false
            referencedRelation: "inbox_items"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_settings: {
        Row: {
          creator_context: string | null
          gemini_api_key: string | null
          gemini_api_key_encrypted: string | null
          huggingface_api_key_encrypted: string | null
          nim_api_key: string | null
          nim_api_key_encrypted: string | null
          openrouter_api_key: string | null
          openrouter_api_key_encrypted: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          creator_context?: string | null
          gemini_api_key?: string | null
          gemini_api_key_encrypted?: string | null
          huggingface_api_key_encrypted?: string | null
          nim_api_key?: string | null
          nim_api_key_encrypted?: string | null
          openrouter_api_key?: string | null
          openrouter_api_key_encrypted?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          creator_context?: string | null
          gemini_api_key?: string | null
          gemini_api_key_encrypted?: string | null
          huggingface_api_key_encrypted?: string | null
          nim_api_key?: string | null
          nim_api_key_encrypted?: string | null
          openrouter_api_key?: string | null
          openrouter_api_key_encrypted?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      creator_social_accounts: {
        Row: {
          access_token_encrypted: string
          account_id: string
          account_name: string
          account_username: string
          created_at: string
          id: string
          metadata: Json
          platform: string
          profile_picture_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token_encrypted: string
          account_id: string
          account_name: string
          account_username: string
          created_at?: string
          id?: string
          metadata?: Json
          platform: string
          profile_picture_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token_encrypted?: string
          account_id?: string
          account_name?: string
          account_username?: string
          created_at?: string
          id?: string
          metadata?: Json
          platform?: string
          profile_picture_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      generation_records: {
        Row: {
          card_id: string
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          metadata: Json
          modality: string
          model: string
          owner_id: string
          prompt: string
          provider: string
          status: string
        }
        Insert: {
          card_id: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json
          modality: string
          model: string
          owner_id: string
          prompt: string
          provider: string
          status: string
        }
        Update: {
          card_id?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json
          modality?: string
          model?: string
          owner_id?: string
          prompt?: string
          provider?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "generation_records_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "content_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_items: {
        Row: {
          card_id: string | null
          created_at: string
          id: string
          notes: string
          owner_id: string
          source_type: string
          title: string
        }
        Insert: {
          card_id?: string | null
          created_at?: string
          id?: string
          notes?: string
          owner_id: string
          source_type: string
          title: string
        }
        Update: {
          card_id?: string | null
          created_at?: string
          id?: string
          notes?: string
          owner_id?: string
          source_type?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_items_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "content_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          applyUrl: string | null
          city: string | null
          companyId: string
          country: string
          createdAt: string
          currency: string
          description: string
          embedding: string | null
          experienceLevel: Database["public"]["Enums"]["ExperienceLevel"]
          hash: string | null
          id: string
          isActive: boolean
          lastSeenAt: string
          locationRaw: string | null
          postedAt: string | null
          remoteType: Database["public"]["Enums"]["RemoteType"]
          requirements: string[] | null
          salaryMax: number | null
          salaryMin: number | null
          source: Database["public"]["Enums"]["JobSource"]
          sourceId: string | null
          state: string | null
          title: string
          type: Database["public"]["Enums"]["JobType"]
          updatedAt: string
        }
        Insert: {
          applyUrl?: string | null
          city?: string | null
          companyId: string
          country?: string
          createdAt?: string
          currency?: string
          description: string
          embedding?: string | null
          experienceLevel?: Database["public"]["Enums"]["ExperienceLevel"]
          hash?: string | null
          id?: string
          isActive?: boolean
          lastSeenAt?: string
          locationRaw?: string | null
          postedAt?: string | null
          remoteType?: Database["public"]["Enums"]["RemoteType"]
          requirements?: string[] | null
          salaryMax?: number | null
          salaryMin?: number | null
          source?: Database["public"]["Enums"]["JobSource"]
          sourceId?: string | null
          state?: string | null
          title: string
          type?: Database["public"]["Enums"]["JobType"]
          updatedAt: string
        }
        Update: {
          applyUrl?: string | null
          city?: string | null
          companyId?: string
          country?: string
          createdAt?: string
          currency?: string
          description?: string
          embedding?: string | null
          experienceLevel?: Database["public"]["Enums"]["ExperienceLevel"]
          hash?: string | null
          id?: string
          isActive?: boolean
          lastSeenAt?: string
          locationRaw?: string | null
          postedAt?: string | null
          remoteType?: Database["public"]["Enums"]["RemoteType"]
          requirements?: string[] | null
          salaryMax?: number | null
          salaryMin?: number | null
          source?: Database["public"]["Enums"]["JobSource"]
          sourceId?: string | null
          state?: string | null
          title?: string
          type?: Database["public"]["Enums"]["JobType"]
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_companyId_fkey"
            columns: ["companyId"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_state: {
        Row: {
          completed_steps: string[] | null
          current_step: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_steps?: string[] | null
          current_step?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_steps?: string[] | null
          current_step?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      project_messages: {
        Row: {
          card_id: string
          content: string
          created_at: string
          id: string
          metadata: Json
          model: string | null
          owner_id: string
          provider: string | null
          role: string
        }
        Insert: {
          card_id: string
          content: string
          created_at?: string
          id?: string
          metadata?: Json
          model?: string | null
          owner_id: string
          provider?: string | null
          role: string
        }
        Update: {
          card_id?: string
          content?: string
          created_at?: string
          id?: string
          metadata?: Json
          model?: string | null
          owner_id?: string
          provider?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_messages_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "content_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      raw_jobs: {
        Row: {
          company: string
          createdAt: string
          data: Json
          id: string
          source: string
          sourceId: string
        }
        Insert: {
          company: string
          createdAt?: string
          data: Json
          id?: string
          source: string
          sourceId: string
        }
        Update: {
          company?: string
          createdAt?: string
          data?: Json
          id?: string
          source?: string
          sourceId?: string
        }
        Relationships: []
      }
      resumes: {
        Row: {
          file_name: string | null
          file_type: string | null
          file_url: string
          id: string
          status: string
          uploaded_at: string | null
          user_id: string
        }
        Insert: {
          file_name?: string | null
          file_type?: string | null
          file_url: string
          id?: string
          status?: string
          uploaded_at?: string | null
          user_id: string
        }
        Update: {
          file_name?: string | null
          file_type?: string | null
          file_url?: string
          id?: string
          status?: string
          uploaded_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      skills: {
        Row: {
          createdAt: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          createdAt?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          createdAt?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      skills_on_jobs: {
        Row: {
          jobId: string
          skillId: string
        }
        Insert: {
          jobId: string
          skillId: string
        }
        Update: {
          jobId?: string
          skillId?: string
        }
        Relationships: [
          {
            foreignKeyName: "skills_on_jobs_jobId_fkey"
            columns: ["jobId"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skills_on_jobs_skillId_fkey"
            columns: ["skillId"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      skills_on_users: {
        Row: {
          skillId: string
          userId: string
        }
        Insert: {
          skillId: string
          userId: string
        }
        Update: {
          skillId?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "skills_on_users_skillId_fkey"
            columns: ["skillId"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skills_on_users_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_analytics: {
        Row: {
          id: string
          matchRate: number
          profileViews: number
          swipesLeft: number
          swipesRight: number
          swipesTotal: number
          updatedAt: string
          userId: string
        }
        Insert: {
          id?: string
          matchRate?: number
          profileViews?: number
          swipesLeft?: number
          swipesRight?: number
          swipesTotal?: number
          updatedAt: string
          userId: string
        }
        Update: {
          id?: string
          matchRate?: number
          profileViews?: number
          swipesLeft?: number
          swipesRight?: number
          swipesTotal?: number
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_analytics_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          notice_period: string | null
          preferred_locations: string[] | null
          preferred_roles: string[] | null
          remote_preference: string | null
          salary_max: number | null
          salary_min: number | null
          total_experience_months: number | null
          updated_at: string | null
          user_id: string
          work_type: string | null
        }
        Insert: {
          notice_period?: string | null
          preferred_locations?: string[] | null
          preferred_roles?: string[] | null
          remote_preference?: string | null
          salary_max?: number | null
          salary_min?: number | null
          total_experience_months?: number | null
          updated_at?: string | null
          user_id: string
          work_type?: string | null
        }
        Update: {
          notice_period?: string | null
          preferred_locations?: string[] | null
          preferred_roles?: string[] | null
          remote_preference?: string | null
          salary_max?: number | null
          salary_min?: number | null
          total_experience_months?: number | null
          updated_at?: string | null
          user_id?: string
          work_type?: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          education: Json | null
          email: string | null
          experience: Json | null
          name: string | null
          parsed_json: Json | null
          phone: string | null
          projects: Json | null
          resume_id: string | null
          skills: string[] | null
          total_experience_months: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          education?: Json | null
          email?: string | null
          experience?: Json | null
          name?: string | null
          parsed_json?: Json | null
          phone?: string | null
          projects?: Json | null
          resume_id?: string | null
          skills?: string[] | null
          total_experience_months?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          education?: Json | null
          email?: string | null
          experience?: Json | null
          name?: string | null
          parsed_json?: Json | null
          phone?: string | null
          projects?: Json | null
          resume_id?: string | null
          skills?: string[] | null
          total_experience_months?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          avatarUrl: string | null
          bio: string | null
          createdAt: string
          email: string
          embedding: string | null
          id: string
          location: string | null
          name: string
          passwordHash: string
          resumeUrl: string | null
          role: Database["public"]["Enums"]["UserRole"]
          updatedAt: string
        }
        Insert: {
          avatarUrl?: string | null
          bio?: string | null
          createdAt?: string
          email: string
          embedding?: string | null
          id?: string
          location?: string | null
          name: string
          passwordHash: string
          resumeUrl?: string | null
          role?: Database["public"]["Enums"]["UserRole"]
          updatedAt: string
        }
        Update: {
          avatarUrl?: string | null
          bio?: string | null
          createdAt?: string
          email?: string
          embedding?: string | null
          id?: string
          location?: string | null
          name?: string
          passwordHash?: string
          resumeUrl?: string | null
          role?: Database["public"]["Enums"]["UserRole"]
          updatedAt?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      ApplicationStatus:
        | "PENDING"
        | "VIEWED"
        | "SHORTLISTED"
        | "REJECTED"
        | "HIRED"
      ExperienceLevel:
        | "FRESHER"
        | "JUNIOR"
        | "MID"
        | "SENIOR"
        | "LEAD"
        | "EXECUTIVE"
      JobSource: "GREENHOUSE" | "LEVER" | "ASHBY" | "WORKDAY" | "OTHER"
      JobType:
        | "FULL_TIME"
        | "PART_TIME"
        | "CONTRACT"
        | "INTERNSHIP"
        | "FREELANCE"
      RemoteType: "ONSITE" | "HYBRID" | "REMOTE_INDIA"
      UserRole: "APPLICANT" | "RECRUITER" | "ADMIN"
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
      ApplicationStatus: [
        "PENDING",
        "VIEWED",
        "SHORTLISTED",
        "REJECTED",
        "HIRED",
      ],
      ExperienceLevel: [
        "FRESHER",
        "JUNIOR",
        "MID",
        "SENIOR",
        "LEAD",
        "EXECUTIVE",
      ],
      JobSource: ["GREENHOUSE", "LEVER", "ASHBY", "WORKDAY", "OTHER"],
      JobType: [
        "FULL_TIME",
        "PART_TIME",
        "CONTRACT",
        "INTERNSHIP",
        "FREELANCE",
      ],
      RemoteType: ["ONSITE", "HYBRID", "REMOTE_INDIA"],
      UserRole: ["APPLICANT", "RECRUITER", "ADMIN"],
    },
  },
} as const
