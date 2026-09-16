-- E2E 정리 SQL — 테스트 서버(dev, xiwwbgltkbvxdzxxxoba)에서만 돌린다. prod에서는 절대 실행하지 않는다.
-- 실행: Supabase MCP `execute_sql`에 이 파일 전체를 그대로 보낸다(한 트랜잭션). 마지막 SELECT가 전부 0이어야 한다.
--
-- 왜 버튼이 아니라 스크립트인가: 방을 [매칭 리스트에서 내리기]로 지우면 출처 행(personal_matches·match_requests·
-- rotation_sessions)은 room_id만 null이 되어 개인 기록으로 남는다. 태그(코트명 'E2E-%', 메모 'E2E-%')로 그 잔재까지 잡는다.
-- 규약: docs/e2e/README.md 「태그 규약」·「정리 SQL」.

begin;

-- 0083: 닫힌 방은 트리거가 미정산 전환을 room_closed로 막아 삭제도 막힌다 — 먼저 잠금을 푼다
update match_rooms set closed_at = null where court_name like 'E2E-%' and closed_at is not null;

create temp table e2e_rooms on commit drop as
  select id from match_rooms where court_name like 'E2E-%';
create temp table e2e_reqs on commit drop as
  select id from match_requests where room_id in (select id from e2e_rooms);

-- 관점 행이 먼저 (source_request_id가 on delete set null이라 요청부터 지우면 고아가 남는다)
delete from personal_matches
 where room_id in (select id from e2e_rooms)
    or source_request_id in (select id from e2e_reqs)
    or notes like 'E2E-%';
delete from match_requests where id in (select id from e2e_reqs);   -- participants·negotiations cascade
delete from personal_matches where rotation_session_id in (select id from rotation_sessions where notes like 'E2E-%');
-- 내려진 방의 세션은 room_id가 풀리지만 court_name은 남는다
delete from rotation_sessions where room_id in (select id from e2e_rooms) or notes like 'E2E-%' or court_name like 'E2E-%';
delete from match_room_guests  where room_id in (select id from e2e_rooms);
delete from match_room_members where room_id in (select id from e2e_rooms);
delete from match_room_secrets where room_id in (select id from e2e_rooms);
delete from match_rooms where id in (select id from e2e_rooms);

-- 신규 가입·탈퇴 테스트 계정(@e2e.test) — README 「신규 가입·탈퇴 전용 계정」
create temp table e2e_users on commit drop as
  select id from auth.users where email like '%@e2e.test';
delete from match_room_members where user_id in (select id from e2e_users);
delete from personal_matches   where user_id in (select id from e2e_users);
delete from rotation_sessions  where user_id in (select id from e2e_users);
delete from public.users       where id in (select id from e2e_users);
delete from auth.users         where id in (select id from e2e_users);

select
  (select count(*) from match_rooms where court_name like 'E2E-%') as rooms,
  (select count(*) from personal_matches where court_name like 'E2E-%' or notes like 'E2E-%') as matches,
  (select count(*) from match_requests where court_name like 'E2E-%') as requests,
  (select count(*) from auth.users where email like '%@e2e.test') as e2e_users;

commit;

-- 예외 — [매칭 리스트에서 내리기]를 테스트한 방(S10.12): 방이 지워지면 그 방의 rotation_sessions·personal_matches는
-- room_id가 null로 풀려 태그로 찾을 수 없다(그 세션은 notes도 없다). 내리기 전에 세션 id를 적어 두고 따로 돌린다:
--   delete from rotation_sessions where id = '<id>';
-- 잔재를 찾는 보조 쿼리:
--   select id from rotation_sessions where room_id is null and notes is null
--    and user_id in ('<테스트 계정 uuid>') and created_at > '<실행 시작 시각>';
-- 확인 SELECT가 0이 아니면 court_name 없이 만들어진 방(태그 누락)을 손으로 찾는다. 트리거(cleanup_match_room_*)가
-- 중간에 방을 먼저 지울 수 있지만 최종 결과는 같다.
