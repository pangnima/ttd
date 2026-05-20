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
      club_members: {
        Row: {
          club_id: string
          joined_at: string
          role: string
          status: string
          user_id: string
        }
        Insert: {
          club_id: string
          joined_at?: string
          role?: string
          status?: string
          user_id: string
        }
        Update: {
          club_id?: string
          joined_at?: string
          role?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_members_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          logo_url: string | null
          member_count: number
          name: string
          owner_id: string
          region: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          logo_url?: string | null
          member_count?: number
          name: string
          owner_id: string
          region?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          logo_url?: string | null
          member_count?: number
          name?: string
          owner_id?: string
          region?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clubs_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      match_game_courts: {
        Row: {
          id: string
          label: string
          match_game_id: string
          order: number
        }
        Insert: {
          id?: string
          label: string
          match_game_id: string
          order: number
        }
        Update: {
          id?: string
          label?: string
          match_game_id?: string
          order?: number
        }
        Relationships: [
          {
            foreignKeyName: "match_game_courts_match_game_id_fkey"
            columns: ["match_game_id"]
            isOneToOne: false
            referencedRelation: "match_games"
            referencedColumns: ["id"]
          },
        ]
      }
      match_game_matches: {
        Row: {
          court_id: string
          id: string
          match_game_id: string
          match_type: string
          player1_id: string | null
          player2_id: string | null
          result_sets: Json | null
          round_id: string
          status: string
          team1: string[] | null
          team1_ad_player_id: string | null
          team2: string[] | null
          team2_ad_player_id: string | null
          time_slot_id: string
          winner_id: string | null
        }
        Insert: {
          court_id: string
          id?: string
          match_game_id: string
          match_type: string
          player1_id?: string | null
          player2_id?: string | null
          result_sets?: Json | null
          round_id: string
          status?: string
          team1?: string[] | null
          team1_ad_player_id?: string | null
          team2?: string[] | null
          team2_ad_player_id?: string | null
          time_slot_id: string
          winner_id?: string | null
        }
        Update: {
          court_id?: string
          id?: string
          match_game_id?: string
          match_type?: string
          player1_id?: string | null
          player2_id?: string | null
          result_sets?: Json | null
          round_id?: string
          status?: string
          team1?: string[] | null
          team1_ad_player_id?: string | null
          team2?: string[] | null
          team2_ad_player_id?: string | null
          time_slot_id?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_game_matches_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "match_game_courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_game_matches_match_game_id_fkey"
            columns: ["match_game_id"]
            isOneToOne: false
            referencedRelation: "match_games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_game_matches_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_game_matches_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_game_matches_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "match_game_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_game_matches_team1_ad_player_id_fkey"
            columns: ["team1_ad_player_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_game_matches_team2_ad_player_id_fkey"
            columns: ["team2_ad_player_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_game_matches_time_slot_id_fkey"
            columns: ["time_slot_id"]
            isOneToOne: false
            referencedRelation: "match_game_time_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      match_game_rounds: {
        Row: {
          id: string
          label: string
          match_game_id: string
          order: number
        }
        Insert: {
          id?: string
          label: string
          match_game_id: string
          order: number
        }
        Update: {
          id?: string
          label?: string
          match_game_id?: string
          order?: number
        }
        Relationships: [
          {
            foreignKeyName: "match_game_rounds_match_game_id_fkey"
            columns: ["match_game_id"]
            isOneToOne: false
            referencedRelation: "match_games"
            referencedColumns: ["id"]
          },
        ]
      }
      match_game_time_slots: {
        Row: {
          end_at: string
          id: string
          round_id: string
          start_at: string
        }
        Insert: {
          end_at: string
          id?: string
          round_id: string
          start_at: string
        }
        Update: {
          end_at?: string
          id?: string
          round_id?: string
          start_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_game_time_slots_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "match_game_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      match_games: {
        Row: {
          club_id: string
          created_at: string
          date: string
          id: string
          is_fixed: boolean
          name: string
        }
        Insert: {
          club_id: string
          created_at?: string
          date: string
          id?: string
          is_fixed?: boolean
          name: string
        }
        Update: {
          club_id?: string
          created_at?: string
          date?: string
          id?: string
          is_fixed?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_games_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          dominant_hand: string | null
          email: string
          gender: string | null
          id: string
          is_guest: boolean
          name: string
          nickname: string
          ntrp: number | null
          phone: string | null
          profile_image: string | null
          role: string
          tennis_start_date: string | null
        }
        Insert: {
          created_at?: string
          dominant_hand?: string | null
          email: string
          gender?: string | null
          id: string
          is_guest?: boolean
          name: string
          nickname: string
          ntrp?: number | null
          phone?: string | null
          profile_image?: string | null
          role?: string
          tennis_start_date?: string | null
        }
        Update: {
          created_at?: string
          dominant_hand?: string | null
          email?: string
          gender?: string | null
          id?: string
          is_guest?: boolean
          name?: string
          nickname?: string
          ntrp?: number | null
          phone?: string | null
          profile_image?: string | null
          role?: string
          tennis_start_date?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      user_match_participations: {
        Row: {
          match_id: string | null
          match_type: string | null
          result: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_guest_player: {
        Args: { p_club_id: string; p_nickname: string }
        Returns: string
      }
      create_match_game: {
        Args: {
          p_club_id: string
          p_courts: Json
          p_date: string
          p_matches: Json
          p_name: string
          p_rounds: Json
        }
        Returns: string
      }
      get_user_doubles_court_stats: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_user_head_to_head: {
        Args: { p_user_id: string }
        Returns: {
          draws: number
          losses: number
          matches: number
          opponent_id: string
          wins: number
        }[]
      }
      get_user_match_stats: { Args: { p_user_id: string }; Returns: Json }
      get_user_match_stats_v2: { Args: { p_user_id: string }; Returns: Json }
      get_user_partner_stats: {
        Args: { p_user_id: string }
        Returns: {
          draws: number
          losses: number
          matches: number
          partner_id: string
          wins: number
        }[]
      }
      is_club_approved_member: {
        Args: { p_club_id: string; p_user_id: string }
        Returns: boolean
      }
      is_club_owner: {
        Args: { p_club_id: string; p_user_id: string }
        Returns: boolean
      }
      update_match_game: {
        Args: {
          p_courts: Json
          p_date: string
          p_match_game_id: string
          p_matches: Json
          p_name: string
          p_rounds: Json
        }
        Returns: string
      }
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
