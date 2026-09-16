-- 20260514074601 0006_extend_handle_new_user
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
  );
  RETURN NEW;
END;
$$;
