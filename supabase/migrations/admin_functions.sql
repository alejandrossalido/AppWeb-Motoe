-- Create a function to allow Admins (Owner/Coordinator) to delete users from auth.users
-- This is a "Security Definer" function, meaning it runs with the privileges of the creator (postgres/admin),
-- bypassing RLS. We MUST check permissions inside the function.

CREATE OR REPLACE FUNCTION delete_user_account(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the requesting user is allowed to delete
  -- Only 'owner' and 'coordinator' can delete users
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() 
    AND role IN ('owner', 'coordinator')
  ) THEN
    RAISE EXCEPTION 'Access Denied: You do not have permission to delete users.';
  END IF;

  -- Delete from public.profiles (Cascade should handle this usually, but good to be explicit/safe)
  DELETE FROM public.profiles WHERE id = user_id;

  -- Delete from auth.users (This effectively "expels" them)
  DELETE FROM auth.users WHERE id = user_id;
END;
$$;
