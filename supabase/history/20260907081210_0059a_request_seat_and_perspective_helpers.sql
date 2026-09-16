-- 20260907081210 0059a_request_seat_and_perspective_helpers
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
-- 0059 §1 — 결과 협상 축의 좌석·팀 판정과 관점 정규화 헬퍼.
-- 정본은 supabase/migrations/0059_result_negotiation_by_team.sql

-- 좌석 판정. 판정 순서가 규칙이다 — 참가자 슬롯이 당사자와 겹쳐도 한 사람이 양 팀이 되지 않게 한다
-- (requester_id <> opponent_user_id 제약은 있지만 참가자 슬롯 겹침을 막는 제약은 없다).
-- ⚠ authenticated에서도 EXECUTE를 회수한다 — 클라이언트가 부를 수 없으면 어떤 RLS 정책도 이 함수에
--   의존할 수 없고, 0057에서 겪은 'SELECT 정책이 자기 테이블을 되읽어 INSERT … RETURNING이 42501'이
--   재발할 경로가 구조적으로 사라진다. 이 함수는 SECURITY DEFINER RPC 안에서만 쓴다.
-- ⚠ participation_status(0056)로 거르지 않는다 — 요청이 accepted면 참여 게이트가 이미 전원 수락을
--   보장했다. 여기서 또 걸면 데이터가 어긋났을 때 '내 기록은 있는데 결과는 못 건드리는' 조용한 실패가
--   된다. 좌석은 좌석만 판정하고 동의는 참여 축이 책임진다.
create or replace function public.request_seat_of(p_request_id uuid, p_user_id uuid)
returns text
language sql security definer stable set search_path = public
as $$
  select case
    when p_user_id is null then null
    when exists (select 1 from match_requests r
                 where r.id = p_request_id and r.requester_id = p_user_id) then 'requester'
    when exists (select 1 from match_requests r
                 where r.id = p_request_id and r.opponent_user_id = p_user_id) then 'opponent'
    when exists (select 1 from match_request_participants p
                 where p.request_id = p_request_id and p.user_id = p_user_id and p.role = 'partner') then 'partner'
    when exists (select 1 from match_request_participants p
                 where p.request_id = p_request_id and p.user_id = p_user_id and p.role = 'opponent2') then 'opponent2'
    else null
  end;
$$;

revoke all on function public.request_seat_of(uuid, uuid) from public, anon, authenticated;

comment on function public.request_seat_of(uuid, uuid) is
  '결과 협상 축의 좌석 판정 (0059). 열람 축 is_request_party(0052)와 다른 축이며 RLS 정책에 쓰지 않는다.';

-- 팀 = 좌석의 묶음. {requester, partner} vs {opponent, opponent2}.
create or replace function public.request_result_team(p_request_id uuid, p_user_id uuid)
returns text
language sql security definer stable set search_path = public
as $$
  select case public.request_seat_of(p_request_id, p_user_id)
    when 'requester' then 'requester'
    when 'partner'   then 'requester'
    when 'opponent'  then 'opponent'
    when 'opponent2' then 'opponent'
    else null
  end;
$$;

revoke all on function public.request_result_team(uuid, uuid) from public, anon, authenticated;

-- 제안 스코어를 '요청자 관점'으로 정규화한다. 저장 규약이 언제나 요청자 관점이기 때문이다.
--
-- ⚠ 방향이 둘이고 상대2(opponent2)에서만 합성 순서가 갈린다.
--     표시(요청자 → 좌석):  swap_partner_perspective(invert_set_scores(x))   ← 0053의 관점 복사
--     제안(좌석 → 요청자):  invert_set_scores(swap_partner_perspective(x))   ← 이 함수
--   둘은 서로의 역함수이고, P와 I는 교환법칙이 성립하지 않는다. **차이는 애드 플래그에서만 난다** —
--   스코어(me/opp)는 두 순서가 같아 보이므로 애드를 넣지 않은 검증은 무의미하다.
--   swap_opponent_perspective는 쓰지 않는다: finalize(0057)가 그것을 쓰는 것은
--   '대표를 opponent 슬롯으로 재배치'라는 다른 일이고, 두 의미가 섞이면 반드시 헷갈린다.
create or replace function public.normalize_to_requester_perspective(p_sets jsonb, p_seat text)
returns jsonb
language sql immutable set search_path = public
as $$
  select case p_seat
    when 'requester' then p_sets
    when 'partner'   then public.swap_partner_perspective(p_sets)
    when 'opponent'  then public.invert_set_scores(p_sets)
    when 'opponent2' then public.invert_set_scores(public.swap_partner_perspective(p_sets))
    else p_sets
  end;
$$;

revoke all on function public.normalize_to_requester_perspective(jsonb, text) from public, anon, authenticated;
