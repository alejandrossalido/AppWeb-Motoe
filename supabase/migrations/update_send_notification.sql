CREATE OR REPLACE FUNCTION public.send_broadcast_notification(title text, body text, target_scope text, target_value text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_role TEXT;
  current_branch TEXT;
  current_subteam TEXT;
  inserted_count INT;
  uid UUID;
BEGIN
  uid := auth.uid();
  SELECT role, branch, subteam INTO current_role, current_branch, current_subteam
  FROM profiles
  WHERE id = uid;

  IF current_role IN ('owner', 'coordinator') THEN
    NULL; 
  ELSIF current_role = 'team_lead' THEN
      IF current_subteam = 'General' OR current_subteam = 'Coordinación' THEN
        IF target_scope = 'global' THEN
            RAISE EXCEPTION 'Access Denied: Team Leads cannot send global broadcasts.';
        END IF;
        IF target_scope = 'branch' AND target_value != current_branch THEN
            RAISE EXCEPTION 'Access Denied: You can only broadcast to your own branch (%)', current_branch;
        END IF;
      ELSIF current_subteam != 'General' AND current_subteam != 'Coordinación' THEN
        IF target_scope != 'subteam' OR target_value != current_subteam THEN
            RAISE EXCEPTION 'Access Denied: You can only broadcast to your specific subteam (%)', current_subteam;
        END IF;
      END IF;
  ELSE
      -- Handle development/edge cases where auth.uid() might be null or role is null
      IF current_role IS NULL THEN
         RAISE EXCEPTION 'Auth Error: No role found for uid %. Session might be invalid.', uid;
      ELSE
         RAISE EXCEPTION 'Access Denied: You are %, only leaders can send notifications.', current_role;
      END IF;
  END IF;

  WITH target_users AS (
    SELECT id FROM profiles
    WHERE 
      CASE 
        WHEN target_scope = 'global' THEN TRUE
        WHEN target_scope = 'branch' THEN branch = target_value
        WHEN target_scope = 'subteam' THEN subteam = target_value 
            AND (current_role IN ('owner', 'coordinator') OR branch = current_branch)
        ELSE FALSE
      END
  )
  INSERT INTO notifications (user_id, title, body)
  SELECT id, title, body FROM target_users;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  RETURN json_build_object('status', 'success', 'sent_count', inserted_count);
END;
$function$;
