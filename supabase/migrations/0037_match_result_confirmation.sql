-- 0037_match_result_confirmation.sql
--- 상호 확인 경기의 사후 결과(세트) 등록 + 상대 확인 플로우.
--- 0034에서 확인 요청은 세트 없이 수락되어 양측 personal_matches가 winner NULL(미확정)로 생성되지만,
--- 그 행은 RESTRICTIVE 정책(0033)으로 양측 모두 UPDATE가 막혀 결과를 입력할 경로가 없었다.
---
--- 설계:
---   - 제안/확인 상태는 match_requests에 둔다 (result_status: none → proposed → confirmed | disputed → 재제안).
---     personal_matches는 confirm 시점에만 RPC가 양측 2행의 set_scores/winner를 채운다
---     → "winner NULL = 미확정" 불변식과 통계·레이팅 제외 로직은 그대로 유지된다.
---   - proposed_set_scores는 set_scores와 같은 요청자(requester) 관점으로 정규화 저장한다.
---     제안자가 상대(opponent)면 RPC가 반전해 저장하고, 표시는 클라이언트가 viewer 관점으로 반전한다.
---   - 세 RPC 모두 SECURITY DEFINER + auth.uid() 당사자 검사 + for update 잠금(동시 제안/확인 경합 방지).
---   - accept_match_request의 winner 계산·반전 SQL은 helper 함수로 추출하되 accept 본문은 손대지 않는다.

-- ── 1) match_requests: 결과 제안/확인 컬럼 ──
alter table public.match_requests
  add column result_status text not null default 'none'
    check (result_status in ('none', 'proposed', 'confirmed', 'disputed')),
  add column proposed_set_scores jsonb not null default '[]'::jsonb
    check (jsonb_typeof(proposed_set_scores) = 'array'),  -- 요청자 관점
  add column proposed_by uuid references public.users(id) on delete set null,
  add column proposed_at timestamptz,
  add column dispute_reason text check (char_length(dispute_reason) <= 200);

-- 기존 수락 건 백필: 세트가 있으면 이미 확정, 없으면 결과 없음
update public.match_requests
set result_status = case when jsonb_array_length(set_scores) > 0 then 'confirmed' else 'none' end
where status = 'accepted';

-- 결과 확인 대기 배지 카운트용 부분 인덱스 (양쪽 당사자 모두 확인자가 될 수 있다)
create index match_requests_result_proposed_opp_idx
  on public.match_requests(opponent_user_id) where result_status = 'proposed';
create index match_requests_result_proposed_req_idx
  on public.match_requests(requester_id) where result_status = 'proposed';

-- ── 2) 순수 helper (accept_match_request의 SQL 블록 추출) ──

-- 세트 승수 비교로 승자 판정. 빈 배열/NULL → NULL(미확정).
create or replace function public.personal_match_winner(p_sets jsonb)
returns text
language sql immutable
as $$
  select case
    when p_sets is null or jsonb_typeof(p_sets) <> 'array' or jsonb_array_length(p_sets) = 0 then null
    when t.me_sets > t.opp_sets then 'me'
    when t.opp_sets > t.me_sets then 'opponent'
    else 'draw'
  end
  from (
    select
      count(*) filter (where (e->>'me')::int > (e->>'opp')::int) as me_sets,
      count(*) filter (where (e->>'opp')::int > (e->>'me')::int) as opp_sets
    from jsonb_array_elements(coalesce(p_sets, '[]'::jsonb)) e
  ) t;
$$;

-- me ↔ opp 반전 (세트 순서 보존). 빈 배열 → 빈 배열.
create or replace function public.invert_set_scores(p_sets jsonb)
returns jsonb
language sql immutable
as $$
  select coalesce(
    jsonb_agg(jsonb_build_object('me', e->'opp', 'opp', e->'me') order by ord),
    '[]'::jsonb
  )
  from jsonb_array_elements(coalesce(p_sets, '[]'::jsonb)) with ordinality t(e, ord);
$$;

-- 제안 세트 검증: 배열 1~5개, 각 me/opp가 0~99 정수, 0-0 세트 금지.
-- (클라이언트 validateSetScores와 동일 규칙 — 저장값을 신뢰하지 않는다)
create or replace function public.validate_set_scores(p_sets jsonb)
returns boolean
language plpgsql immutable
as $$
declare
  e jsonb;
  v_me numeric;
  v_opp numeric;
begin
  if p_sets is null or jsonb_typeof(p_sets) <> 'array' then
    return false;
  end if;
  if jsonb_array_length(p_sets) < 1 or jsonb_array_length(p_sets) > 5 then
    return false;
  end if;
  for e in select value from jsonb_array_elements(p_sets) loop
    if coalesce(jsonb_typeof(e->'me'), '') <> 'number'
       or coalesce(jsonb_typeof(e->'opp'), '') <> 'number' then
      return false;
    end if;
    v_me := (e->>'me')::numeric;
    v_opp := (e->>'opp')::numeric;
    if v_me <> floor(v_me) or v_opp <> floor(v_opp) then
      return false;
    end if;
    if v_me < 0 or v_me > 99 or v_opp < 0 or v_opp > 99 then
      return false;
    end if;
    if v_me = 0 and v_opp = 0 then
      return false;
    end if;
  end loop;
  return true;
end;
$$;

-- ── 3) 결과 제안 RPC ──
--- 당사자 누구든 호출 가능. none/disputed에서 새 제안, proposed는 제안자 본인만 수정(덮어쓰기).
--- p_set_scores는 호출자 관점 → 요청자 관점으로 정규화 저장.
create or replace function public.propose_match_result(p_request_id uuid, p_set_scores jsonb)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_req public.match_requests%rowtype;
  v_uid uuid := auth.uid();
  v_counterpart_id uuid;
  v_counterpart_deleted timestamptz;
  v_sets jsonb;
begin
  select * into v_req from public.match_requests where id = p_request_id for update;
  if not found then
    raise exception 'request_not_found';
  end if;
  if v_req.status <> 'accepted' then
    raise exception 'request_not_accepted';
  end if;
  if v_uid is null or (v_req.requester_id <> v_uid and v_req.opponent_user_id <> v_uid) then
    raise exception 'not_request_party';
  end if;
  if v_req.result_status = 'confirmed' then
    raise exception 'result_already_confirmed';
  end if;
  if v_req.result_status = 'proposed' and v_req.proposed_by is distinct from v_uid then
    raise exception 'result_already_proposed';
  end if;

  -- 상대가 탈퇴했으면 확인이 영원히 불가 → 제안 자체를 막는다
  v_counterpart_id := case when v_req.requester_id = v_uid then v_req.opponent_user_id else v_req.requester_id end;
  select deleted_at into v_counterpart_deleted from public.users where id = v_counterpart_id;
  if v_counterpart_deleted is not null then
    raise exception 'counterpart_deleted';
  end if;

  if not public.validate_set_scores(p_set_scores) then
    raise exception 'invalid_set_scores';
  end if;

  -- me/opp 정수만 남기고 정규화 (복식 애드 정보 등 여분 키 제거 — v1은 단식 전용)
  select jsonb_agg(jsonb_build_object('me', (e->>'me')::int, 'opp', (e->>'opp')::int) order by ord)
  into v_sets
  from jsonb_array_elements(p_set_scores) with ordinality t(e, ord);

  -- 요청자 관점으로 저장: 호출자가 상대(opponent)면 반전
  if v_req.opponent_user_id = v_uid then
    v_sets := public.invert_set_scores(v_sets);
  end if;

  update public.match_requests
  set result_status = 'proposed',
      proposed_set_scores = v_sets,
      proposed_by = v_uid,
      proposed_at = now(),
      dispute_reason = null
  where id = p_request_id;
end;
$$;

-- ── 4) 결과 확인(승인) RPC ──
--- 제안자가 아닌 당사자만. 양측 personal_matches 2행에 세트/승자를 기록하고 confirmed로 전이.
create or replace function public.confirm_match_result(p_request_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_req public.match_requests%rowtype;
  v_uid uuid := auth.uid();
  v_winner text;
  v_inverted jsonb;
  v_requester_rows int;
  v_opponent_rows int;
begin
  select * into v_req from public.match_requests where id = p_request_id for update;
  if not found then
    raise exception 'request_not_found';
  end if;
  if v_req.status <> 'accepted' then
    raise exception 'request_not_accepted';
  end if;
  if v_uid is null or (v_req.requester_id <> v_uid and v_req.opponent_user_id <> v_uid) then
    raise exception 'not_request_party';
  end if;
  if v_req.result_status <> 'proposed' then
    raise exception 'result_not_proposed';
  end if;
  if v_req.proposed_by = v_uid then
    raise exception 'cannot_confirm_own_proposal';
  end if;

  -- 저장된 제안값도 재검증 (저장값을 신뢰하지 않음)
  if not public.validate_set_scores(v_req.proposed_set_scores) then
    raise exception 'invalid_set_scores';
  end if;
  v_winner := public.personal_match_winner(v_req.proposed_set_scores);
  v_inverted := public.invert_set_scores(v_req.proposed_set_scores);

  -- 요청자 행 (원본 관점)
  update public.personal_matches
  set set_scores = v_req.proposed_set_scores, winner = v_winner
  where source_request_id = p_request_id and user_id = v_req.requester_id;
  get diagnostics v_requester_rows = row_count;

  -- 상대 행 (반전 관점)
  update public.personal_matches
  set set_scores = v_inverted,
      winner = case v_winner when 'me' then 'opponent' when 'opponent' then 'me' else 'draw' end
  where source_request_id = p_request_id and user_id = v_req.opponent_user_id;
  get diagnostics v_opponent_rows = row_count;

  -- 양측 행이 정확히 1개씩 갱신되지 않으면 트랜잭션 전체 롤백
  if v_requester_rows <> 1 or v_opponent_rows <> 1 then
    raise exception 'personal_matches_missing';
  end if;

  update public.match_requests
  set set_scores = proposed_set_scores,
      result_status = 'confirmed',
      dispute_reason = null
  where id = p_request_id;
end;
$$;

-- ── 5) 이의 제기 RPC ──
--- 제안자가 아닌 당사자만. disputed로 전이하며 사유(선택, ≤200자)를 남긴다.
--- 제안값(proposed_set_scores/proposed_by)은 보존해 재제안 시 초기값과 이력으로 쓴다.
create or replace function public.dispute_match_result(p_request_id uuid, p_reason text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_req public.match_requests%rowtype;
  v_uid uuid := auth.uid();
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  select * into v_req from public.match_requests where id = p_request_id for update;
  if not found then
    raise exception 'request_not_found';
  end if;
  if v_req.status <> 'accepted' then
    raise exception 'request_not_accepted';
  end if;
  if v_uid is null or (v_req.requester_id <> v_uid and v_req.opponent_user_id <> v_uid) then
    raise exception 'not_request_party';
  end if;
  if v_req.result_status <> 'proposed' then
    raise exception 'result_not_proposed';
  end if;
  if v_req.proposed_by = v_uid then
    raise exception 'cannot_dispute_own_proposal';
  end if;
  if v_reason is not null and char_length(v_reason) > 200 then
    raise exception 'dispute_reason_too_long';
  end if;

  update public.match_requests
  set result_status = 'disputed', dispute_reason = v_reason
  where id = p_request_id;
end;
$$;

revoke all on function public.propose_match_result(uuid, jsonb) from public;
grant execute on function public.propose_match_result(uuid, jsonb) to authenticated;
revoke all on function public.confirm_match_result(uuid) from public;
grant execute on function public.confirm_match_result(uuid) to authenticated;
revoke all on function public.dispute_match_result(uuid, text) from public;
grant execute on function public.dispute_match_result(uuid, text) to authenticated;
