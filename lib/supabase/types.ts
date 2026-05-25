export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      inbox_items: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          notes: string;
          source_type: "text" | "link" | "reference" | "voice";
          card_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title: string;
          notes?: string;
          source_type: "text" | "link" | "reference" | "voice";
          card_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["inbox_items"]["Insert"]>;
      };
      content_cards: {
        Row: {
          id: string;
          owner_id: string;
          inbox_item_id: string | null;
          title: string;
          status: string;
          format: string;
          platform: string;
          topic_tags: string[];
          experiment_tags: string[];
          script_lab: Json;
          shoot_pack: Json;
          analytics_journal: Json;
          ai_suggestions: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          inbox_item_id?: string | null;
          title: string;
          status: string;
          format: string;
          platform: string;
          topic_tags?: string[];
          experiment_tags?: string[];
          script_lab?: Json;
          shoot_pack?: Json;
          analytics_journal?: Json;
          ai_suggestions?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["content_cards"]["Insert"]>;
      };
      card_assets: {
        Row: {
          id: string;
          owner_id: string;
          card_id: string;
          type: string;
          title: string;
          url: string;
          note: string;
          created_at: string;
          storage_path: string | null;
          source: string;
          scene_key: string | null;
          metadata: Json;
          generation_id: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          card_id: string;
          type: string;
          title: string;
          url: string;
          note?: string;
          created_at?: string;
          storage_path?: string | null;
          source?: string;
          scene_key?: string | null;
          metadata?: Json;
          generation_id?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["card_assets"]["Insert"]>;
      };
      creator_settings: {
        Row: {
          user_id: string;
          gemini_api_key: string | null;
          openrouter_api_key: string | null;
          nim_api_key: string | null;
          gemini_api_key_encrypted: string | null;
          openrouter_api_key_encrypted: string | null;
          nim_api_key_encrypted: string | null;
          huggingface_api_key_encrypted: string | null;
          creator_context: string | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          gemini_api_key?: string | null;
          openrouter_api_key?: string | null;
          nim_api_key?: string | null;
          gemini_api_key_encrypted?: string | null;
          openrouter_api_key_encrypted?: string | null;
          nim_api_key_encrypted?: string | null;
          huggingface_api_key_encrypted?: string | null;
          creator_context?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["creator_settings"]["Insert"]>;
      };
      project_messages: {
        Row: {
          id: string;
          owner_id: string;
          card_id: string;
          role: "system" | "user" | "assistant";
          content: string;
          provider: string | null;
          model: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          card_id: string;
          role: "system" | "user" | "assistant";
          content: string;
          provider?: string | null;
          model?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["project_messages"]["Insert"]>;
      };
      generation_records: {
        Row: {
          id: string;
          owner_id: string;
          card_id: string;
          provider: string;
          model: string;
          modality: "text" | "image" | "audio" | "video";
          prompt: string;
          status: "queued" | "completed" | "failed";
          error_message: string | null;
          metadata: Json;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          owner_id: string;
          card_id: string;
          provider: string;
          model: string;
          modality: "text" | "image" | "audio" | "video";
          prompt: string;
          status: "queued" | "completed" | "failed";
          error_message?: string | null;
          metadata?: Json;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["generation_records"]["Insert"]>;
      };
    };
  };
};
