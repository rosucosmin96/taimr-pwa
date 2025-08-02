import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types (you can generate these with: npx supabase gen types typescript --project-id YOUR_PROJECT_ID)
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          profile_picture_url: string | null
          created_at: string | null
        }
        Insert: {
          id: string
          email: string
          name: string
          profile_picture_url?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          name?: string
          profile_picture_url?: string | null
          created_at?: string | null
        }
      }
      services: {
        Row: {
          id: string
          user_id: string
          name: string
          default_duration_minutes: number
          default_price_per_hour: number
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          default_duration_minutes: number
          default_price_per_hour: number
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          default_duration_minutes?: number
          default_price_per_hour?: number
          created_at?: string | null
        }
      }
      clients: {
        Row: {
          id: string
          user_id: string
          service_id: string
          name: string
          email: string | null
          phone: string | null
          custom_duration_minutes: number | null
          custom_price_per_hour: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          service_id: string
          name: string
          email?: string | null
          phone?: string | null
          custom_duration_minutes?: number | null
          custom_price_per_hour?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          service_id?: string
          name?: string
          email?: string | null
          phone?: string | null
          custom_duration_minutes?: number | null
          custom_price_per_hour?: number | null
          created_at?: string | null
        }
      }
      meetings: {
        Row: {
          id: string
          user_id: string
          service_id: string
          client_id: string
          title: string | null
          recurrence_id: string | null
          membership_id: string | null
          start_time: string
          end_time: string
          price_per_hour: number
          price_total: number
          status: string | null
          paid: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          service_id: string
          client_id: string
          title?: string | null
          recurrence_id?: string | null
          membership_id?: string | null
          start_time: string
          end_time: string
          price_per_hour: number
          price_total: number
          status?: string | null
          paid?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          service_id?: string
          client_id?: string
          title?: string | null
          recurrence_id?: string | null
          membership_id?: string | null
          start_time?: string
          end_time?: string
          price_per_hour?: number
          price_total?: number
          status?: string | null
          paid?: boolean | null
          created_at?: string | null
        }
      }
      recurrences: {
        Row: {
          id: string
          user_id: string
          service_id: string
          client_id: string
          frequency: string
          start_date: string
          end_date: string | null
          title: string
          start_time: string
          end_time: string
          price_per_hour: number
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          service_id: string
          client_id: string
          frequency: string
          start_date: string
          end_date?: string | null
          title: string
          start_time: string
          end_time: string
          price_per_hour?: number
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          service_id?: string
          client_id?: string
          frequency?: string
          start_date?: string
          end_date?: string | null
          title?: string
          start_time?: string
          end_time?: string
          price_per_hour?: number
          created_at?: string | null
        }
      }
      memberships: {
        Row: {
          id: string
          user_id: string
          service_id: string
          client_id: string
          name: string
          total_meetings: number
          price_per_membership: number
          price_per_meeting: number
          availability_days: number
          status: string | null
          paid: boolean | null
          start_date: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          service_id: string
          client_id: string
          name: string
          total_meetings: number
          price_per_membership: number
          price_per_meeting: number
          availability_days: number
          status?: string | null
          paid?: boolean | null
          start_date?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          service_id?: string
          client_id?: string
          name?: string
          total_meetings?: number
          price_per_membership?: number
          price_per_meeting?: number
          availability_days?: number
          status?: string | null
          paid?: boolean | null
          start_date?: string | null
          created_at?: string | null
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          message: string
          related_entity_id: string | null
          related_entity_type: string | null
          read: boolean | null
          read_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          message: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          read?: boolean | null
          read_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          message?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          read?: boolean | null
          read_at?: string | null
          created_at?: string | null
        }
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
  }
}
