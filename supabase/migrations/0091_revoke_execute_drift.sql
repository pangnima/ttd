-- 0091_revoke_execute_drift.sql
-- Week 68 환경 분리 — dev(xiwwbgltkbvxdzxxxoba)에는 있는데 히스토리 재생으로 만든 prod에는 없던 정의.
--
-- 두 프로젝트의 정의 스냅샷(scripts/db-history.ts snapshot)을 diff하니 함수·정책·컬럼·제약·트리거·인덱스는
-- 전부 같았고 routine_grants만 달랐다: 아래 넷의 EXECUTE가 dev에서만 회수돼 있었다. "새 RPC는 anon EXECUTE
-- 회수, 트리거 함수는 PUBLIC도 회수"(CLAUDE.md)를 마이그레이션이 아니라 execute_sql로만 적용한 자리다.
-- 히스토리 밖 정의는 재현되지 않으므로 여기 편입한다. dev에서는 no-op, prod에서는 실제 회수.
--
-- 트리거 함수 셋: 트리거는 소유자 권한으로 돌므로 클라이언트 EXECUTE가 필요 없다 — 열려 있으면 RPC처럼 직접 부를 수 있다.
revoke execute on function public.cleanup_match_room_on_personal_match_delete() from public, anon, authenticated;
revoke execute on function public.cleanup_match_room_on_request_close() from public, anon, authenticated;
revoke execute on function public.sync_match_room_from_personal_match() from public, anon, authenticated;
-- 비밀번호 변경은 로그인한 호스트만(0046 규칙) — anon이 부를 이유가 없다.
revoke execute on function public.update_match_room_password(uuid, text) from anon;
