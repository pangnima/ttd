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
      ai_coaching_cache: {
        Row: {
          bundle_hash: string
          content: Json
          generated_at: string
          model: string
          user_id: string
        }
        Insert: {
          bundle_hash: string
          content: Json
          generated_at?: string
          model: string
          user_id: string
        }
        Update: {
          bundle_hash?: string
          content?: Json
          generated_at?: string
          model?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_coaching_cache_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      club_invites: {
        Row: {
          club_id: string
          created_at: string
          created_by: string
          expires_at: string | null
          is_active: boolean
          token: string
        }
        Insert: {
          club_id: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          is_active?: boolean
          token?: string
        }
        Update: {
          club_id?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          is_active?: boolean
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_invites_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
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
      club_player_ratings: {
        Row: {
          club_id: string
          matches_played: number
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          club_id: string
          matches_played?: number
          rating?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          club_id?: string
          matches_played?: number
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_player_ratings_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_player_ratings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      club_rating_history: {
        Row: {
          club_id: string
          created_at: string
          delta: number
          id: string
          match_id: string | null
          rating_after: number
          rating_before: number
          user_id: string
        }
        Insert: {
          club_id: string
          created_at?: string
          delta: number
          id?: string
          match_id?: string | null
          rating_after: number
          rating_before: number
          user_id: string
        }
        Update: {
          club_id?: string
          created_at?: string
          delta?: number
          id?: string
          match_id?: string | null
          rating_after?: number
          rating_before?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_rating_history_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_rating_history_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "match_game_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_rating_history_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "user_match_participations"
            referencedColumns: ["match_id"]
          },
          {
            foreignKeyName: "club_rating_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          court_schedule: string | null
          created_at: string
          delete_password_hash: string | null
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
          court_schedule?: string | null
          created_at?: string
          delete_password_hash?: string | null
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
          court_schedule?: string | null
          created_at?: string
          delete_password_hash?: string | null
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
          surface: string | null
        }
        Insert: {
          id?: string
          label: string
          match_game_id: string
          order: number
          surface?: string | null
        }
        Update: {
          id?: string
          label?: string
          match_game_id?: string
          order?: number
          surface?: string | null
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
          order: number
          result_sets: Json | null
          round_id: string
          status: string
          time_slot_id: string
          winner_id: string | null
        }
        Insert: {
          court_id: string
          id?: string
          match_game_id: string
          match_type: string
          order?: number
          result_sets?: Json | null
          round_id: string
          status?: string
          time_slot_id: string
          winner_id?: string | null
        }
        Update: {
          court_id?: string
          id?: string
          match_game_id?: string
          match_type?: string
          order?: number
          result_sets?: Json | null
          round_id?: string
          status?: string
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
            foreignKeyName: "match_game_matches_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "match_game_rounds"
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
      match_game_participants: {
        Row: {
          id: string
          is_ad: boolean
          match_id: string
          side: string
          user_id: string
        }
        Insert: {
          id?: string
          is_ad?: boolean
          match_id: string
          side: string
          user_id: string
        }
        Update: {
          id?: string
          is_ad?: boolean
          match_id?: string
          side?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_game_participants_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "match_game_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_game_participants_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "user_match_participations"
            referencedColumns: ["match_id"]
          },
          {
            foreignKeyName: "match_game_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
      match_request_participants: {
        Row: {
          dominant_hand: string | null
          id: string
          name: string
          ntrp_snapshot: number | null
          request_id: string
          role: string
          user_id: string | null
        }
        Insert: {
          dominant_hand?: string | null
          id?: string
          name: string
          ntrp_snapshot?: number | null
          request_id: string
          role: string
          user_id?: string | null
        }
        Update: {
          dominant_hand?: string | null
          id?: string
          name?: string
          ntrp_snapshot?: number | null
          request_id?: string
          role?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_request_participants_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "match_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_request_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      match_requests: {
        Row: {
          court_name: string | null
          created_at: string
          id: string
          match_type: string
          notes: string | null
          opponent_user_id: string
          played_at: string
          played_time: string
          requester_id: string
          responded_at: string | null
          room_id: string | null
          set_scores: Json
          status: string
          surface: string
        }
        Insert: {
          court_name?: string | null
          created_at?: string
          id?: string
          match_type?: string
          notes?: string | null
          opponent_user_id: string
          played_at: string
          played_time: string
          requester_id: string
          responded_at?: string | null
          room_id?: string | null
          set_scores?: Json
          status?: string
          surface: string
        }
        Update: {
          court_name?: string | null
          created_at?: string
          id?: string
          match_type?: string
          notes?: string | null
          opponent_user_id?: string
          played_at?: string
          played_time?: string
          requester_id?: string
          responded_at?: string | null
          room_id?: string | null
          set_scores?: Json
          status?: string
          surface?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_requests_opponent_user_id_fkey"
            columns: ["opponent_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_requests_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "match_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      match_result_negotiations: {
        Row: {
          dispute_reason: string | null
          proposed_at: string | null
          proposed_by: string | null
          proposed_set_scores: Json
          request_id: string
          result_status: string
          set_scores: Json
        }
        Insert: {
          dispute_reason?: string | null
          proposed_at?: string | null
          proposed_by?: string | null
          proposed_set_scores?: Json
          request_id: string
          result_status?: string
          set_scores?: Json
        }
        Update: {
          dispute_reason?: string | null
          proposed_at?: string | null
          proposed_by?: string | null
          proposed_set_scores?: Json
          request_id?: string
          result_status?: string
          set_scores?: Json
        }
        Relationships: [
          {
            foreignKeyName: "match_result_negotiations_proposed_by_fkey"
            columns: ["proposed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_result_negotiations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "match_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      match_room_members: {
        Row: {
          created_at: string
          id: string
          responded_at: string | null
          role: string
          room_id: string
          source_role: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          responded_at?: string | null
          role: string
          room_id: string
          source_role?: string | null
          status: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          responded_at?: string | null
          role?: string
          room_id?: string
          source_role?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_room_members_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "match_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_room_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      match_room_secrets: {
        Row: {
          password_hash: string
          room_id: string
        }
        Insert: {
          password_hash: string
          room_id: string
        }
        Update: {
          password_hash?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_room_secrets_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: true
            referencedRelation: "match_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      match_rooms: {
        Row: {
          court_name: string | null
          created_at: string
          is_settled: boolean
          host_user_id: string
          id: string
          match_type: string
          notes: string | null
          played_at: string
          played_time: string | null
          source_kind: string
          surface: string | null
        }
        Insert: {
          court_name?: string | null
          created_at?: string
          is_settled?: boolean
          host_user_id: string
          id?: string
          match_type: string
          notes?: string | null
          played_at: string
          played_time?: string | null
          source_kind: string
          surface?: string | null
        }
        Update: {
          court_name?: string | null
          created_at?: string
          is_settled?: boolean
          host_user_id?: string
          id?: string
          match_type?: string
          notes?: string | null
          played_at?: string
          played_time?: string | null
          source_kind?: string
          surface?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_rooms_host_user_id_fkey"
            columns: ["host_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_match_participants: {
        Row: {
          dominant_hand: string | null
          id: string
          match_id: string
          name: string
          ntrp_snapshot: number | null
          role: string
          user_id: string | null
        }
        Insert: {
          dominant_hand?: string | null
          id?: string
          match_id: string
          name: string
          ntrp_snapshot?: number | null
          role: string
          user_id?: string | null
        }
        Update: {
          dominant_hand?: string | null
          id?: string
          match_id?: string
          name?: string
          ntrp_snapshot?: number | null
          role?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personal_match_participants_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "personal_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_match_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_matches: {
        Row: {
          court_name: string | null
          created_at: string
          group_seq: number | null
          has_result: boolean | null
          id: string
          is_perspective: boolean
          match_type: string
          notes: string | null
          played_at: string
          played_time: string | null
          room_id: string | null
          rotation_session_id: string | null
          set_scores: Json
          source_request_id: string | null
          source_type: string
          surface: string | null
          user_id: string
        }
        Insert: {
          court_name?: string | null
          created_at?: string
          group_seq?: number | null
          has_result?: boolean | null
          id?: string
          is_perspective?: boolean
          match_type: string
          notes?: string | null
          played_at: string
          played_time?: string | null
          room_id?: string | null
          rotation_session_id?: string | null
          set_scores?: Json
          source_request_id?: string | null
          source_type?: string
          surface?: string | null
          user_id: string
        }
        Update: {
          court_name?: string | null
          created_at?: string
          group_seq?: number | null
          has_result?: boolean | null
          id?: string
          is_perspective?: boolean
          match_type?: string
          notes?: string | null
          played_at?: string
          played_time?: string | null
          room_id?: string | null
          rotation_session_id?: string | null
          set_scores?: Json
          source_request_id?: string | null
          source_type?: string
          surface?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_matches_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "match_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_matches_source_request_id_fkey"
            columns: ["source_request_id"]
            isOneToOne: false
            referencedRelation: "match_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_matches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      rotation_sessions: {
        Row: {
          court_name: string | null
          created_at: string
          id: string
          match_type: string
          notes: string | null
          played_at: string
          played_time: string
          players: Json
          room_id: string | null
          surface: string
          user_id: string
        }
        Insert: {
          court_name?: string | null
          created_at?: string
          id?: string
          match_type: string
          notes?: string | null
          played_at: string
          played_time: string
          players: Json
          room_id?: string | null
          surface: string
          user_id: string
        }
        Update: {
          court_name?: string | null
          created_at?: string
          id?: string
          match_type?: string
          notes?: string | null
          played_at?: string
          played_time?: string
          players?: Json
          room_id?: string | null
          surface?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rotation_sessions_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "match_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rotation_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          deleted_at: string | null
          dominant_hand: string | null
          email: string
          gender: string | null
          id: string
          is_guest: boolean
          name: string
          nickname: string
          ntrp: number | null
          personal_ntrp: number | null
          phone: string | null
          profile_image: string | null
          racket_brand: string | null
          racket_model: string | null
          role: string
          stats_hidden: boolean
          tennis_start_date: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          dominant_hand?: string | null
          email: string
          gender?: string | null
          id: string
          is_guest?: boolean
          name: string
          nickname: string
          ntrp?: number | null
          personal_ntrp?: number | null
          phone?: string | null
          profile_image?: string | null
          racket_brand?: string | null
          racket_model?: string | null
          role?: string
          stats_hidden?: boolean
          tennis_start_date?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          dominant_hand?: string | null
          email?: string
          gender?: string | null
          id?: string
          is_guest?: boolean
          name?: string
          nickname?: string
          ntrp?: number | null
          personal_ntrp?: number | null
          phone?: string | null
          profile_image?: string | null
          racket_brand?: string | null
          racket_model?: string | null
          role?: string
          stats_hidden?: boolean
          tennis_start_date?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      user_match_participations: {
        Row: {
          club_id: string | null
          match_id: string | null
          match_type: string | null
          result: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_game_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_games_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_match_request: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      add_guest_player:
        | { Args: { p_club_id: string; p_nickname: string }; Returns: string }
        | {
            Args: { p_club_id: string; p_gender?: string; p_nickname: string }
            Returns: string
          }
      apply_club_rating_snapshot: {
        Args: { p_club_id: string; p_snapshot: Json }
        Returns: undefined
      }
      confirm_match_result: {
        Args: { p_request_id: string }
        Returns: undefined
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
      create_match_request: {
        Args: {
          p_court_name?: string
          p_match_type: string
          p_notes?: string
          p_opponent_user_id: string
          p_opponent2?: Json
          p_partner?: Json
          p_played_at: string
          p_played_time: string
          p_set_scores?: Json
          p_surface: string
        }
        Returns: string
      }
      create_match_room: {
        Args: { p_password: string; p_source_id: string; p_source_kind: string }
        Returns: string
      }
      create_room_game: {
        Args: {
          p_opponent_user_id: string
          p_opponent2?: Json
          p_partner?: Json
          p_replace_match_id?: string
          p_room_id: string
        }
        Returns: string
      }
      close_rotation_room: { Args: { p_room_id: string }; Returns: undefined }
      materialize_accepted_request: {
        Args: {
          p_group_seq?: number
          p_request_id: string
          p_rotation_session_id?: string
        }
        Returns: undefined
      }
      resolve_rotation_player: { Args: { p_player: Json }; Returns: Json }
      swap_opponent_perspective: { Args: { p_sets: Json }; Returns: Json }
      is_request_party: {
        Args: { p_request_id: string }
        Returns: boolean
      }
      is_room_participant: {
        Args: { p_room_id: string }
        Returns: boolean
      }
      swap_partner_perspective: {
        Args: { p_sets: Json }
        Returns: Json
      }
      derive_public_ntrp: {
        Args: { p_user: Database["public"]["Tables"]["users"]["Row"] }
        Returns: number
      }
      dispute_match_result: {
        Args: { p_reason?: string; p_request_id: string }
        Returns: undefined
      }
      enter_match_room: {
        Args: { p_password: string; p_room_id: string }
        Returns: undefined
      }
      finalize_rotation_session: {
        Args: { p_games: Json; p_session_id: string }
        Returns: undefined
      }
      get_club_activity_ranking: {
        Args: { p_club_id: string; p_since?: string }
        Returns: {
          match_count: number
          user_id: string
          win_count: number
        }[]
      }
      get_club_member_counts: {
        Args: { p_club_ids: string[] }
        Returns: {
          club_id: string
          guest: number
          regular: number
        }[]
      }
      get_club_win_rate_ranking: {
        Args: { p_club_id: string; p_min_matches?: number }
        Returns: {
          loss_count: number
          match_count: number
          match_type_group: string
          user_id: string
          win_count: number
          win_rate: number
        }[]
      }
      get_invite_preview: {
        Args: { p_token: string }
        Returns: {
          club_id: string
          is_public: boolean
          logo_url: string
          name: string
          region: string
        }[]
      }
      get_match_room_detail: { Args: { p_room_id: string }; Returns: Json }
      get_user_doubles_court_stats: {
        Args: { p_club_id?: string; p_user_id: string }
        Returns: Json
      }
      get_user_head_to_head: {
        Args: { p_club_id?: string; p_user_id: string }
        Returns: {
          draws: number
          losses: number
          matches: number
          opponent_id: string
          wins: number
        }[]
      }
      get_user_match_stats_v2: {
        Args: { p_club_id?: string; p_user_id: string }
        Returns: Json
      }
      get_user_partner_stats: {
        Args: { p_club_id?: string; p_user_id: string }
        Returns: {
          draws: number
          losses: number
          matches: number
          partner_id: string
          wins: number
        }[]
      }
      invert_set_scores: { Args: { p_sets: Json }; Returns: Json }
      is_club_approved_member: {
        Args: { p_club_id: string; p_user_id: string }
        Returns: boolean
      }
      is_club_owner: {
        Args: { p_club_id: string; p_user_id: string }
        Returns: boolean
      }
      is_club_owner_or_officer: {
        Args: { p_club_id: string; p_user_id: string }
        Returns: boolean
      }
      join_club_via_invite: { Args: { p_token: string }; Returns: string }
      normalize_set_scores: {
        Args: { p_keep_ad: boolean; p_sets: Json }
        Returns: Json
      }
      propose_match_result: {
        Args: { p_request_id: string; p_set_scores: Json }
        Returns: undefined
      }
      respond_room_invite: {
        Args: { p_accept: boolean; p_room_id: string }
        Returns: undefined
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
      update_match_room_password: {
        Args: { p_password: string; p_room_id: string }
        Returns: undefined
      }
      validate_set_scores: { Args: { p_sets: Json }; Returns: boolean }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
