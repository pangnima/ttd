-- 20260515045129 0010_guest_player_support
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16

-- 게스트 플레이어 지원: public.users 에서 auth.users FK 제거

ALTER TABLE public.users DROP CONSTRAINT users_id_fkey;

-- handle_new_user 트리거에 ON CONFLICT 추가 (게스트 id와 충돌 방지)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (
    id, email, name, nickname, role,
    phone, gender, dominant_hand, tennis_start_date, profile_image
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'nickname', split_part(NEW.email, '@', 1)),
    'member',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'gender',
    NEW.raw_user_meta_data->>'dominant_hand',
    CASE
      WHEN NEW.raw_user_meta_data->>'tennis_start_date' IS NOT NULL
        AND NEW.raw_user_meta_data->>'tennis_start_date' != ''
      THEN (NEW.raw_user_meta_data->>'tennis_start_date')::date
      ELSE NULL
    END,
    NEW.raw_user_meta_data->>'profile_image'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

