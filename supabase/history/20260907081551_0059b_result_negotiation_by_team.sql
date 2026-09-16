-- 20260907081551 0059b_result_negotiation_by_team
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
-- 0059 §2~§6. 정본은 supabase/migrations/0059_result_negotiation_by_team.sql

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
      dispute_reason = coalesce(v_reason, '결과 정정 요청')
  where request_id = p_request_id;
end;
$$;

revoke all on function public.reopen_match_result(uuid, text) from public;
revoke execute on function public.reopen_match_result(uuid, text) from anon;
grant execute on function public.reopen_match_result(uuid, text) to authenticated;

alter table public.rotation_session_participants
  drop constraint if exists rotation_session_participants_participation_status_check;
alter table public.rotation_session_participants
  add constraint rotation_session_participants_participation_status_check
  check (participation_status in ('pending', 'accepted', 'rejected', 'removed'));

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

  delete from rotation_session_participants
  where session_id = new.id
    and not (user_id = any(v_ids))
    and participation_status not in ('rejected', 'removed');

  insert into rotation_session_participants (session_id, user_id, participation_status, responded_at)
  select new.id, uid,
         case when new.room_id is not null then 'accepted' else 'pending' end,
         case when new.room_id is not null then now() else null end
  from unnest(v_ids) uid
  on conflict (session_id, user_id) do update
    set participation_status = excluded.participation_status,
        responded_at = excluded.responded_at
    where rotation_session_participants.participation_status in ('rejected', 'removed');

  if new.room_id is not null and (tg_op = 'INSERT' or old.room_id is null) then
    update rotation_session_participants
    set participation_status = 'accepted', responded_at = now()
    where session_id = new.id and participation_status = 'pending';
  end if;

  return null;
end;
$$;

revoke all on function public.sync_rotation_session_participants() from public, anon, authenticated;

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
