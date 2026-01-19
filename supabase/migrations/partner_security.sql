-- Enable RLS (and ensure it doesn't lock everyone out)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE moto_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 1. GENERIC READ ACCESS (Everyone can read)
-- This fixes the issue where everyone was blocked.
CREATE POLICY "Enable read access for all users" ON tasks FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON work_sessions FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON moto_specs FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON profiles FOR SELECT USING (true);

-- 2. WRITE ACCESS (Restricted to Non-Partners)
-- Partners are the ONLY ones blocked from writing.
-- Note: We prevent recursion on 'profiles' by relying on the fact that SELECT is open.

-- Tasks
CREATE POLICY "Enable write for non-partners" ON tasks FOR ALL 
USING ( (SELECT role FROM profiles WHERE id = auth.uid()) IS DISTINCT FROM 'partner' );

-- Work Sessions
CREATE POLICY "Enable write for non-partners" ON work_sessions FOR ALL 
USING ( (SELECT role FROM profiles WHERE id = auth.uid()) IS DISTINCT FROM 'partner' );

-- Moto Specs
CREATE POLICY "Enable write for non-partners" ON moto_specs FOR ALL 
USING ( (SELECT role FROM profiles WHERE id = auth.uid()) IS DISTINCT FROM 'partner' );

-- Profiles (User Management)
-- Allow non-partners to update (usually users updating themselves or admins updating others)
CREATE POLICY "Enable update for non-partners" ON profiles FOR UPDATE
USING ( (SELECT role FROM profiles WHERE id = auth.uid()) IS DISTINCT FROM 'partner' )
WITH CHECK ( (SELECT role FROM profiles WHERE id = auth.uid()) IS DISTINCT FROM 'partner' );

-- Allow insert (Registration)
CREATE POLICY "Enable insert for all authenticated" ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);
