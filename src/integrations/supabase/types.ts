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
      admin_actions: {
        Row: {
          action_type: string
          admin_id: string
          created_at: string
          details: string | null
          email_template: string | null
          id: string
          target_user_id: string
        }
        Insert: {
          action_type: string
          admin_id: string
          created_at?: string
          details?: string | null
          email_template?: string | null
          id?: string
          target_user_id: string
        }
        Update: {
          action_type?: string
          admin_id?: string
          created_at?: string
          details?: string | null
          email_template?: string | null
          id?: string
          target_user_id?: string
        }
        Relationships: []
      }
      ai_verification_feedback: {
        Row: {
          admin_decision: string
          admin_id: string
          ai_confidence: number
          ai_decision: string
          ai_notes: string | null
          created_at: string
          document_url: string
          feedback_notes: string | null
          id: string
          user_id: string
        }
        Insert: {
          admin_decision: string
          admin_id: string
          ai_confidence: number
          ai_decision: string
          ai_notes?: string | null
          created_at?: string
          document_url: string
          feedback_notes?: string | null
          id?: string
          user_id: string
        }
        Update: {
          admin_decision?: string
          admin_id?: string
          ai_confidence?: number
          ai_decision?: string
          ai_notes?: string | null
          created_at?: string
          document_url?: string
          feedback_notes?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_verification_feedback_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_verification_feedback_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_verification_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_verification_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      banned_users: {
        Row: {
          banned_at: string
          banned_by: string
          id: string
          is_active: boolean
          reason: string | null
          unbanned_at: string | null
          user_id: string
        }
        Insert: {
          banned_at?: string
          banned_by: string
          id?: string
          is_active?: boolean
          reason?: string | null
          unbanned_at?: string | null
          user_id: string
        }
        Update: {
          banned_at?: string
          banned_by?: string
          id?: string
          is_active?: boolean
          reason?: string | null
          unbanned_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocked_users_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_users_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_users_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_users_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          listing_id: string
          seller_id: string
          updated_at: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          listing_id: string
          seller_id: string
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          listing_id?: string
          seller_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rates: {
        Row: {
          base_currency: string
          id: string
          last_updated: string
          rate: number
          target_currency: string
        }
        Insert: {
          base_currency: string
          id?: string
          last_updated?: string
          rate: number
          target_currency: string
        }
        Update: {
          base_currency?: string
          id?: string
          last_updated?: string
          rate?: number
          target_currency?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings_with_available_kg"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_signatures: {
        Row: {
          conditions_accepted: Json
          created_at: string
          id: string
          ip_address: string | null
          reservation_id: string | null
          signature_data: string
          signature_type: string
          signed_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          conditions_accepted?: Json
          created_at?: string
          id?: string
          ip_address?: string | null
          reservation_id?: string | null
          signature_data: string
          signature_type: string
          signed_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          conditions_accepted?: Json
          created_at?: string
          id?: string
          ip_address?: string | null
          reservation_id?: string | null
          signature_data?: string
          signature_type?: string
          signed_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_signatures_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_signatures_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_signatures_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          allowed_items: string[] | null
          arrival: string
          arrival_date: string
          available_kg: number
          created_at: string
          currency: string
          delivery_option: string
          departure: string
          departure_date: string
          description: string | null
          destination_image: string | null
          id: string
          price_per_kg: number
          prohibited_items: string[] | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allowed_items?: string[] | null
          arrival: string
          arrival_date: string
          available_kg: number
          created_at?: string
          currency?: string
          delivery_option?: string
          departure: string
          departure_date: string
          description?: string | null
          destination_image?: string | null
          id?: string
          price_per_kg: number
          prohibited_items?: string[] | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allowed_items?: string[] | null
          arrival?: string
          arrival_date?: string
          available_kg?: number
          created_at?: string
          currency?: string
          delivery_option?: string
          departure?: string
          departure_date?: string
          description?: string | null
          destination_image?: string | null
          id?: string
          price_per_kg?: number
          prohibited_items?: string[] | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          read: boolean
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read?: boolean
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read?: boolean
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          alerts_enabled: boolean
          created_at: string
          id: string
          messages_enabled: boolean
          promotions_enabled: boolean
          push_enabled: boolean
          responses_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          alerts_enabled?: boolean
          created_at?: string
          id?: string
          messages_enabled?: boolean
          promotions_enabled?: boolean
          push_enabled?: boolean
          responses_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          alerts_enabled?: boolean
          created_at?: string
          id?: string
          messages_enabled?: boolean
          promotions_enabled?: boolean
          push_enabled?: boolean
          responses_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      privacy_settings: {
        Row: {
          allow_data_sharing: boolean
          cookie_analytics: boolean
          cookie_essential: boolean
          cookie_marketing: boolean
          created_at: string
          id: string
          listing_visibility: string
          profile_visibility: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allow_data_sharing?: boolean
          cookie_analytics?: boolean
          cookie_essential?: boolean
          cookie_marketing?: boolean
          created_at?: string
          id?: string
          listing_visibility?: string
          profile_visibility?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allow_data_sharing?: boolean
          cookie_analytics?: boolean
          cookie_essential?: boolean
          cookie_marketing?: boolean
          created_at?: string
          id?: string
          listing_visibility?: string
          profile_visibility?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "privacy_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "privacy_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ai_confidence_score: number | null
          avatar_url: string
          avg_response_time: number | null
          bio: string | null
          city: string
          completed_trips: number | null
          country: string
          created_at: string
          email: string | null
          full_name: string
          id: string
          id_document_url: string | null
          id_submitted_at: string | null
          id_verified: boolean | null
          phone: string
          phone_verified: boolean | null
          preferred_currency: string
          response_rate: number | null
          terms_accepted: boolean
          terms_accepted_at: string | null
          updated_at: string
          user_type: string | null
          verification_method: string | null
          verification_notes: string | null
          verified_at: string | null
        }
        Insert: {
          ai_confidence_score?: number | null
          avatar_url: string
          avg_response_time?: number | null
          bio?: string | null
          city: string
          completed_trips?: number | null
          country: string
          created_at?: string
          email?: string | null
          full_name: string
          id: string
          id_document_url?: string | null
          id_submitted_at?: string | null
          id_verified?: boolean | null
          phone: string
          phone_verified?: boolean | null
          preferred_currency?: string
          response_rate?: number | null
          terms_accepted?: boolean
          terms_accepted_at?: string | null
          updated_at?: string
          user_type?: string | null
          verification_method?: string | null
          verification_notes?: string | null
          verified_at?: string | null
        }
        Update: {
          ai_confidence_score?: number | null
          avatar_url?: string
          avg_response_time?: number | null
          bio?: string | null
          city?: string
          completed_trips?: number | null
          country?: string
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          id_document_url?: string | null
          id_submitted_at?: string | null
          id_verified?: boolean | null
          phone?: string
          phone_verified?: boolean | null
          preferred_currency?: string
          response_rate?: number | null
          terms_accepted?: boolean
          terms_accepted_at?: string | null
          updated_at?: string
          user_type?: string | null
          verification_method?: string | null
          verification_notes?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          description: string | null
          id: string
          reason: string
          reported_id: string
          reporter_id: string
          status: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          reason: string
          reported_id: string
          reporter_id: string
          status?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          reason?: string
          reported_id?: string
          reporter_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reported_id_fkey"
            columns: ["reported_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reported_id_fkey"
            columns: ["reported_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          read: boolean
          reservation_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          read?: boolean
          reservation_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          read?: boolean
          reservation_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservation_messages_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          archived_by_buyer_at: string | null
          archived_by_seller_at: string | null
          buyer_id: string
          created_at: string
          delivery_method: string | null
          id: string
          item_description: string
          listing_id: string
          pickup_address: string | null
          pickup_notes: string | null
          recipient_phone: string | null
          requested_kg: number
          seller_id: string
          status: string
          total_price: number
          transport_offer_id: string | null
          updated_at: string
        }
        Insert: {
          archived_by_buyer_at?: string | null
          archived_by_seller_at?: string | null
          buyer_id: string
          created_at?: string
          delivery_method?: string | null
          id?: string
          item_description: string
          listing_id: string
          pickup_address?: string | null
          pickup_notes?: string | null
          recipient_phone?: string | null
          requested_kg: number
          seller_id: string
          status?: string
          total_price: number
          transport_offer_id?: string | null
          updated_at?: string
        }
        Update: {
          archived_by_buyer_at?: string | null
          archived_by_seller_at?: string | null
          buyer_id?: string
          created_at?: string
          delivery_method?: string | null
          id?: string
          item_description?: string
          listing_id?: string
          pickup_address?: string | null
          pickup_notes?: string | null
          recipient_phone?: string | null
          requested_kg?: number
          seller_id?: string
          status?: string
          total_price?: number
          transport_offer_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings_with_available_kg"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_transport_offer_id_fkey"
            columns: ["transport_offer_id"]
            isOneToOne: false
            referencedRelation: "transport_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          listing_id: string
          rating: number
          reviewed_id: string
          reviewer_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          listing_id: string
          rating: number
          reviewed_id: string
          reviewer_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          listing_id?: string
          rating?: number
          reviewed_id?: string
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings_with_available_kg"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewed_id_fkey"
            columns: ["reviewed_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewed_id_fkey"
            columns: ["reviewed_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      route_alerts: {
        Row: {
          active: boolean
          arrival: string
          created_at: string
          departure: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          arrival: string
          created_at?: string
          departure: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          arrival?: string
          created_at?: string
          departure?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_events: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_automatic: boolean | null
          location_lat: number | null
          location_lng: number | null
          location_name: string | null
          reservation_id: string
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_automatic?: boolean | null
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          reservation_id: string
          status: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_automatic?: boolean | null
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          reservation_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_events_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          buyer_id: string
          created_at: string
          id: string
          listing_id: string
          payment_status: string | null
          platform_commission: number
          reservation_id: string | null
          seller_amount: number
          seller_id: string
          status: string
          stripe_payment_intent_id: string | null
          stripe_transfer_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          buyer_id: string
          created_at?: string
          id?: string
          listing_id: string
          payment_status?: string | null
          platform_commission: number
          reservation_id?: string | null
          seller_amount: number
          seller_id: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_transfer_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          buyer_id?: string
          created_at?: string
          id?: string
          listing_id?: string
          payment_status?: string | null
          platform_commission?: number
          reservation_id?: string | null
          seller_amount?: number
          seller_id?: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_transfer_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings_with_available_kg"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_offers: {
        Row: {
          created_at: string
          id: string
          listing_id: string | null
          message: string | null
          proposed_price: number | null
          request_id: string
          reservation_id: string | null
          status: string
          traveler_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id?: string | null
          message?: string | null
          proposed_price?: number | null
          request_id: string
          reservation_id?: string | null
          status?: string
          traveler_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string | null
          message?: string | null
          proposed_price?: number | null
          request_id?: string
          reservation_id?: string | null
          status?: string
          traveler_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transport_offers_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_offers_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings_with_available_kg"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_offers_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "transport_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_offers_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_offers_traveler_id_fkey"
            columns: ["traveler_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_offers_traveler_id_fkey"
            columns: ["traveler_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_requests: {
        Row: {
          arrival: string
          budget_max: number | null
          created_at: string
          currency: string
          departure: string
          departure_date_end: string | null
          departure_date_start: string
          description: string | null
          id: string
          requested_kg: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          arrival: string
          budget_max?: number | null
          created_at?: string
          currency?: string
          departure: string
          departure_date_end?: string | null
          departure_date_start: string
          description?: string | null
          id?: string
          requested_kg: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          arrival?: string
          budget_max?: number | null
          created_at?: string
          currency?: string
          departure?: string
          departure_date_end?: string | null
          departure_date_start?: string
          description?: string | null
          id?: string
          requested_kg?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transport_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          external_id: string | null
          id: string
          metadata: Json | null
          payout_method: string | null
          phone_number: string | null
          provider: string | null
          reference: string | null
          reservation_id: string | null
          status: string
          type: string
          updated_at: string
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          payout_method?: string | null
          phone_number?: string | null
          provider?: string | null
          reference?: string | null
          reservation_id?: string | null
          status?: string
          type: string
          updated_at?: string
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          payout_method?: string | null
          phone_number?: string | null
          provider?: string | null
          reference?: string | null
          reservation_id?: string | null
          status?: string
          type?: string
          updated_at?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          currency: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      listings_with_available_kg: {
        Row: {
          allowed_items: string[] | null
          arrival: string | null
          arrival_date: string | null
          available_kg: number | null
          created_at: string | null
          currency: string | null
          delivery_option: string | null
          departure: string | null
          departure_date: string | null
          description: string | null
          destination_image: string | null
          id: string | null
          price_per_kg: number | null
          prohibited_items: string[] | null
          real_available_kg: number | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          allowed_items?: string[] | null
          arrival?: string | null
          arrival_date?: string | null
          available_kg?: number | null
          created_at?: string | null
          currency?: string | null
          delivery_option?: string | null
          departure?: string | null
          departure_date?: string | null
          description?: string | null
          destination_image?: string | null
          id?: string | null
          price_per_kg?: number | null
          prohibited_items?: string[] | null
          real_available_kg?: never
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          allowed_items?: string[] | null
          arrival?: string | null
          arrival_date?: string | null
          available_kg?: number | null
          created_at?: string | null
          currency?: string | null
          delivery_option?: string | null
          departure?: string | null
          departure_date?: string | null
          description?: string | null
          destination_image?: string | null
          id?: string | null
          price_per_kg?: number | null
          prohibited_items?: string[] | null
          real_available_kg?: never
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      public_profiles: {
        Row: {
          avatar_url: string | null
          avg_response_time: number | null
          bio: string | null
          city: string | null
          completed_trips: number | null
          country: string | null
          created_at: string | null
          full_name: string | null
          id: string | null
          id_verified: boolean | null
          phone_verified: boolean | null
          response_rate: number | null
          user_type: string | null
        }
        Insert: {
          avatar_url?: string | null
          avg_response_time?: number | null
          bio?: string | null
          city?: string | null
          completed_trips?: number | null
          country?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          id_verified?: boolean | null
          phone_verified?: boolean | null
          response_rate?: number | null
          user_type?: string | null
        }
        Update: {
          avatar_url?: string | null
          avg_response_time?: number | null
          bio?: string | null
          city?: string | null
          completed_trips?: number | null
          country?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          id_verified?: boolean | null
          phone_verified?: boolean | null
          response_rate?: number | null
          user_type?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      archive_expired_listings: { Args: never; Returns: undefined }
      get_available_kg: { Args: { listing_id_param: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      send_notification: {
        Args: {
          p_message: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      upsert_push_token: {
        Args: { p_platform: string; p_token: string; p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
