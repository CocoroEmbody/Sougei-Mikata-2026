export type PickupLocationType = 'home' | 'school' | 'station' | 'convenience_store' | 'other';

export interface Facility {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  default_facility_id?: string;
  welfare_vehicle_required: boolean;
  pickup_location_type: PickupLocationType;
  pickup_location_name: string;
  pickup_location_address: string;
  pickup_lat?: number;
  pickup_lng?: number;
  pickup_time?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Vehicle {
  id: string;
  name: string;
  capacity: number;
  welfare_vehicle: boolean;
  wheelchair_capacity: number;
  created_at?: string;
  updated_at?: string;
}

export interface Driver {
  id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserRequest {
  user: User;
  selected: boolean;
  target_facility_id: string;
}

export interface ResourceAssignment {
  id: string;
  vehicle_id: string;
  driver_id: string;
}

export interface RouteStop {
  user_id: string;
  user_name: string;
  address: string;
  lat: number;
  lng: number;
  arrival_time: string;
  stop_number: number;
}

export interface OptimizedRoute {
  vehicle_id: string;
  vehicle_name: string;
  driver_id: string;
  driver_name: string;
  facility_id: string;
  facility_name: string;
  stops: RouteStop[];
  total_distance: number;
  total_duration: number;
}
