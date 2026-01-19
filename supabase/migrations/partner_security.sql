-- Enable RLS on all relevant tables if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE moto_specs ENABLE ROW LEVEL SECURITY;

-- 1. Permissions for 'Partner' Role (READ ONLY)
-- Tasks
CREATE POLICY "Partners can view all tasks" ON tasks
FOR SELECT
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'partner'
);

-- Work Sessions (OpsLab)
CREATE POLICY "Partners can view all work sessions" ON work_sessions
FOR SELECT
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'partner'
);

-- Moto Specs (Technical Specs)
CREATE POLICY "Partners can view all moto specs" ON moto_specs
FOR SELECT
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'partner'
);

-- Profiles
CREATE POLICY "Partners can view all profiles" ON profiles
FOR SELECT
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'partner'
);

-- 2. Explicitly Deny Write Access (Optional, as default deny applies, but good for clarity if you have broad open policies)
-- Note: Supabase RLS is "deny by default" unless a policy allows it. 
-- So as long as we DON'T create a policy saying "Partners can insert", they can't.
-- I will strictly ensure that the UPDATE policy for profiles only allows owners/coordinators to change roles to 'partner'.

-- 3. Policy for Assigning Roles (Profiles Table)
-- Only Owner and Coordinator can update a user's role
CREATE POLICY "Owners and Coordinators can update roles" ON profiles
FOR UPDATE
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'coordinator')
)
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'coordinator')
);
