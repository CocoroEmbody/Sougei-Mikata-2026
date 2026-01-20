-- Facilities table
CREATE TABLE IF NOT EXISTS facilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  default_facility_id uuid REFERENCES facilities(id) ON DELETE SET NULL,
  welfare_vehicle_required boolean DEFAULT false,
  pickup_location_type text DEFAULT 'home',
  pickup_location_name text DEFAULT '',
  pickup_location_address text DEFAULT '',
  pickup_lat double precision,
  pickup_lng double precision,
  pickup_time time,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  capacity integer NOT NULL DEFAULT 4,
  welfare_vehicle boolean DEFAULT false,
  wheelchair_capacity integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Drivers table
CREATE TABLE IF NOT EXISTS drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for facilities
CREATE POLICY "Allow read access to facilities" ON facilities
  FOR SELECT USING (true);

CREATE POLICY "Allow insert access to facilities" ON facilities
  FOR INSERT 
  WITH CHECK (
    (auth.role() = 'authenticated' OR auth.role() = 'anon') AND
    name IS NOT NULL AND name != '' AND
    address IS NOT NULL AND address != ''
  );

CREATE POLICY "Allow update access to facilities" ON facilities
  FOR UPDATE 
  USING (auth.role() = 'authenticated' OR auth.role() = 'anon')
  WITH CHECK (
    name IS NOT NULL AND name != '' AND
    address IS NOT NULL AND address != ''
  );

CREATE POLICY "Allow delete access to facilities" ON facilities
  FOR DELETE USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- RLS Policies for users
CREATE POLICY "Allow read access to users" ON users
  FOR SELECT USING (true);

CREATE POLICY "Allow insert access to users" ON users
  FOR INSERT 
  WITH CHECK (
    (auth.role() = 'authenticated' OR auth.role() = 'anon') AND
    name IS NOT NULL AND name != '' AND
    address IS NOT NULL AND address != ''
  );

CREATE POLICY "Allow update access to users" ON users
  FOR UPDATE 
  USING (auth.role() = 'authenticated' OR auth.role() = 'anon')
  WITH CHECK (
    name IS NOT NULL AND name != '' AND
    address IS NOT NULL AND address != ''
  );

CREATE POLICY "Allow delete access to users" ON users
  FOR DELETE USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- RLS Policies for vehicles
CREATE POLICY "Allow read access to vehicles" ON vehicles
  FOR SELECT USING (true);

CREATE POLICY "Allow insert access to vehicles" ON vehicles
  FOR INSERT 
  WITH CHECK (
    (auth.role() = 'authenticated' OR auth.role() = 'anon') AND
    name IS NOT NULL AND name != '' AND
    capacity >= 1 AND capacity <= 100
  );

CREATE POLICY "Allow update access to vehicles" ON vehicles
  FOR UPDATE 
  USING (auth.role() = 'authenticated' OR auth.role() = 'anon')
  WITH CHECK (
    name IS NOT NULL AND name != '' AND
    capacity >= 1 AND capacity <= 100
  );

CREATE POLICY "Allow delete access to vehicles" ON vehicles
  FOR DELETE USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- RLS Policies for drivers
CREATE POLICY "Allow read access to drivers" ON drivers
  FOR SELECT USING (true);

CREATE POLICY "Allow insert access to drivers" ON drivers
  FOR INSERT 
  WITH CHECK (
    (auth.role() = 'authenticated' OR auth.role() = 'anon') AND
    name IS NOT NULL AND name != ''
  );

CREATE POLICY "Allow update access to drivers" ON drivers
  FOR UPDATE 
  USING (auth.role() = 'authenticated' OR auth.role() = 'anon')
  WITH CHECK (
    name IS NOT NULL AND name != ''
  );

CREATE POLICY "Allow delete access to drivers" ON drivers
  FOR DELETE USING (auth.role() = 'authenticated' OR auth.role() = 'anon');
