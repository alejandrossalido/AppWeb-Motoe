-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone valid can VIEW tasks
CREATE POLICY "Tasks are viewable by everyone" 
ON tasks FOR SELECT 
USING ( true );

-- Policy: Members, Team Leads, Coordinators, Owners can INSERT (Propose)
-- Partners cannot insert
CREATE POLICY "Members and above can propose tasks" 
ON tasks FOR INSERT 
WITH CHECK (
  auth.uid() = created_by AND
  (SELECT role FROM public.users WHERE id = auth.uid()) IN ('member', 'team_lead', 'coordinator', 'owner')
);

-- Policy: Only Leaders can UPDATE status to 'available' (Publish) or 'rejected'
-- Or Assign tasks
CREATE POLICY "Leaders can publish and manage tasks" 
ON tasks FOR UPDATE 
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) IN ('team_lead', 'coordinator', 'owner')
);

-- Policy: Users can update tasks they are assigned to (e.g. move to in_progress, completed)
-- This might overlap with the above, so we can split logic if needed, 
-- but for now assuming Leaders manage the board or users manage their own "in_progress" state.
-- Specific policy for taking a task (Available -> In Progress) logic would go here.
CREATE POLICY "Users can update their own assigned tasks"
ON tasks FOR UPDATE
USING (
  assigned_to = auth.uid() OR
  (SELECT role FROM public.users WHERE id = auth.uid()) IN ('team_lead', 'coordinator', 'owner')
);
