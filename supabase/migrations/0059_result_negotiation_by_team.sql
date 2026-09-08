-- ════════════════════════════════════════════════════════════════════════════
-- 0059 — 결과 협상을 팀 단위로 + 취소한 초대를 다시 보낼 수 있게
-- ════════════════════════════════════════════════════════════════════════════
--- 두 건이다.
---
--- ① **결과 협상 권한** — 쓰기 RPC 4종이 requester_id / opponent_user_id 두 UUID만 통과시켜,
---    복식이 '팀 대 팀'이 아니라 '요청자 1명 ↔ 상대팀 대표 1명'의 2자 협상이었다. 기록은 0053부터
---    회원 참가자 4명 전원에게 생기는데 권한만 2인이라, **대표가 앱에 안 들어오면 결과가 영영
---    확정되지 않았다.** 페어 중 다른 한 명이 수락해도 인정되지 않고 배지만 보였다.
---    → 자격을 좌석 4개 전원으로 넓히되, **제안자와 같은 팀은 확인할 수 없다**는 담합 방지 가드를
---      함께 세운다. 이 가드가 없으면 내가 제안하고 내 파트너가 확인해 상대 동의 없이 확정된다
---      (0056이 참여 축에서 막은 것과 같은 종류의 구멍이다).
---
--- ② **초대 취소 후 재초대** — 0057 트리거의 삭제 절이 'rejected' 좌석만 보존해서, 재초대로
---    pending이 된 좌석을 주최자가 [참가자 제외]하면 행이 통째로 사라졌다. 그러면 거절 이력과
---    좌석 조인으로만 얻던 이름이 함께 없어져, 유일한 명시적 재초대 UI("다시 초대")에서도 빠진다.
---    거절은 좌석을 남기는데 제외는 지우는 비대칭이 원인이다.
---    → 좌석에 'removed'를 두어 제외도 거절처럼 이력을 남긴다.
---
--- 스키마 변경은 ②의 CHECK 하나뿐이고 RLS 정책·백필은 0건이다.


-- ════════════════════════════════════════════════════════════════
-- §1 좌석·팀 판정과 관점 정규화 헬퍼
-- ════════════════════════════════════════════════════════════════
--- 좌석 넷: requester_id(A) / role='partner'(B) / opponent_user_id(C) / role='opponent2'(D).
--- 팀은 {A,B} = 'requester', {C,D} = 'opponent'. 단식은 참가자 행이 없어 좌석이 A·C뿐이라
--- 현행 동작 그대로 퇴화한다.
---
--- 판정 순서가 규칙이다 — requester → opponent → partner → opponent2. `requester_id <> opponent_user_id`
--- 제약은 있지만 참가자 슬롯이 당사자와 겹치는 것을 막는 제약은 없으므로, 겹쳐도 한 사람이
--- 양 팀이 되는 일이 없어야 한다.
---
--- ⚠ authenticated에서도 EXECUTE를 회수한다. 클라이언트가 부를 수 없으면 어떤 RLS 정책도 이 함수에
---   의존할 수 없고, 0057에서 겪은 사고(자기 테이블을 되읽는 STABLE 함수를 SELECT 정책에 걸어
---   `INSERT … RETURNING`이 42501로 깨진 것)가 재발할 경로가 구조적으로 사라진다.
--- ⚠ 열람 축 `is_request_party`(0052)와는 **다른 축**이다. 그쪽은 SELECT 정책 3개에 물려 있으므로
---   재사용하지 않는다 — 의미를 바꾸면 열람 범위까지 흔들린다.
--- ⚠ participation_status(0056)로 거르지 않는다. 요청이 accepted면 참여 게이트가 이미 전원 수락을
---   보장했다. 여기서 또 걸면 데이터가 어긋났을 때 '내 기록은 있는데 결과는 못 건드리는' 조용한
---   실패가 된다. 좌석은 좌석만 판정하고 동의는 참여 축이 책임진다.
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

--- 제안 스코어를 '요청자 관점'으로 정규화한다 — 저장 규약이 언제나 요청자 관점이기 때문이다.
---
--- ⚠ 방향이 둘이고 **상대2에서만 합성 순서가 갈린다**.
---     표시(요청자 → 좌석):  swap_partner_perspective(invert_set_scores(x))   ← 0053의 관점 복사
---     제안(좌석 → 요청자):  invert_set_scores(swap_partner_perspective(x))   ← 이 함수
---   둘은 서로의 역함수이고 P·I는 교환법칙이 성립하지 않는다. **차이는 애드 플래그에서만 난다** —
---   스코어(me/opp)는 두 순서가 같아 보이므로 애드를 넣지 않은 검증은 무의미하다.
---   swap_opponent_perspective는 쓰지 않는다: finalize(0057)가 그것을 쓰는 것은 '대표를 opponent
---   슬롯으로 재배치'라는 다른 일이고, 한 파일에서 두 의미가 섞이면 반드시 헷갈린다.
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


-- ════════════════════════════════════════════════════════════════
-- §2 propose_match_result — 좌석 4개 전원 + 관점 4분기 (0040 대체)
-- ════════════════════════════════════════════════════════════════
--- 변경 셋:
---  (a) 자격을 좌석 판정으로.
---  (b) 관점 정규화를 2분기 → normalize_to_requester_perspective. 넓히기만 하고 이걸 안 고치면
---      파트너·상대2의 제안이 **뒤집힌 채 저장된다**.
---  (c) counterpart_deleted를 '상대팀에 활성 회원이 하나라도 있는가'로. 오늘은 대표만 탈퇴해도
---      상대2가 살아 있는데 제안이 막힌다 — 넓히는 김에 같이 고쳐야 앞뒤가 맞는다.
--- result_already_proposed는 그대로 둔다: 제안 **수정**은 제안자 본인만. 팀원에게까지 열면
--- 상대팀이 검토 중인 값이 내 팀원 손에 바뀌는 레이스가 넓어진다. 팀원의 탈출로는 이미 있다
--- (상대팀 이의 → disputed → 4명 누구나 재제안).
create or replace function public.propose_match_result(p_request_id uuid, p_set_scores jsonb)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_req match_requests%rowtype;
  v_neg match_result_negotiations%rowtype;
  v_uid uuid := auth.uid();
  v_seat text;
  v_has_counterpart boolean;
  v_sets jsonb;
begin
  select * into v_req from match_requests where id = p_request_id for update;
  if not found then raise exception 'request_not_found'; end if;
  if v_req.status <> 'accepted' then raise exception 'request_not_accepted'; end if;

  v_seat := public.request_seat_of(p_request_id, v_uid);
  if v_seat is null then raise exception 'not_request_party'; end if;

  select * into v_neg from match_result_negotiations where request_id = p_request_id for update;
  if not found then raise exception 'negotiation_not_found'; end if;
  if v_neg.result_status = 'confirmed' then raise exception 'result_already_confirmed'; end if;
  if v_neg.result_status = 'proposed' and v_neg.proposed_by is distinct from v_uid then
    raise exception 'result_already_proposed';
  end if;

  -- 상대팀에 확인해 줄 활성 회원이 하나라도 있어야 한다(둘 다 탈퇴면 영영 확정되지 않는다)
  if v_seat in ('requester', 'partner') then
    v_has_counterpart := public.is_active_member(v_req.opponent_user_id)
      or exists (select 1 from match_request_participants p
                 where p.request_id = p_request_id and p.role = 'opponent2'
                   and public.is_active_member(p.user_id));
  else
    v_has_counterpart := public.is_active_member(v_req.requester_id)
      or exists (select 1 from match_request_participants p
                 where p.request_id = p_request_id and p.role = 'partner'
                   and public.is_active_member(p.user_id));
  end if;
  if not v_has_counterpart then raise exception 'counterpart_deleted'; end if;

  if not public.validate_set_scores(p_set_scores) then raise exception 'invalid_set_scores'; end if;

  v_sets := public.normalize_set_scores(p_set_scores, v_req.match_type <> 'singles');
  v_sets := public.normalize_to_requester_perspective(v_sets, v_seat);

  update match_result_negotiations
  set result_status = 'proposed',
      proposed_set_scores = v_sets,
      proposed_by = v_uid,
      proposed_at = now(),
      dispute_reason = null
  where request_id = p_request_id;
end;
$$;

revoke all on function public.propose_match_result(uuid, jsonb) from public;
revoke execute on function public.propose_match_result(uuid, jsonb) from anon;
grant execute on function public.propose_match_result(uuid, jsonb) to authenticated;


-- ════════════════════════════════════════════════════════════════
-- §3 confirm_match_result — 좌석 4개 전원 + 팀 담합 가드 (0053 대체)
-- ════════════════════════════════════════════════════════════════
--- **갱신 대상 행 집합은 바뀌지 않는다.** 아래 UPDATE 4벌은 전부 요청 행에서 유도한 user_id로
--- WHERE를 걸고 v_uid는 어디에도 안 들어간다 — 누가 호출하든 같은 4행을 확정한다.
--- 그래서 0053의 행 단언(요청자·대표 = 1, 파트너·상대2 perspective_row_missing)도 그대로 둔다.
---
--- 바뀌는 것은 자격 두 줄뿐이고, 그중 **팀 가드가 이 변경 전체의 안전 조건**이다.
--- proposed_by의 팀을 못 구하면(참가자 user_id가 비는 등) 통과가 아니라 **거부**한다(fail-closed).
create or replace function public.confirm_match_result(p_request_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_req match_requests%rowtype;
  v_neg match_result_negotiations%rowtype;
  v_uid uuid := auth.uid();
  v_my_team text;
  v_proposer_team text;
  v_inverted jsonb;
  v_requester_rows int;
  v_opponent_rows int;
  v_partner_user_id uuid;
  v_opp2_user_id uuid;
  v_partner_rows int;
  v_opp2_rows int;
begin
  select * into v_req from match_requests where id = p_request_id for update;
  if not found then raise exception 'request_not_found'; end if;
  if v_req.status <> 'accepted' then raise exception 'request_not_accepted'; end if;

  v_my_team := public.request_result_team(p_request_id, v_uid);
  if v_my_team is null then raise exception 'not_request_party'; end if;

  select * into v_neg from match_result_negotiations where request_id = p_request_id for update;
  if not found or v_neg.result_status <> 'proposed' then raise exception 'result_not_proposed'; end if;
  if v_neg.proposed_by = v_uid then raise exception 'cannot_confirm_own_proposal'; end if;

  -- 제안자와 같은 팀은 확인할 수 없다 — 없으면 '내가 제안 → 내 파트너가 확인'으로
  -- 상대팀 동의 없이 4명의 기록이 확정된다.
  v_proposer_team := public.request_result_team(p_request_id, v_neg.proposed_by);
  if v_proposer_team is null then raise exception 'not_request_party'; end if;
  if v_my_team = v_proposer_team then raise exception 'cannot_confirm_teammate_proposal'; end if;

  if not public.validate_set_scores(v_neg.proposed_set_scores) then raise exception 'invalid_set_scores'; end if;
  v_inverted := public.invert_set_scores(v_neg.proposed_set_scores);

  update personal_matches
  set set_scores = v_neg.proposed_set_scores
  where source_request_id = p_request_id and user_id = v_req.requester_id;
  get diagnostics v_requester_rows = row_count;

  update personal_matches
  set set_scores = v_inverted
  where source_request_id = p_request_id and user_id = v_req.opponent_user_id;
  get diagnostics v_opponent_rows = row_count;

  if v_requester_rows <> 1 or v_opponent_rows <> 1 then
    raise exception 'personal_matches_missing';
  end if;

  -- 복식이면 파트너·상대2 관점 행도 같은 결과로 확정한다(0053: 방 안팎 공통).
  -- materialize_accepted_request가 행을 만드는 조건과 정확히 같은 술어로 단언한다.
  select user_id into v_partner_user_id from match_request_participants
  where request_id = p_request_id and role = 'partner';
  select user_id into v_opp2_user_id from match_request_participants
  where request_id = p_request_id and role = 'opponent2';

  if v_partner_user_id is not null then
    update personal_matches
    set set_scores = public.swap_partner_perspective(v_neg.proposed_set_scores)
    where source_request_id = p_request_id and user_id = v_partner_user_id;
    get diagnostics v_partner_rows = row_count;
    if public.is_active_member(v_partner_user_id)
       and v_partner_user_id not in (v_req.requester_id, v_req.opponent_user_id)
       and v_partner_rows <> 1 then
      raise exception 'perspective_row_missing';
    end if;
  end if;
  if v_opp2_user_id is not null then
    update personal_matches
    set set_scores = public.swap_partner_perspective(v_inverted)
    where source_request_id = p_request_id and user_id = v_opp2_user_id;
    get diagnostics v_opp2_rows = row_count;
    if public.is_active_member(v_opp2_user_id)
       and v_opp2_user_id not in (v_req.requester_id, v_req.opponent_user_id)
       and v_opp2_rows <> 1 then
      raise exception 'perspective_row_missing';
    end if;
  end if;

  update match_result_negotiations
  set set_scores = proposed_set_scores,
      result_status = 'confirmed',
      dispute_reason = null
  where request_id = p_request_id;
end;
$$;

revoke all on function public.confirm_match_result(uuid) from public;
revoke execute on function public.confirm_match_result(uuid) from anon;
grant execute on function public.confirm_match_result(uuid) to authenticated;


-- ════════════════════════════════════════════════════════════════
-- §4 dispute_match_result — 확인과 대칭 (0040 대체)
-- ════════════════════════════════════════════════════════════════
--- 이의는 확정을 만들지 않아 담합 위험이 없지만, 팀 가드를 같이 거는 이유는 UI와 RPC의 자격이
--- **같은 문장**이어야 앞으로 어긋나지 않기 때문이다(화면도 팀원 제안에는 이의 버튼을 주지 않는다).
create or replace function public.dispute_match_result(p_request_id uuid, p_reason text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_req match_requests%rowtype;
  v_neg match_result_negotiations%rowtype;
  v_uid uuid := auth.uid();
  v_my_team text;
  v_proposer_team text;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  select * into v_req from match_requests where id = p_request_id for update;
  if not found then raise exception 'request_not_found'; end if;
  if v_req.status <> 'accepted' then raise exception 'request_not_accepted'; end if;

  v_my_team := public.request_result_team(p_request_id, v_uid);
  if v_my_team is null then raise exception 'not_request_party'; end if;

  select * into v_neg from match_result_negotiations where request_id = p_request_id for update;
  if not found or v_neg.result_status <> 'proposed' then raise exception 'result_not_proposed'; end if;
  if v_neg.proposed_by = v_uid then raise exception 'cannot_dispute_own_proposal'; end if;

  v_proposer_team := public.request_result_team(p_request_id, v_neg.proposed_by);
  if v_proposer_team is null then raise exception 'not_request_party'; end if;
  if v_my_team = v_proposer_team then raise exception 'cannot_dispute_teammate_proposal'; end if;

  if v_reason is not null and char_length(v_reason) > 200 then raise exception 'dispute_reason_too_long'; end if;

  update match_result_negotiations
  set result_status = 'disputed', dispute_reason = v_reason
  where request_id = p_request_id;
end;
$$;

revoke all on function public.dispute_match_result(uuid, text) from public;
revoke execute on function public.dispute_match_result(uuid, text) from anon;
grant execute on function public.dispute_match_result(uuid, text) to authenticated;


-- ════════════════════════════════════════════════════════════════
-- §5 reopen_match_result — 좌석 4개 전원 (0055 §권한 단락 대체)
-- ════════════════════════════════════════════════════════════════
--- 0055 헤더의 "권한은 요청 당사자 2명(requester/opponent)만"은 이 마이그레이션으로 거짓이 된다.
--- 되돌림은 기록을 만드는 게 아니라 지우는 방향이라 동의 구멍이 아니므로 확인과 같은 축으로 넓힌다.
--- counterpart 판정도 팀 개념으로 바꾼다 — 부수로 오늘의 결함이 고쳐진다(대표만 탈퇴하면
--- 상대2가 재확인할 수 있는데도 정정이 막히던 문제).
create or replace function public.reopen_match_result(p_request_id uuid, p_reason text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_req match_requests%rowtype;
  v_neg match_result_negotiations%rowtype;
  v_uid uuid := auth.uid();
  v_seat text;
  v_has_counterpart boolean;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_rows int;
begin
  select * into v_req from match_requests where id = p_request_id for update;
  if not found then raise exception 'request_not_found'; end if;
  if v_req.status <> 'accepted' then raise exception 'request_not_accepted'; end if;

  v_seat := public.request_seat_of(p_request_id, v_uid);
  if v_seat is null then raise exception 'not_request_party'; end if;

  select * into v_neg from match_result_negotiations where request_id = p_request_id for update;
  if not found or v_neg.result_status <> 'confirmed' then raise exception 'result_not_confirmed'; end if;
  if v_reason is not null and char_length(v_reason) > 200 then raise exception 'dispute_reason_too_long'; end if;

  -- 되돌린 뒤 다시 합의해 줄 사람이 상대팀에 남아 있어야 한다
  if v_seat in ('requester', 'partner') then
    v_has_counterpart := public.is_active_member(v_req.opponent_user_id)
      or exists (select 1 from match_request_participants p
                 where p.request_id = p_request_id and p.role = 'opponent2'
                   and public.is_active_member(p.user_id));
  else
    v_has_counterpart := public.is_active_member(v_req.requester_id)
      or exists (select 1 from match_request_participants p
                 where p.request_id = p_request_id and p.role = 'partner'
                   and public.is_active_member(p.user_id));
  end if;
  if not v_has_counterpart then raise exception 'counterpart_deleted'; end if;

  update personal_matches
  set set_scores = '[]'::jsonb
  where source_request_id = p_request_id;
  get diagnostics v_rows = row_count;
  if v_rows < 2 then raise exception 'personal_matches_missing'; end if;

  update match_result_negotiations
  set result_status = 'disputed',
      set_scores = '[]'::jsonb,
      dispute_reason = coalesce(v_reason, '결과 정정 요청')
  where request_id = p_request_id;
end;
$$;

revoke all on function public.reopen_match_result(uuid, text) from public;
revoke execute on function public.reopen_match_result(uuid, text) from anon;
grant execute on function public.reopen_match_result(uuid, text) to authenticated;


-- ════════════════════════════════════════════════════════════════
-- §6 로테이션 좌석에 'removed' — 제외도 거절처럼 이력을 남긴다
-- ════════════════════════════════════════════════════════════════
alter table public.rotation_session_participants
  drop constraint if exists rotation_session_participants_participation_status_check;
alter table public.rotation_session_participants
  add constraint rotation_session_participants_participation_status_check
  check (participation_status in ('pending', 'accepted', 'rejected', 'removed'));

--- 0057 §4 트리거 대체. 바뀌는 것은 두 절의 상태 목록뿐이다.
---  · 삭제 절: 'rejected'뿐이던 보존 대상에 'removed'를 더한다 — 제외한 사람이 화면에서 완전히
---    사라져 "다시 초대"할 진입점이 없어지던 문제(0058의 잔여 결함)를 없앤다.
---  · on conflict 절: 재초대 시 'rejected'와 'removed' **둘 다** pending으로 되돌린다.
---    이 한 줄이 '거절 → 재초대 → 제외 → 3번째 초대'를 성립시킨다.
create or replace function public.sync_rotation_session_participants()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_ids uuid[];
begin
  select coalesce(array_agg(distinct t.uid), '{}'::uuid[]) into v_ids
  from (select nullif(e->>'userId', '')::uuid as uid
        from jsonb_array_elements(new.players) e) t
  where public.is_active_member(t.uid) and t.uid <> new.user_id;

  -- 풀에서 빠진 사람의 좌석은 지운다(풀이 명부의 권위). 단 거절·제외 이력은 남긴다 —
  -- 지우면 그 사람의 이름조차 알 수 없어져(거절자는 players에도 없다) 재초대 진입점이 사라진다.
  delete from rotation_session_participants
  where session_id = new.id
    and not (user_id = any(v_ids))
    and participation_status not in ('rejected', 'removed');

  -- 방 세션이면 '입장 = 참여 동의'(0048~0049)라 accepted로 시작한다.
  -- 거절했거나 제외됐던 사람을 다시 넣으면 재초대이므로 pending으로 되돌린다.
  insert into rotation_session_participants (session_id, user_id, participation_status, responded_at)
  select new.id, uid,
         case when new.room_id is not null then 'accepted' else 'pending' end,
         case when new.room_id is not null then now() else null end
  from unnest(v_ids) uid
  on conflict (session_id, user_id) do update
    set participation_status = excluded.participation_status,
        responded_at = excluded.responded_at
    where rotation_session_participants.participation_status in ('rejected', 'removed');

  -- 리스트에 노출되는 순간(create_match_room이 room_id를 사후 UPDATE한다) 남은 pending을 승격시킨다.
  if new.room_id is not null and (tg_op = 'INSERT' or old.room_id is null) then
    update rotation_session_participants
    set participation_status = 'accepted', responded_at = now()
    where session_id = new.id and participation_status = 'pending';
  end if;

  return null;
end;
$$;

revoke all on function public.sync_rotation_session_participants() from public, anon, authenticated;

--- 0058 §2 대체. **순서가 규칙이다** — 좌석을 'removed'로 먼저 표시하고 그다음 명부에서 뺀다.
--- 반대로 하면 트리거가 그 좌석을 pending 상태로 보고 지워 버려 이력이 남지 않는다.
--- 거절(본인이 뺀다)과 제외(주최자가 뺀다)는 이제 대칭이다 — 둘 다 좌석을 남기고, 둘 다
--- 다시 초대하면 pending으로 돌아온다.
create or replace function public.remove_rotation_session_player(p_session_id uuid, p_user_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_s rotation_sessions%rowtype;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select * into v_s from rotation_sessions where id = p_session_id for update;
  if not found then raise exception 'session_not_found'; end if;

  if v_s.room_id is not null then raise exception 'room_session_invite_unsupported'; end if;
  if v_s.user_id <> v_uid then raise exception 'not_session_owner'; end if;

  if not exists (
    select 1 from jsonb_array_elements(v_s.players) e
    where nullif(e->>'userId', '')::uuid = p_user_id
  ) then raise exception 'not_in_pool'; end if;

  update rotation_session_participants
  set participation_status = 'removed', responded_at = now()
  where session_id = p_session_id and user_id = p_user_id;

  update rotation_sessions
  set players = coalesce((
    select jsonb_agg(e) from jsonb_array_elements(players) e
    where nullif(e->>'userId', '')::uuid is distinct from p_user_id
  ), '[]'::jsonb)
  where id = p_session_id;
end;
$$;

revoke all on function public.remove_rotation_session_player(uuid, uuid) from public;
revoke execute on function public.remove_rotation_session_player(uuid, uuid) from anon;
grant execute on function public.remove_rotation_session_player(uuid, uuid) to authenticated;

--- finalize_rotation_session의 위조 방어 allowlist는 **손대지 않는다.** 'removed' 좌석은
--- remove_rotation_session_player로만 생기고 그 함수는 방 세션을 거부하므로, allowlist의 다른
--- 합집합(방 참가자)에 그 사람이 들어올 길이 없다. 명부에서도 빠져 있으니 이미 제외돼 있다.
