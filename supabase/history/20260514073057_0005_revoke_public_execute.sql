-- 20260514073057 0005_revoke_public_execute
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16

-- PUBLIC(anon 포함 모든 role)에서 EXECUTE 완전 제거
REVOKE ALL ON FUNCTION public.handle_new_club() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_club_owner(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_club_approved_member(uuid, uuid) FROM PUBLIC;

-- RLS 정책 평가에 필요한 authenticated EXECUTE만 재부여
GRANT EXECUTE ON FUNCTION public.is_club_owner(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_club_approved_member(uuid, uuid) TO authenticated;

