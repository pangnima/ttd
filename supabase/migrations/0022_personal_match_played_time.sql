-- 0022_personal_match_played_time.sql
-- 개인 경기의 "경기 시각"(시:분)을 기록하기 위한 컬럼. 선택 입력이라 NULL 허용.
-- 분석 화면의 요일×시간 경기활동 히트맵 집계에 사용된다.
-- 기존 데이터는 NULL이며 시각 재입력 전까지 시간 기반 집계에서 제외된다.

alter table public.personal_matches
  add column played_time time;
