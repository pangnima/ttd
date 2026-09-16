-- 20260617035156 invite_preview_anon
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
-- 0032_invite_preview_anon.sql
-- 초대 링크 OG 미리보기를 위해 비로그인(anon) 크롤러/수신자가 클럽 기본 정보를 읽도록 허용.
-- 토큰 자체가 접근 권한. 가입(join_club_via_invite)은 authenticated 유지.
grant execute on function public.get_invite_preview(uuid) to anon;
