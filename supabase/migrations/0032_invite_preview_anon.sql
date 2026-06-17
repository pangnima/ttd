-- 0032_invite_preview_anon.sql
--- 초대 링크(/clubs/join/[token]) 공유 시 OG 미리보기를 띄우려면 비로그인 크롤러(anon)와
--- 비로그인 수신자가 클럽 기본 정보를 읽을 수 있어야 한다. 토큰 자체가 접근 권한이므로
--- 미리보기 RPC만 anon에 허용한다. (가입 join_club_via_invite는 authenticated 유지)
grant execute on function public.get_invite_preview(uuid) to anon;
