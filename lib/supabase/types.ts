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
        };
        Update: Partial<Database["public"]["Tables"]["card_assets"]["Insert"]>;
      };
      creator_settings: {
        Row: {
          user_id: string;
          gemini_api_key: string | null;
          openrouter_api_key: string | null;
          nim_api_key: string | null;
          creator_context: string | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          gemini_api_key?: string | null;
          openrouter_api_key?: string | null;
          nim_api_key?: string | null;
          creator_context?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["creator_settings"]["Insert"]>;
      };
    };
  };
};
