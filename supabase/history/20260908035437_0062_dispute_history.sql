-- 20260908035437 0062_dispute_history
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
-- 0062 — 협상 이력 보존: 이의를 거친 결과는 확정될 때까지 「이의 처리」 탭에 머문다

alter table public.match_result_negotiations
  add column if not exists dispute_count int not null default 0;

comment on column public.match_result_negotiations.dispute_count is
  'dispute/reopen 누적 횟수 (0062). >0 이면 이 협상은 이의를 거쳤다 — 재제안으로 proposed로 돌아가도, 이의자가 탈퇴해 disputed_by가 null이 되어도 그 사실이 남는다. 앱의 hasDisputeHistory가 이 값으로 「이의 처리」 탭 라우팅을 판정한다.';

comment on column public.match_result_negotiations.disputed_by is
  '가장 최근 이의(dispute_match_result) 또는 정정(reopen_match_result)을 낸 좌석의 user_id (0061, 0062에서 의미 확장). 이의가 열려 있는지는 result_status가 말한다 — 재제안으로 proposed가 되어도 이 값은 남아 "누구의 이의에 대한 재입력인가"를 화면이 말할 수 있게 한다. result_status=''none''에서만 초기화된다. 0061 이전의 disputed 행은 null(이의자 미상).';

comment on column public.match_result_negotiations.dispute_reason is
  '가장 최근 이의·정정의 사유 (≤200자, 0062에서 보존으로 전환). 재제안·확정 시에도 지우지 않는다 — 재입력된 결과를 확인하는 사람이 무엇에 대한 답인지 알아야 승인을 판단할 수 있다.';

update public.match_result_negotiations
set dispute_count = 1
where result_status = 'disputed' and dispute_count = 0;


create or replace function public.normalize_result_confirmations()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.result_status = 'proposed'
     and (tg_op = 'INSERT'
          or old.result_status <> 'proposed'
          or new.proposed_at is distinct from old.proposed_at
          or new.proposed_by is distinct from old.proposed_by
          or new.proposed_set_scores is distinct from old.proposed_set_scores) then
    new.confirmed_by := case
      when new.proposed_by is null then '{}'::uuid[]
      else array[new.proposed_by]
    end;
  elsif new.result_status in ('none', 'disputed') then
    new.confirmed_by := '{}'::uuid[];
  end if;

  -- 0062: 이의 이력은 협상이 시작 전으로 되돌아갈 때만 지운다
  if new.result_status = 'none' then
    new.disputed_by := null;
    new.dispute_count := 0;
  end if;
  return new;
end;
$$;

revoke all on function public.normalize_result_confirmations() from public, anon, authenticated;

comment on function public.normalize_result_confirmations() is
  '협상 파생 컬럼 초기화의 단일 지점 (0060, 0062). confirmed_by는 제안 진입·재제안에서 [제안자]로, none/disputed에서 비운다. 이의 이력(disputed_by·dispute_count)은 none에서만 초기화한다.';


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

  -- 0062: dispute_reason을 지우지 않는다. 재입력된 결과를 확인하는 사람이 직전 이의 사유를 봐야 한다.
  update match_result_negotiations
  set result_status = 'proposed',
      proposed_set_scores = v_sets,
      proposed_by = v_uid,
      proposed_at = now()
  where request_id = p_request_id;
end;
$$;

revoke all on function public.propose_match_result(uuid, jsonb) from public;
revoke execute on function public.propose_match_result(uuid, jsonb) from anon;
grant execute on function public.propose_match_result(uuid, jsonb) to authenticated;


create or replace function public.dispute_match_result(p_request_id uuid, p_reason text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_req match_requests%rowtype;
  v_neg match_result_negotiations%rowtype;
  v_uid uuid := auth.uid();
  v_seat text;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  select * into v_req from match_requests where id = p_request_id for update;
  if not found then raise exception 'request_not_found'; end if;
  if v_req.status <> 'accepted' then raise exception 'request_not_accepted'; end if;

  v_seat := public.request_seat_of(p_request_id, v_uid);
  if v_seat is null then raise exception 'not_request_party'; end if;

  select * into v_neg from match_result_negotiations where request_id = p_request_id for update;
  if not found or v_neg.result_status <> 'proposed' then raise exception 'result_not_proposed'; end if;
  if v_neg.proposed_by = v_uid then raise exception 'cannot_dispute_own_proposal'; end if;

  if v_reason is not null and char_length(v_reason) > 200 then raise exception 'dispute_reason_too_long'; end if;

  update match_result_negotiations
  set result_status = 'disputed',
      dispute_reason = v_reason,
      disputed_by = v_uid,
      dispute_count = dispute_count + 1
  where request_id = p_request_id;
end;
$$;

revoke all on function public.dispute_match_result(uuid, text) from public;
revoke execute on function public.dispute_match_result(uuid, text) from anon;
grant execute on function public.dispute_match_result(uuid, text) to authenticated;


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
      dispute_reason = coalesce(v_reason, '결과 정정 요청'),
      disputed_by = v_uid,
      dispute_count = dispute_count + 1
  where request_id = p_request_id;
end;
$$;

revoke all on function public.reopen_match_result(uuid, text) from public;
revoke execute on function public.reopen_match_result(uuid, text) from anon;
grant execute on function public.reopen_match_result(uuid, text) to authenticated;


create or replace function public.settle_match_result(p_request_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_req match_requests%rowtype;
  v_neg match_result_negotiations%rowtype;
  v_inverted jsonb;
  v_requester_rows int;
  v_opponent_rows int;
  v_partner_user_id uuid;
  v_opp2_user_id uuid;
  v_partner_rows int;
  v_opp2_rows int;
begin
  select * into v_req from match_requests where id = p_request_id;
  if not found then raise exception 'request_not_found'; end if;
  select * into v_neg from match_result_negotiations where request_id = p_request_id;
  if not found or v_neg.result_status <> 'proposed' then raise exception 'result_not_proposed'; end if;

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

  -- 0062: dispute_reason을 지우지 않는다(협상 이력 컬럼은 상태 전이로 소실되지 않는다)
  update match_result_negotiations
  set set_scores = proposed_set_scores,
      result_status = 'confirmed'
  where request_id = p_request_id;
end;
$$;

revoke all on function public.settle_match_result(uuid) from public, anon, authenticated;

comment on function public.settle_match_result(uuid) is
  '제안된 결과를 관점 행 전부에 확정 (0060, 0062). 요청자=원본 / 대표=invert / 파트너=swap / 상대2=swap∘invert. 갱신 대상은 요청 행에서 유도되므로 마지막 확인자가 누구든 같은 행들을 확정한다. 내부 전용.';
