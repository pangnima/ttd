-- 0023_personal_match_opponent_ntrp.sql
-- 개인 경기 상대(팀)의 추정 난이도(NTRP). 승패 기반 개인 레이팅 ELO의 상대 레이팅으로 사용된다.
-- 선택 입력이라 NULL 허용. 단식=상대 1명, 복식=상대팀 평균을 단일값으로 저장한다.
-- NULL이면 계산 시 fallback(등록 상대 ntrp → 본인 ntrp → 기본 2.5)으로 보강된다.
-- 기존 데이터는 NULL이며 레이팅은 fallback으로 계산된다.

alter table public.personal_matches
  add column opponent_ntrp numeric
  check (opponent_ntrp is null or (opponent_ntrp >= 1.0 and opponent_ntrp <= 7.0));
