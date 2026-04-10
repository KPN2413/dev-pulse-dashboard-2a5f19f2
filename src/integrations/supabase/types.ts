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
      commits: {
        Row: {
          author_id: string | null
          committed_at: string
          created_at: string
          id: string
          message: string | null
          repository_id: string
          sha: string
        }
        Insert: {
          author_id?: string | null
          committed_at: string
          created_at?: string
          id?: string
          message?: string | null
          repository_id: string
          sha: string
        }
        Update: {
          author_id?: string | null
          committed_at?: string
          created_at?: string
          id?: string
          message?: string | null
          repository_id?: string
          sha?: string
        }
        Relationships: [
          {
            foreignKeyName: "commits_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "repositories"
            referencedColumns: ["id"]
          },
        ]
      }
      deployments: {
        Row: {
          created_at: string
          deployed_at: string
          environment: string
          id: string
          repository_id: string
          status: Database["public"]["Enums"]["deployment_status"]
        }
        Insert: {
          created_at?: string
          deployed_at?: string
          environment?: string
          id?: string
          repository_id: string
          status?: Database["public"]["Enums"]["deployment_status"]
        }
        Update: {
          created_at?: string
          deployed_at?: string
          environment?: string
          id?: string
          repository_id?: string
          status?: Database["public"]["Enums"]["deployment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "deployments_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "repositories"
            referencedColumns: ["id"]
          },
        ]
      }
      github_credentials: {
        Row: {
          created_at: string
          id: string
          is_valid: boolean
          token_encrypted: string
          token_last_four: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_valid?: boolean
          token_encrypted: string
          token_last_four: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_valid?: boolean
          token_encrypted?: string
          token_last_four?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      metric_snapshots: {
        Row: {
          avg_cycle_time_hours: number | null
          avg_review_turnaround_hours: number | null
          commit_count: number
          created_at: string
          date: string
          deployment_count: number
          id: string
          repository_id: string
          total_prs: number
        }
        Insert: {
          avg_cycle_time_hours?: number | null
          avg_review_turnaround_hours?: number | null
          commit_count?: number
          created_at?: string
          date: string
          deployment_count?: number
          id?: string
          repository_id: string
          total_prs?: number
        }
        Update: {
          avg_cycle_time_hours?: number | null
          avg_review_turnaround_hours?: number | null
          commit_count?: number
          created_at?: string
          date?: string
          deployment_count?: number
          id?: string
          repository_id?: string
          total_prs?: number
        }
        Relationships: [
          {
            foreignKeyName: "metric_snapshots_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "repositories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id: string
          name: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      pull_request_reviews: {
        Row: {
          created_at: string
          id: string
          pull_request_id: string
          reviewer_id: string | null
          state: Database["public"]["Enums"]["review_state"]
          submitted_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          pull_request_id: string
          reviewer_id?: string | null
          state?: Database["public"]["Enums"]["review_state"]
          submitted_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          pull_request_id?: string
          reviewer_id?: string | null
          state?: Database["public"]["Enums"]["review_state"]
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pull_request_reviews_pull_request_id_fkey"
            columns: ["pull_request_id"]
            isOneToOne: false
            referencedRelation: "pull_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      pull_requests: {
        Row: {
          author_id: string | null
          closed_at: string | null
          created_at: string
          created_at_github: string | null
          cycle_time_minutes: number | null
          github_pr_id: string | null
          id: string
          merged_at: string | null
          number: number
          repository_id: string
          review_turnaround_minutes: number | null
          state: Database["public"]["Enums"]["pr_state"]
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          closed_at?: string | null
          created_at?: string
          created_at_github?: string | null
          cycle_time_minutes?: number | null
          github_pr_id?: string | null
          id?: string
          merged_at?: string | null
          number: number
          repository_id: string
          review_turnaround_minutes?: number | null
          state?: Database["public"]["Enums"]["pr_state"]
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          closed_at?: string | null
          created_at?: string
          created_at_github?: string | null
          cycle_time_minutes?: number | null
          github_pr_id?: string | null
          id?: string
          merged_at?: string | null
          number?: number
          repository_id?: string
          review_turnaround_minutes?: number | null
          state?: Database["public"]["Enums"]["pr_state"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pull_requests_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "repositories"
            referencedColumns: ["id"]
          },
        ]
      }
      repositories: {
        Row: {
          created_at: string
          full_name: string
          github_repo_id: string | null
          id: string
          is_active: boolean
          last_synced_at: string | null
          name: string
          owner: string
          updated_at: string
          user_id: string
          webhook_configured: boolean
        }
        Insert: {
          created_at?: string
          full_name: string
          github_repo_id?: string | null
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          name: string
          owner: string
          updated_at?: string
          user_id: string
          webhook_configured?: boolean
        }
        Update: {
          created_at?: string
          full_name?: string
          github_repo_id?: string | null
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          name?: string
          owner?: string
          updated_at?: string
          user_id?: string
          webhook_configured?: boolean
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          created_at: string
          delivery_id: string | null
          event_type: string
          id: string
          processed_at: string | null
          raw_payload: Json
          received_at: string
          repository_id: string | null
          status: Database["public"]["Enums"]["webhook_event_status"]
        }
        Insert: {
          created_at?: string
          delivery_id?: string | null
          event_type: string
          id?: string
          processed_at?: string | null
          raw_payload?: Json
          received_at?: string
          repository_id?: string | null
          status?: Database["public"]["Enums"]["webhook_event_status"]
        }
        Update: {
          created_at?: string
          delivery_id?: string | null
          event_type?: string
          id?: string
          processed_at?: string | null
          raw_payload?: Json
          received_at?: string
          repository_id?: string | null
          status?: Database["public"]["Enums"]["webhook_event_status"]
        }
        Relationships: [
          {
            foreignKeyName: "webhook_events_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "repositories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      owns_repository: {
        Args: { _repo_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "owner" | "admin" | "member"
      deployment_status: "success" | "failure" | "pending" | "in_progress"
      pr_state: "open" | "merged" | "closed"
      review_state: "approved" | "changes_requested" | "commented" | "pending"
      webhook_event_status: "received" | "processed" | "failed"
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
      app_role: ["owner", "admin", "member"],
      deployment_status: ["success", "failure", "pending", "in_progress"],
      pr_state: ["open", "merged", "closed"],
      review_state: ["approved", "changes_requested", "commented", "pending"],
      webhook_event_status: ["received", "processed", "failed"],
    },
  },
} as const
