-- 20260514072938 0004_revoke_function_execute
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16

-- 트리거 전용 함수: anon/authenticated 직접 호출 금지
REVOKE EXECUTE ON FUNCTION public.handle_new_club() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;

-- RLS 헬퍼 함수: anon 직접 호출 금지 (authenticated는 RLS 평가에 필요해서 유지)
REVOKE EXECUTE ON FUNCTION public.is_club_owner(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_club_approved_member(uuid, uuid) FROM anon;

