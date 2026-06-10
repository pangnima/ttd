-- 0021_personal_match_doubles_players.sql
-- 개인 경기 기록의 복식 지원: 내 파트너 1명 + 상대팀 2번째 선수 정보를 저장하기 위한 컬럼.
-- 기존 opponent_* 컬럼은 상대 #1(주 상대)로 그대로 유지하여 단식/기존 RPC와 호환된다.
-- 단식 경기에서는 아래 컬럼이 모두 NULL, 복식 경기에서만 채워진다.
-- 각 선수는 클럽 회원(*_user_id)이거나 직접 입력(*_name)이며 손잡이(*_dominant_hand)는 선택.

alter table public.personal_matches
  -- 내 파트너 (복식)
  add column partner_user_id uuid references public.users(id) on delete set null,
  add column partner_name text,
  add column partner_dominant_hand text
    check (partner_dominant_hand in ('right', 'left')),
  -- 상대팀 2번째 선수 (복식)
  add column opponent2_user_id uuid references public.users(id) on delete set null,
  add column opponent2_name text,
  add column opponent2_dominant_hand text
    check (opponent2_dominant_hand in ('right', 'left'));
