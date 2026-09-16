-- 20260518001628 0013_member_count_sync_and_ntrp_signup
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16

-- 1) handle_new_user 트리거: ntrp 메타데이터 수집 추가
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.users (
    id, email, name, nickname, role,
    phone, gender, dominant_hand, tennis_start_date, profile_image, ntrp
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
    NEW.raw_user_meta_data->>'profile_image',
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'ntrp', '')::numeric, 3.0)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 2) club_members 변경 시 clubs.member_count 동기화 함수
CREATE OR REPLACE FUNCTION public.sync_club_member_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'approved' THEN
      UPDATE public.clubs SET member_count = member_count + 1 WHERE id = NEW.club_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status <> 'approved' AND NEW.status = 'approved' THEN
      UPDATE public.clubs SET member_count = member_count + 1 WHERE id = NEW.club_id;
    ELSIF OLD.status = 'approved' AND NEW.status <> 'approved' THEN
      UPDATE public.clubs SET member_count = GREATEST(member_count - 1, 0) WHERE id = NEW.club_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.status = 'approved' THEN
      UPDATE public.clubs SET member_count = GREATEST(member_count - 1, 0) WHERE id = OLD.club_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- 3) 트리거 등록
DROP TRIGGER IF EXISTS sync_club_member_count_trigger ON public.club_members;
CREATE TRIGGER sync_club_member_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.club_members
  FOR EACH ROW EXECUTE FUNCTION public.sync_club_member_count();

-- 4) 기존 데이터 백필
UPDATE public.clubs c SET member_count = (
  SELECT COUNT(*) FROM public.club_members cm
  WHERE cm.club_id = c.id AND cm.status = 'approved'
);

