CREATE OR REPLACE FUNCTION public.send_broadcast_notification(title text, body text, target_scope text, target_value text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role TEXT;
  v_branch TEXT;
  v_subteam TEXT;
  inserted_count INT;
  uid UUID;
BEGIN
  uid := auth.uid();
  
  IF uid IS NULL THEN
      RAISE EXCEPTION 'Auth Error: No active session found. Please sign in again. (uid is null)';
  END IF;

  SELECT role, branch, subteam INTO v_role, v_branch, v_subteam
  FROM profiles
  WHERE id = uid;

  IF v_role IN ('owner', 'coordinator') THEN
    NULL; -- Allow access
  ELSIF v_role = 'team_lead' THEN
      IF v_subteam = 'General' OR v_subteam = 'Coordinación' THEN
        IF target_scope = 'global' THEN
            RAISE EXCEPTION 'Access Denied: Team Leads cannot send global broadcasts.';
        END IF;
        IF target_scope = 'branch' AND target_value != v_branch THEN
            RAISE EXCEPTION 'Access Denied: You can only broadcast to your own branch (%)', v_branch;
        END IF;
      ELSIF v_subteam != 'General' AND v_subteam != 'Coordinación' THEN
        IF target_scope != 'subteam' OR target_value != v_subteam THEN
            RAISE EXCEPTION 'Access Denied: You can only broadcast to your specific subteam (%)', v_subteam;
        END IF;
      END IF;
  ELSE
      IF v_role IS NULL THEN
         RAISE EXCEPTION 'Auth Error: No profile found for uid %.', uid;
      ELSE
         RAISE EXCEPTION 'Access Denied: Your role is "%", only leaders can send notifications.', v_role;
      END IF;
  END IF;

  WITH target_users AS (
    SELECT id FROM profiles
    WHERE 
      CASE 
        WHEN target_scope = 'global' THEN TRUE
        WHEN target_scope = 'branch' THEN branch = target_value
        WHEN target_scope = 'subteam' THEN subteam = target_value 
            AND (v_role IN ('owner', 'coordinator') OR branch = v_branch)
        ELSE FALSE
      END
  )
  INSERT INTO notifications (user_id, title, body)
  SELECT id, title, body FROM target_users;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  RETURN json_build_object('status', 'success', 'sent_count', inserted_count);
END;
$function$;
