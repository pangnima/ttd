-- 20260520055504 add_gender_to_guest_player_rpc
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
CREATE OR REPLACE FUNCTION public.add_guest_player(
    p_club_id uuid,
    p_nickname text,
    p_gender text DEFAULT 'male'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id uuid := gen_random_uuid();
    v_gender text;
BEGIN
    IF NOT is_club_approved_member(p_club_id, auth.uid()) THEN
        RAISE EXCEPTION 'permission denied: not a club member';
    END IF;

    v_gender := CASE WHEN p_gender IN ('male', 'female') THEN p_gender ELSE 'male' END;

    INSERT INTO public.users (
        id, email, name, nickname, role, is_guest,
        phone, gender, dominant_hand
    )
    VALUES (
        v_user_id, '', p_nickname, p_nickname, 'member', true,
        '', v_gender, 'right'
    );

    INSERT INTO public.club_members (user_id, club_id, role, status)
    VALUES (v_user_id, p_club_id, 'member', 'approved');

    RETURN v_user_id;
END;
$function$;
