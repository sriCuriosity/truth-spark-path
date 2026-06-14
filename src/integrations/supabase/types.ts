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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          achievement_type: string | null
          description: string | null
          id: string
          name: string
          particle_colour: string | null
          rarity: string | null
          slug: string
        }
        Insert: {
          achievement_type?: string | null
          description?: string | null
          id?: string
          name: string
          particle_colour?: string | null
          rarity?: string | null
          slug: string
        }
        Update: {
          achievement_type?: string | null
          description?: string | null
          id?: string
          name?: string
          particle_colour?: string | null
          rarity?: string | null
          slug?: string
        }
        Relationships: []
      }
      chamber_entries: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chamber_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      circle_members: {
        Row: {
          circle_id: string
          joined_at: string | null
          user_id: string
        }
        Insert: {
          circle_id: string
          joined_at?: string | null
          user_id: string
        }
        Update: {
          circle_id?: string
          joined_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "circle_members_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "learning_circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cortex_entries: {
        Row: {
          body: string
          created_at: string | null
          domains: string[] | null
          entry_type: string
          happened_at: string | null
          id: string
          impact_count: number | null
          is_public: boolean | null
          new_belief: string | null
          outcome: string | null
          previous_belief: string | null
          title: string
          user_id: string
          what_i_learned: string | null
        }
        Insert: {
          body: string
          created_at?: string | null
          domains?: string[] | null
          entry_type: string
          happened_at?: string | null
          id?: string
          impact_count?: number | null
          is_public?: boolean | null
          new_belief?: string | null
          outcome?: string | null
          previous_belief?: string | null
          title: string
          user_id: string
          what_i_learned?: string | null
        }
        Update: {
          body?: string
          created_at?: string | null
          domains?: string[] | null
          entry_type?: string
          happened_at?: string | null
          id?: string
          impact_count?: number | null
          is_public?: boolean | null
          new_belief?: string | null
          outcome?: string | null
          previous_belief?: string | null
          title?: string
          user_id?: string
          what_i_learned?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cortex_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cortex_evidence: {
        Row: {
          created_at: string | null
          entry_id: string | null
          evidence_type: string | null
          file_key: string | null
          id: string
          metadata: Json | null
          mime_type: string | null
          title: string | null
          url: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          entry_id?: string | null
          evidence_type?: string | null
          file_key?: string | null
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          title?: string | null
          url?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          entry_id?: string | null
          evidence_type?: string | null
          file_key?: string | null
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          title?: string | null
          url?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cortex_evidence_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "cortex_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cortex_evidence_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_circles: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_circles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          id: string
          link: string | null
          read: boolean | null
          title: string | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string
          link?: string | null
          read?: boolean | null
          title?: string | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string
          link?: string | null
          read?: boolean | null
          title?: string | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      peer_validations: {
        Row: {
          created_at: string | null
          entry_id: string | null
          id: string
          owner_id: string | null
          specific_aspect: string | null
          validation_text: string
          validator_id: string | null
        }
        Insert: {
          created_at?: string | null
          entry_id?: string | null
          id?: string
          owner_id?: string | null
          specific_aspect?: string | null
          validation_text: string
          validator_id?: string | null
        }
        Update: {
          created_at?: string | null
          entry_id?: string | null
          id?: string
          owner_id?: string | null
          specific_aspect?: string | null
          validation_text?: string
          validator_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "peer_validations_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "cortex_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "peer_validations_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "peer_validations_validator_id_fkey"
            columns: ["validator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ai_voice_history: Json | null
          avatar_url: string | null
          bio: string | null
          content_preferences: Json | null
          created_at: string | null
          current_tier: string | null
          display_name: string | null
          handle: string | null
          id: string
          onboarding_complete: boolean | null
          onboarding_phase: string | null
          open_questions: string[] | null
          preferred_ai_voice: string | null
          safety_preferences: Json | null
          sovereignty_settings: Json | null
          tier_progress: Json | null
          tier_visibility: string | null
          total_xp: number | null
          updated_at: string | null
          values: string[] | null
        }
        Insert: {
          ai_voice_history?: Json | null
          avatar_url?: string | null
          bio?: string | null
          content_preferences?: Json | null
          created_at?: string | null
          current_tier?: string | null
          display_name?: string | null
          handle?: string | null
          id: string
          onboarding_complete?: boolean | null
          onboarding_phase?: string | null
          open_questions?: string[] | null
          preferred_ai_voice?: string | null
          safety_preferences?: Json | null
          sovereignty_settings?: Json | null
          tier_progress?: Json | null
          tier_visibility?: string | null
          total_xp?: number | null
          updated_at?: string | null
          values?: string[] | null
        }
        Update: {
          ai_voice_history?: Json | null
          avatar_url?: string | null
          bio?: string | null
          content_preferences?: Json | null
          created_at?: string | null
          current_tier?: string | null
          display_name?: string | null
          handle?: string | null
          id?: string
          onboarding_complete?: boolean | null
          onboarding_phase?: string | null
          open_questions?: string[] | null
          preferred_ai_voice?: string | null
          safety_preferences?: Json | null
          sovereignty_settings?: Json | null
          tier_progress?: Json | null
          tier_visibility?: string | null
          total_xp?: number | null
          updated_at?: string | null
          values?: string[] | null
        }
        Relationships: []
      }
      truth_spikes: {
        Row: {
          connection_type: string | null
          delivered_at: string | null
          external_source: string | null
          id: string
          insight_text: string | null
          opened_at: string | null
          title: string | null
          user_id: string | null
        }
        Insert: {
          connection_type?: string | null
          delivered_at?: string | null
          external_source?: string | null
          id?: string
          insight_text?: string | null
          opened_at?: string | null
          title?: string | null
          user_id?: string | null
        }
        Update: {
          connection_type?: string | null
          delivered_at?: string | null
          external_source?: string | null
          id?: string
          insight_text?: string | null
          opened_at?: string | null
          title?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "truth_spikes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string | null
          context_data: Json | null
          earned_at: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          achievement_id?: string | null
          context_data?: Json | null
          earned_at?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          achievement_id?: string | null
          context_data?: Json | null
          earned_at?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wellbeing_checkins: {
        Row: {
          body_note: string | null
          created_at: string | null
          emotion: string | null
          energy_level: number | null
          id: string
          user_id: string | null
        }
        Insert: {
          body_note?: string | null
          created_at?: string | null
          emotion?: string | null
          energy_level?: number | null
          id?: string
          user_id?: string | null
        }
        Update: {
          body_note?: string | null
          created_at?: string | null
          emotion?: string | null
          energy_level?: number | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wellbeing_checkins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
