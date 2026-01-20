export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      facilities: {
        Row: {
          id: string
          name: string
          address: string
          lat: number
          lng: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          address: string
          lat: number
          lng: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          address?: string
          lat?: number
          lng?: number
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          name: string
          address: string
          lat: number
          lng: number
          default_facility_id: string | null
          welfare_vehicle_required: boolean
          pickup_location_type: string
          pickup_location_name: string
          pickup_location_address: string
          pickup_lat: number | null
          pickup_lng: number | null
          pickup_time: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          address: string
          lat: number
          lng: number
          default_facility_id?: string | null
          welfare_vehicle_required?: boolean
          pickup_location_type?: string
          pickup_location_name?: string
          pickup_location_address?: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_time?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          address?: string
          lat?: number
          lng?: number
          default_facility_id?: string | null
          welfare_vehicle_required?: boolean
          pickup_location_type?: string
          pickup_location_name?: string
          pickup_location_address?: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_time?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      vehicles: {
        Row: {
          id: string
          name: string
          capacity: number
          welfare_vehicle: boolean
          wheelchair_capacity: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          capacity?: number
          welfare_vehicle?: boolean
          wheelchair_capacity?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          capacity?: number
          welfare_vehicle?: boolean
          wheelchair_capacity?: number
          created_at?: string
          updated_at?: string
        }
      }
      drivers: {
        Row: {
          id: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
          updated_at?: string
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
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
