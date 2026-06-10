-- 0020_personal_match_opponent_hand.sql
-- 개인 경기 등록 시 외부(직접 입력) 상대의 손잡이(오른손/왼손)를 기록하기 위한 컬럼.
-- 회원 상대/미입력 시 NULL. 분석 화면의 손잡이별 전적 집계에 사용된다.

alter table public.personal_matches
  add column opponent_dominant_hand text
  check (opponent_dominant_hand in ('right', 'left'));
