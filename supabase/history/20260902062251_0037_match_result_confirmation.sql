-- 20260902062251 0037_match_result_confirmation
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
-- 0037_match_result_confirmation.sql
--- 상호 확인 경기의 사후 결과(세트) 등록 + 상대 확인 플로우 (리포 supabase/migrations/0037 과 동일)

alter table public.match_requests
  add column result_status text not null default 'none'
    check (result_status in ('none', 'proposed', 'confirmed', 'disputed')),
  add column proposed_set_scores jsonb not null default '[]'::jsonb
    check (jsonb_typeof(proposed_set_scores) = 'array'),
  add column proposed_by uuid references public.users(id) on delete set null,
  add column proposed_at timestamptz,
  add column dispute_reason text check (char_length(dispute_reason) <= 200);

update public.match_requests
set result_status = case when jsonb_array_length(set_scores) > 0 then 'confirmed' else 'none' end
where status = 'accepted';

create index match_requests_result_proposed_opp_idx
  on public.match_requests(opponent_user_id) where result_status = 'proposed';
create index match_requests_result_proposed_req_idx
  on public.match_requests(requester_id) where result_status = 'proposed';

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

  v_counterpart_id := case when v_req.requester_id = v_uid then v_req.opponent_user_id else v_req.requester_id end;
  select deleted_at into v_counterpart_deleted from public.users where id = v_counterpart_id;
  if v_counterpart_deleted is not null then
    raise exception 'counterpart_deleted';
  end if;

  if not public.validate_set_scores(p_set_scores) then
    raise exception 'invalid_set_scores';
  end if;

  select jsonb_agg(jsonb_build_object('me', (e->>'me')::int, 'opp', (e->>'opp')::int) order by ord)
  into v_sets
  from jsonb_array_elements(p_set_scores) with ordinality t(e, ord);

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

  if not public.validate_set_scores(v_req.proposed_set_scores) then
    raise exception 'invalid_set_scores';
  end if;
  v_winner := public.personal_match_winner(v_req.proposed_set_scores);
  v_inverted := public.invert_set_scores(v_req.proposed_set_scores);

  update public.personal_matches
  set set_scores = v_req.proposed_set_scores, winner = v_winner
  where source_request_id = p_request_id and user_id = v_req.requester_id;
  get diagnostics v_requester_rows = row_count;

  update public.personal_matches
  set set_scores = v_inverted,
      winner = case v_winner when 'me' then 'opponent' when 'opponent' then 'me' else 'draw' end
  where source_request_id = p_request_id and user_id = v_req.opponent_user_id;
  get diagnostics v_opponent_rows = row_count;

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
