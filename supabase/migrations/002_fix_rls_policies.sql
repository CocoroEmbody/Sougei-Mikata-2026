-- Fix RLS policies for all tables
-- Drop existing policies
DROP POLICY IF EXISTS "Allow insert access to facilities" ON facilities;
DROP POLICY IF EXISTS "Allow update access to facilities" ON facilities;
DROP POLICY IF EXISTS "Allow insert access to users" ON users;
DROP POLICY IF EXISTS "Allow update access to users" ON users;
DROP POLICY IF EXISTS "Allow insert access to vehicles" ON vehicles;
DROP POLICY IF EXISTS "Allow update access to vehicles" ON vehicles;
DROP POLICY IF EXISTS "Allow insert access to drivers" ON drivers;
DROP POLICY IF EXISTS "Allow update access to drivers" ON drivers;

-- Recreate policies with proper WITH CHECK clauses
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
