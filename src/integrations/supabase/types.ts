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
      appointments: {
        Row: {
          appointment_date: string
          athlete_id: string
          created_at: string
          created_by: string
          description: string | null
          doctor_id: string | null
          end_time: string
          id: string
          location: string | null
          notes: string | null
          start_time: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          appointment_date: string
          athlete_id: string
          created_at?: string
          created_by: string
          description?: string | null
          doctor_id?: string | null
          end_time: string
          id?: string
          location?: string | null
          notes?: string | null
          start_time: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          athlete_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          doctor_id?: string | null
          end_time?: string
          id?: string
          location?: string | null
          notes?: string | null
          start_time?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      athletes: {
        Row: {
          created_at: string
          date_of_birth: string
          fitness_level: string | null
          gender: string | null
          height_cm: number | null
          id: string
          medical_conditions: string | null
          name: string | null
          position: string | null
          sport: string
          training_hours_per_week: number | null
          updated_at: string
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          created_at?: string
          date_of_birth: string
          fitness_level?: string | null
          gender?: string | null
          height_cm?: number | null
          id?: string
          medical_conditions?: string | null
          name?: string | null
          position?: string | null
          sport: string
          training_hours_per_week?: number | null
          updated_at?: string
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          created_at?: string
          date_of_birth?: string
          fitness_level?: string | null
          gender?: string | null
          height_cm?: number | null
          id?: string
          medical_conditions?: string | null
          name?: string | null
          position?: string | null
          sport?: string
          training_hours_per_week?: number | null
          updated_at?: string
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      exercise_library: {
        Row: {
          body_part: string
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          difficulty: string
          duration_seconds: number | null
          equipment: string[] | null
          id: string
          image_url: string | null
          instructions: string[] | null
          name: string
          reps_recommended: number | null
          sets_recommended: number | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          body_part: string
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty: string
          duration_seconds?: number | null
          equipment?: string[] | null
          id?: string
          image_url?: string | null
          instructions?: string[] | null
          name: string
          reps_recommended?: number | null
          sets_recommended?: number | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          body_part?: string
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: string
          duration_seconds?: number | null
          equipment?: string[] | null
          id?: string
          image_url?: string | null
          instructions?: string[] | null
          name?: string
          reps_recommended?: number | null
          sets_recommended?: number | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      goal_milestones: {
        Row: {
          achieved_at: string | null
          created_at: string
          goal_id: string
          id: string
          notes: string | null
          target_value: number | null
          title: string
        }
        Insert: {
          achieved_at?: string | null
          created_at?: string
          goal_id: string
          id?: string
          notes?: string | null
          target_value?: number | null
          title: string
        }
        Update: {
          achieved_at?: string | null
          created_at?: string
          goal_id?: string
          id?: string
          notes?: string | null
          target_value?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_milestones_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          athlete_id: string
          created_at: string
          created_by: string
          current_value: number | null
          description: string | null
          goal_type: string
          id: string
          status: string
          target_date: string | null
          target_value: number | null
          title: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          created_by: string
          current_value?: number | null
          description?: string | null
          goal_type: string
          id?: string
          status?: string
          target_date?: string | null
          target_value?: number | null
          title: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          created_by?: string
          current_value?: number | null
          description?: string | null
          goal_type?: string
          id?: string
          status?: string
          target_date?: string | null
          target_value?: number | null
          title?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      injuries: {
        Row: {
          actual_recovery_days: number | null
          athlete_id: string
          body_location: string
          created_at: string
          created_by: string | null
          diagnosis: string | null
          expected_recovery_days: number | null
          id: string
          injury_date: string
          injury_type: string
          notes: string | null
          severity: Database["public"]["Enums"]["injury_severity"]
          status: string | null
          updated_at: string
        }
        Insert: {
          actual_recovery_days?: number | null
          athlete_id: string
          body_location: string
          created_at?: string
          created_by?: string | null
          diagnosis?: string | null
          expected_recovery_days?: number | null
          id?: string
          injury_date: string
          injury_type: string
          notes?: string | null
          severity: Database["public"]["Enums"]["injury_severity"]
          status?: string | null
          updated_at?: string
        }
        Update: {
          actual_recovery_days?: number | null
          athlete_id?: string
          body_location?: string
          created_at?: string
          created_by?: string | null
          diagnosis?: string | null
          expected_recovery_days?: number | null
          id?: string
          injury_date?: string
          injury_type?: string
          notes?: string | null
          severity?: Database["public"]["Enums"]["injury_severity"]
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "injuries_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_records: {
        Row: {
          athlete_id: string
          created_at: string
          diagnosis: string
          doctor_id: string | null
          file_url: string | null
          id: string
          injury_id: string | null
          notes: string | null
          record_date: string
          treatment_plan: string | null
          updated_at: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          diagnosis: string
          doctor_id?: string | null
          file_url?: string | null
          id?: string
          injury_id?: string | null
          notes?: string | null
          record_date: string
          treatment_plan?: string | null
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          diagnosis?: string
          doctor_id?: string | null
          file_url?: string | null
          id?: string
          injury_id?: string | null
          notes?: string | null
          record_date?: string
          treatment_plan?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_records_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_records_injury_id_fkey"
            columns: ["injury_id"]
            isOneToOne: false
            referencedRelation: "injuries"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          athlete_id: string | null
          content: string
          created_at: string
          id: string
          is_read: boolean | null
          parent_message_id: string | null
          recipient_id: string
          sender_id: string
          subject: string | null
        }
        Insert: {
          athlete_id?: string | null
          content: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          parent_message_id?: string | null
          recipient_id: string
          sender_id: string
          subject?: string | null
        }
        Update: {
          athlete_id?: string | null
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          parent_message_id?: string | null
          recipient_id?: string
          sender_id?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          athlete_id: string | null
          created_at: string
          id: string
          is_read: boolean | null
          link: string | null
          message: string
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          athlete_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message: string
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          athlete_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      predictions: {
        Row: {
          athlete_id: string
          confidence_score: number | null
          created_at: string
          id: string
          injury_id: string
          input_features: Json | null
          model_version: string | null
          predicted_recovery_days: number | null
          prediction_date: string
          risk_level: Database["public"]["Enums"]["risk_level"]
          setback_probability: number | null
        }
        Insert: {
          athlete_id: string
          confidence_score?: number | null
          created_at?: string
          id?: string
          injury_id: string
          input_features?: Json | null
          model_version?: string | null
          predicted_recovery_days?: number | null
          prediction_date?: string
          risk_level: Database["public"]["Enums"]["risk_level"]
          setback_probability?: number | null
        }
        Update: {
          athlete_id?: string
          confidence_score?: number | null
          created_at?: string
          id?: string
          injury_id?: string
          input_features?: Json | null
          model_version?: string | null
          predicted_recovery_days?: number | null
          prediction_date?: string
          risk_level?: Database["public"]["Enums"]["risk_level"]
          setback_probability?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "predictions_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictions_injury_id_fkey"
            columns: ["injury_id"]
            isOneToOne: false
            referencedRelation: "injuries"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rehab_plans: {
        Row: {
          actual_end_date: string | null
          athlete_id: string
          created_at: string
          created_by: string | null
          description: string | null
          exercises: Json | null
          id: string
          injury_id: string
          plan_name: string
          start_date: string
          status: Database["public"]["Enums"]["rehab_status"] | null
          target_end_date: string
          updated_at: string
        }
        Insert: {
          actual_end_date?: string | null
          athlete_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          exercises?: Json | null
          id?: string
          injury_id: string
          plan_name: string
          start_date: string
          status?: Database["public"]["Enums"]["rehab_status"] | null
          target_end_date: string
          updated_at?: string
        }
        Update: {
          actual_end_date?: string | null
          athlete_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          exercises?: Json | null
          id?: string
          injury_id?: string
          plan_name?: string
          start_date?: string
          status?: Database["public"]["Enums"]["rehab_status"] | null
          target_end_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rehab_plans_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rehab_plans_injury_id_fkey"
            columns: ["injury_id"]
            isOneToOne: false
            referencedRelation: "injuries"
            referencedColumns: ["id"]
          },
        ]
      }
      rehab_progress: {
        Row: {
          athlete_id: string
          completion_percentage: number | null
          created_at: string
          exercises_completed: Json | null
          id: string
          notes: string | null
          pain_level: number | null
          progress_date: string
          rehab_plan_id: string
        }
        Insert: {
          athlete_id: string
          completion_percentage?: number | null
          created_at?: string
          exercises_completed?: Json | null
          id?: string
          notes?: string | null
          pain_level?: number | null
          progress_date: string
          rehab_plan_id: string
        }
        Update: {
          athlete_id?: string
          completion_percentage?: number | null
          created_at?: string
          exercises_completed?: Json | null
          id?: string
          notes?: string | null
          pain_level?: number | null
          progress_date?: string
          rehab_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rehab_progress_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rehab_progress_rehab_plan_id_fkey"
            columns: ["rehab_plan_id"]
            isOneToOne: false
            referencedRelation: "rehab_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      training_load: {
        Row: {
          athlete_id: string
          created_at: string
          duration_minutes: number
          id: string
          intensity: number
          load_score: number | null
          log_date: string
          notes: string | null
          rpe: number | null
          session_type: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          duration_minutes: number
          id?: string
          intensity: number
          load_score?: number | null
          log_date: string
          notes?: string | null
          rpe?: number | null
          session_type: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          duration_minutes?: number
          id?: string
          intensity?: number
          load_score?: number | null
          log_date?: string
          notes?: string | null
          rpe?: number | null
          session_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_load_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      training_recommendations: {
        Row: {
          athlete_id: string
          created_at: string
          created_by: string | null
          id: string
          injury_id: string | null
          notes: string | null
          prediction_id: string | null
          recommendation_date: string
          recommended_activities: string[] | null
          restrictions: string[] | null
          training_load_percentage: number | null
        }
        Insert: {
          athlete_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          injury_id?: string | null
          notes?: string | null
          prediction_id?: string | null
          recommendation_date: string
          recommended_activities?: string[] | null
          restrictions?: string[] | null
          training_load_percentage?: number | null
        }
        Update: {
          athlete_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          injury_id?: string | null
          notes?: string | null
          prediction_id?: string | null
          recommendation_date?: string
          recommended_activities?: string[] | null
          restrictions?: string[] | null
          training_load_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "training_recommendations_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_recommendations_injury_id_fkey"
            columns: ["injury_id"]
            isOneToOne: false
            referencedRelation: "injuries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_recommendations_prediction_id_fkey"
            columns: ["prediction_id"]
            isOneToOne: false
            referencedRelation: "predictions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          check_role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "athlete" | "doctor" | "admin"
      injury_severity: "minor" | "moderate" | "severe" | "critical"
      notification_type: "alert" | "reminder" | "milestone" | "risk_warning"
      rehab_status: "planned" | "in_progress" | "completed" | "paused"
      risk_level: "low" | "medium" | "high"
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
      app_role: ["athlete", "doctor", "admin"],
      injury_severity: ["minor", "moderate", "severe", "critical"],
      notification_type: ["alert", "reminder", "milestone", "risk_warning"],
      rehab_status: ["planned", "in_progress", "completed", "paused"],
      risk_level: ["low", "medium", "high"],
    },
  },
} as const
