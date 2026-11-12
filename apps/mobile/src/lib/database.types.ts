export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      admins: {
        Row: {
          created_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'admins_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      analytics_events: {
        Row: {
          created_at: string;
          event_name: string;
          id: string;
          props: Json;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          event_name: string;
          id?: string;
          props?: Json;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          event_name?: string;
          id?: string;
          props?: Json;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'analytics_events_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      cars: {
        Row: {
          color: string | null;
          created_at: string;
          id: string;
          make: string;
          model: string;
          nickname: string | null;
          owner_id: string;
          photo_url: string | null;
          year: number | null;
        };
        Insert: {
          color?: string | null;
          created_at?: string;
          id?: string;
          make: string;
          model: string;
          nickname?: string | null;
          owner_id: string;
          photo_url?: string | null;
          year?: number | null;
        };
        Update: {
          color?: string | null;
          created_at?: string;
          id?: string;
          make?: string;
          model?: string;
          nickname?: string | null;
          owner_id?: string;
          photo_url?: string | null;
          year?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'cars_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      conversation_members: {
        Row: {
          added_at: string | null;
          conversation_id: string;
          joined_at: string;
          last_read_at: string | null;
          role: string;
          user_id: string;
        };
        Insert: {
          added_at?: string | null;
          conversation_id: string;
          joined_at?: string;
          last_read_at?: string | null;
          role?: string;
          user_id: string;
        };
        Update: {
          added_at?: string | null;
          conversation_id?: string;
          joined_at?: string;
          last_read_at?: string | null;
          role?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'conversation_members_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'conversation_members_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      conversation_mutes: {
        Row: {
          conversation_id: string;
          created_at: string;
          muted_until: string;
          user_id: string;
        };
        Insert: {
          conversation_id: string;
          created_at?: string;
          muted_until: string;
          user_id: string;
        };
        Update: {
          conversation_id?: string;
          created_at?: string;
          muted_until?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'conversation_mutes_conversation_id_user_id_fkey';
            columns: ['conversation_id', 'user_id'];
            isOneToOne: true;
            referencedRelation: 'conversation_members';
            referencedColumns: ['conversation_id', 'user_id'];
          },
        ];
      };
      conversations: {
        Row: {
          avatar_path: string | null;
          created_at: string;
          id: string;
          is_group: boolean;
          name: string | null;
        };
        Insert: {
          avatar_path?: string | null;
          created_at?: string;
          id?: string;
          is_group?: boolean;
          name?: string | null;
        };
        Update: {
          avatar_path?: string | null;
          created_at?: string;
          id?: string;
          is_group?: boolean;
          name?: string | null;
        };
        Relationships: [];
      };
      friend_code_attempts: {
        Row: {
          attempted_at: string;
          id: number;
          user_id: string;
        };
        Insert: {
          attempted_at?: string;
          id?: never;
          user_id: string;
        };
        Update: {
          attempted_at?: string;
          id?: never;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'friend_code_attempts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      friend_codes: {
        Row: {
          code: string;
          expires_at: string;
          user_id: string;
        };
        Insert: {
          code: string;
          expires_at: string;
          user_id: string;
        };
        Update: {
          code?: string;
          expires_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'friend_codes_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      friendships: {
        Row: {
          addressee_id: string;
          blocked_by: string | null;
          created_at: string;
          id: string;
          requester_id: string;
          responded_at: string | null;
          status: string;
          user_a: string | null;
          user_b: string | null;
        };
        Insert: {
          addressee_id: string;
          blocked_by?: string | null;
          created_at?: string;
          id?: string;
          requester_id: string;
          responded_at?: string | null;
          status?: string;
          user_a?: string | null;
          user_b?: string | null;
        };
        Update: {
          addressee_id?: string;
          blocked_by?: string | null;
          created_at?: string;
          id?: string;
          requester_id?: string;
          responded_at?: string | null;
          status?: string;
          user_a?: string | null;
          user_b?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'friendships_addressee_id_fkey';
            columns: ['addressee_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'friendships_blocked_by_fkey';
            columns: ['blocked_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'friendships_requester_id_fkey';
            columns: ['requester_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      heat_points: {
        Row: {
          cell_lat: number;
          cell_lng: number;
          seen_at: string;
          user_id: string;
        };
        Insert: {
          cell_lat: number;
          cell_lng: number;
          seen_at?: string;
          user_id: string;
        };
        Update: {
          cell_lat?: number;
          cell_lng?: number;
          seen_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'heat_points_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      locations: {
        Row: {
          approximate_enabled: boolean;
          heading: number | null;
          lat: number | null;
          lng: number | null;
          moving: boolean;
          sharing_enabled: boolean;
          status_expires_at: string | null;
          status_text: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          approximate_enabled?: boolean;
          heading?: number | null;
          lat?: number | null;
          lng?: number | null;
          moving?: boolean;
          sharing_enabled?: boolean;
          status_expires_at?: string | null;
          status_text?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          approximate_enabled?: boolean;
          heading?: number | null;
          lat?: number | null;
          lng?: number | null;
          moving?: boolean;
          sharing_enabled?: boolean;
          status_expires_at?: string | null;
          status_text?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'locations_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      meetup_checkins: {
        Row: {
          checked_in_at: string;
          meetup_id: string;
          user_id: string;
        };
        Insert: {
          checked_in_at?: string;
          meetup_id: string;
          user_id: string;
        };
        Update: {
          checked_in_at?: string;
          meetup_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'meetup_checkins_meetup_id_fkey';
            columns: ['meetup_id'];
            isOneToOne: false;
            referencedRelation: 'meetups';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'meetup_checkins_meetup_id_fkey';
            columns: ['meetup_id'];
            isOneToOne: false;
            referencedRelation: 'meetups_with_stats';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'meetup_checkins_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      meetup_interests: {
        Row: {
          created_at: string;
          meetup_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          meetup_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          meetup_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'meetup_interests_meetup_id_fkey';
            columns: ['meetup_id'];
            isOneToOne: false;
            referencedRelation: 'meetups';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'meetup_interests_meetup_id_fkey';
            columns: ['meetup_id'];
            isOneToOne: false;
            referencedRelation: 'meetups_with_stats';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'meetup_interests_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      meetups: {
        Row: {
          created_at: string;
          creator_id: string;
          description: string | null;
          id: string;
          lat: number;
          lng: number;
          starts_at: string;
          title: string;
          vibe: string;
        };
        Insert: {
          created_at?: string;
          creator_id: string;
          description?: string | null;
          id?: string;
          lat: number;
          lng: number;
          starts_at: string;
          title: string;
          vibe?: string;
        };
        Update: {
          created_at?: string;
          creator_id?: string;
          description?: string | null;
          id?: string;
          lat?: number;
          lng?: number;
          starts_at?: string;
          title?: string;
          vibe?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'meetups_creator_id_fkey';
            columns: ['creator_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      message_reactions: {
        Row: {
          created_at: string;
          emoji: string;
          message_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          emoji: string;
          message_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          emoji?: string;
          message_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'message_reactions_message_id_fkey';
            columns: ['message_id'];
            isOneToOne: false;
            referencedRelation: 'messages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'message_reactions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      messages: {
        Row: {
          body: string;
          conversation_id: string;
          created_at: string;
          id: string;
          image_path: string | null;
          meetup_id: string | null;
          post_id: string | null;
          sender_id: string;
        };
        Insert: {
          body: string;
          conversation_id: string;
          created_at?: string;
          id?: string;
          image_path?: string | null;
          meetup_id?: string | null;
          post_id?: string | null;
          sender_id: string;
        };
        Update: {
          body?: string;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          image_path?: string | null;
          meetup_id?: string | null;
          post_id?: string | null;
          sender_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'messages_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_meetup_id_fkey';
            columns: ['meetup_id'];
            isOneToOne: false;
            referencedRelation: 'meetups';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_meetup_id_fkey';
            columns: ['meetup_id'];
            isOneToOne: false;
            referencedRelation: 'meetups_with_stats';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      nearby_presence: {
        Row: {
          lat: number;
          lng: number;
          seen_at: string;
          user_id: string;
        };
        Insert: {
          lat: number;
          lng: number;
          seen_at?: string;
          user_id: string;
        };
        Update: {
          lat?: number;
          lng?: number;
          seen_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'nearby_presence_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      notification_settings: {
        Row: {
          friend_requests: boolean;
          meets: boolean;
          messages: boolean;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          friend_requests?: boolean;
          meets?: boolean;
          messages?: boolean;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          friend_requests?: boolean;
          meets?: boolean;
          messages?: boolean;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notification_settings_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      post_places: {
        Row: {
          author_id: string;
          created_at: string;
          expires_at: string;
          lat: number;
          lng: number;
          post_id: string;
        };
        Insert: {
          author_id: string;
          created_at?: string;
          expires_at?: string;
          lat: number;
          lng: number;
          post_id: string;
        };
        Update: {
          author_id?: string;
          created_at?: string;
          expires_at?: string;
          lat?: number;
          lng?: number;
          post_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'post_places_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'post_places_post_id_fkey';
            columns: ['post_id'];
            isOneToOne: true;
            referencedRelation: 'posts';
            referencedColumns: ['id'];
          },
        ];
      };
      post_reactions: {
        Row: {
          created_at: string;
          emoji: string;
          post_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          emoji: string;
          post_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          emoji?: string;
          post_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'post_reactions_post_id_fkey';
            columns: ['post_id'];
            isOneToOne: false;
            referencedRelation: 'posts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'post_reactions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      posts: {
        Row: {
          author_id: string;
          body: string | null;
          car_id: string | null;
          created_at: string;
          id: string;
          image_url: string | null;
        };
        Insert: {
          author_id: string;
          body?: string | null;
          car_id?: string | null;
          created_at?: string;
          id?: string;
          image_url?: string | null;
        };
        Update: {
          author_id?: string;
          body?: string | null;
          car_id?: string | null;
          created_at?: string;
          id?: string;
          image_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'posts_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'posts_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'cars';
            referencedColumns: ['id'];
          },
        ];
      };
      profile_bios: {
        Row: {
          bio: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          bio: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          bio?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profile_bios_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          created_at: string;
          display_name: string;
          id: string;
          onboarded_at: string | null;
          username: string;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          display_name: string;
          id: string;
          onboarded_at?: string | null;
          username: string;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          display_name?: string;
          id?: string;
          onboarded_at?: string | null;
          username?: string;
        };
        Relationships: [];
      };
      push_tokens: {
        Row: {
          created_at: string;
          id: string;
          platform: string;
          token: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          platform: string;
          token: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          platform?: string;
          token?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'push_tokens_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      reports: {
        Row: {
          created_at: string;
          details: string | null;
          id: string;
          reason: string;
          reported_user_id: string | null;
          reporter_id: string;
          snapshot: string | null;
          status: string;
          target_id: string;
          target_type: string;
        };
        Insert: {
          created_at?: string;
          details?: string | null;
          id?: string;
          reason: string;
          reported_user_id?: string | null;
          reporter_id?: string;
          snapshot?: string | null;
          status?: string;
          target_id: string;
          target_type: string;
        };
        Update: {
          created_at?: string;
          details?: string | null;
          id?: string;
          reason?: string;
          reported_user_id?: string | null;
          reporter_id?: string;
          snapshot?: string | null;
          status?: string;
          target_id?: string;
          target_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reports_reported_user_id_fkey';
            columns: ['reported_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reports_reporter_id_fkey';
            columns: ['reporter_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      spot_photos: {
        Row: {
          author_id: string;
          created_at: string;
          expires_at: string;
          id: string;
          path: string;
          spot_id: string;
        };
        Insert: {
          author_id: string;
          created_at?: string;
          expires_at?: string;
          id?: string;
          path: string;
          spot_id: string;
        };
        Update: {
          author_id?: string;
          created_at?: string;
          expires_at?: string;
          id?: string;
          path?: string;
          spot_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'spot_photos_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'spot_photos_spot_id_fkey';
            columns: ['spot_id'];
            isOneToOne: false;
            referencedRelation: 'spots';
            referencedColumns: ['id'];
          },
        ];
      };
      spot_votes: {
        Row: {
          created_at: string;
          gone: boolean;
          spot_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          gone: boolean;
          spot_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          gone?: boolean;
          spot_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'spot_votes_spot_id_fkey';
            columns: ['spot_id'];
            isOneToOne: false;
            referencedRelation: 'spots';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'spot_votes_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      spots: {
        Row: {
          created_at: string;
          creator_id: string;
          expires_at: string;
          id: string;
          kind: string;
          lat: number;
          lng: number;
          name: string | null;
          visibility: string;
          warning_type: string | null;
        };
        Insert: {
          created_at?: string;
          creator_id: string;
          expires_at?: string;
          id?: string;
          kind: string;
          lat: number;
          lng: number;
          name?: string | null;
          visibility?: string;
          warning_type?: string | null;
        };
        Update: {
          created_at?: string;
          creator_id?: string;
          expires_at?: string;
          id?: string;
          kind?: string;
          lat?: number;
          lng?: number;
          name?: string | null;
          visibility?: string;
          warning_type?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'spots_creator_id_fkey';
            columns: ['creator_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      storage_cleanup: {
        Row: {
          bucket: string;
          path: string;
          queued_at: string;
        };
        Insert: {
          bucket: string;
          path: string;
          queued_at?: string;
        };
        Update: {
          bucket?: string;
          path?: string;
          queued_at?: string;
        };
        Relationships: [];
      };
      user_ages: {
        Row: {
          birth_year: number;
          created_at: string;
          user_id: string;
        };
        Insert: {
          birth_year: number;
          created_at?: string;
          user_id: string;
        };
        Update: {
          birth_year?: number;
          created_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_ages_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      waitlist: {
        Row: {
          created_at: string;
          email: string;
          id: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      meetups_with_stats: {
        Row: {
          created_at: string | null;
          creator_id: string | null;
          description: string | null;
          here_now_count: number | null;
          id: string | null;
          interest_count: number | null;
          lat: number | null;
          lng: number | null;
          starts_at: string | null;
          title: string | null;
          vibe: string | null;
        };
        Insert: {
          created_at?: string | null;
          creator_id?: string | null;
          description?: string | null;
          here_now_count?: never;
          id?: string | null;
          interest_count?: never;
          lat?: number | null;
          lng?: number | null;
          starts_at?: string | null;
          title?: string | null;
          vibe?: string | null;
        };
        Update: {
          created_at?: string | null;
          creator_id?: string | null;
          description?: string | null;
          here_now_count?: never;
          id?: string | null;
          interest_count?: never;
          lat?: number | null;
          lng?: number | null;
          starts_at?: string | null;
          title?: string | null;
          vibe?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'meetups_creator_id_fkey';
            columns: ['creator_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Functions: {
      add_conversation_members: {
        Args: { p_conversation_id: string; p_user_ids: string[] };
        Returns: number;
      };
      admin_mark_report_handled: {
        Args: { p_report_id: string };
        Returns: undefined;
      };
      admin_open_reports: {
        Args: never;
        Returns: {
          created_at: string;
          details: string;
          id: string;
          reason: string;
          reported_display_name: string;
          reported_user_id: string;
          reported_username: string;
          snapshot: string;
          target_id: string;
          target_type: string;
        }[];
      };
      admin_remove_reported_content: {
        Args: { p_report_id: string };
        Returns: boolean;
      };
      block_user: {
        Args: { target_user_id: string };
        Returns: {
          addressee_id: string;
          blocked_by: string | null;
          created_at: string;
          id: string;
          requester_id: string;
          responded_at: string | null;
          status: string;
          user_a: string | null;
          user_b: string | null;
        };
        SetofOptions: {
          from: '*';
          to: 'friendships';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      can_see_message: {
        Args: { p_conversation_id: string; p_created_at: string };
        Returns: boolean;
      };
      check_in_at_meetup: {
        Args: { p_lat: number; p_lng: number; p_meetup_id: string };
        Returns: boolean;
      };
      create_conversation: {
        Args: { group_name?: string; other_user_ids: string[] };
        Returns: string;
      };
      current_friend_code: {
        Args: { rotate?: boolean };
        Returns: {
          code: string;
          expires_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'friend_codes';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      evening_heat: {
        Args: never;
        Returns: {
          lat: number;
          lng: number;
          people: number;
        }[];
      };
      export_my_data: { Args: never; Returns: Json };
      generate_friend_code: { Args: never; Returns: string };
      has_any_friendship_row: {
        Args: { a: string; b: string };
        Returns: boolean;
      };
      is_admin: { Args: never; Returns: boolean };
      is_blocked_between: { Args: { a: string; b: string }; Returns: boolean };
      is_blocked_direct_chat: {
        Args: { p_conversation_id: string; p_user_id: string };
        Returns: boolean;
      };
      is_conversation_member: {
        Args: { conversation_id: string; user_id: string };
        Returns: boolean;
      };
      is_friend: { Args: { a: string; b: string }; Returns: boolean };
      is_group_member: {
        Args: { p_conversation_id: string; p_user_id: string };
        Returns: boolean;
      };
      leave_conversation: {
        Args: { p_conversation_id: string };
        Returns: undefined;
      };
      leave_nearby: { Args: never; Returns: undefined };
      mark_conversation_read: {
        Args: { p_conversation_id: string };
        Returns: string;
      };
      meetup_here_now_count: { Args: { p_meetup_id: string }; Returns: number };
      meetup_interest_count: { Args: { p_meetup_id: string }; Returns: number };
      update_my_profile: {
        Args: { p_avatar_url?: string; p_bio: string; p_display_name: string };
        Returns: undefined;
      };
      mutual_friends: {
        Args: { p_user_id: string };
        Returns: {
          avatar_url: string;
          display_name: string;
          id: string;
          username: string;
        }[];
      };
      prepare_account_deletion: {
        Args: { p_user_id: string };
        Returns: {
          bucket: string;
          path: string;
        }[];
      };
      purge_expired_map_data: { Args: never; Returns: undefined };
      purge_expired_mutes: { Args: never; Returns: undefined };
      purge_expired_post_places: { Args: never; Returns: undefined };
      redeem_friend_code: {
        Args: { friend_code: string };
        Returns: {
          avatar_url: string;
          display_name: string;
          outcome: string;
          user_id: string;
        }[];
      };
      remove_member: {
        Args: { p_conversation_id: string; p_user_id: string };
        Returns: undefined;
      };
      rename_conversation: {
        Args: { p_conversation_id: string; p_name: string };
        Returns: undefined;
      };
      report_content: {
        Args: {
          p_details?: string;
          p_reason: string;
          p_target_id: string;
          p_target_type: string;
        };
        Returns: undefined;
      };
      request_storage_cleanup: { Args: never; Returns: undefined };
      respond_to_friend_request: {
        Args: { accept: boolean; request_id: string };
        Returns: undefined;
      };
      scan_nearby: {
        Args: { p_lat: number; p_lng: number };
        Returns: {
          avatar_url: string;
          display_name: string;
          request_state: string;
          user_id: string;
          username: string;
        }[];
      };
      send_friend_request: {
        Args: { target_user_id: string };
        Returns: {
          addressee_id: string;
          blocked_by: string | null;
          created_at: string;
          id: string;
          requester_id: string;
          responded_at: string | null;
          status: string;
          user_a: string | null;
          user_b: string | null;
        };
        SetofOptions: {
          from: '*';
          to: 'friendships';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      set_conversation_mute: {
        Args: { p_conversation_id: string; p_until: string };
        Returns: string;
      };
      set_group_avatar: {
        Args: { p_conversation_id: string; p_path: string };
        Returns: string;
      };
      suggested_friends_from_meetups: {
        Args: never;
        Returns: {
          avatar_url: string;
          display_name: string;
          last_checked_in_at: string;
          last_meetup_id: string;
          last_meetup_title: string;
          shared_meetup_count: number;
          user_id: string;
          username: string;
        }[];
      };
      suggested_friends_mutual: {
        Args: { p_limit?: number };
        Returns: {
          avatar_url: string;
          display_name: string;
          mutual_friend_count: number;
          user_id: string;
          username: string;
        }[];
      };
      take_storage_cleanup: {
        Args: never;
        Returns: {
          bucket: string;
          path: string;
        }[];
      };
      toggle_reaction: {
        Args: { p_emoji: string; p_message_id: string };
        Returns: string;
      };
      unblock_user: { Args: { target_user_id: string }; Returns: undefined };
      unsend_message: { Args: { p_message_id: string }; Returns: undefined };
      vote_on_warning: {
        Args: { p_gone: boolean; p_spot_id: string };
        Returns: {
          cleared: boolean;
          gone: number;
          still_there: number;
        }[];
      };
      warning_votes: {
        Args: { p_spot_id: string };
        Returns: {
          gone: number;
          my_vote: boolean;
          still_there: number;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
