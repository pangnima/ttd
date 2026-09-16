-- 20260904070649 0049_room_games_mutual
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
-- 0049_room_games_mutual.sql
--- 경기 방의 '게임'을 방장 단독 자유 기록에서 "방 참가자 누구나 만드는 상호 확인 경기"로 승격한다.

-- ── 1) 헬퍼 ──

create or replace function public.is_room_participant(p_room_id uuid)
returns boolean
language sql security definer stable set search_path = public
as $$
  select exists (
    select 1 from match_room_members m
    where m.room_id = p_room_id and m.user_id = auth.uid() and m.status = 'joined'
  );
$$;

revoke all on function public.is_room_participant(uuid) from public, anon;
grant execute on function public.is_room_participant(uuid) to authenticated;

create or replace function public.swap_partner_perspective(p_sets jsonb)
returns jsonb
language sql immutable
as $$
  select coalesce(
    jsonb_agg(
      jsonb_strip_nulls(jsonb_build_object(
        'me', e->'me',
        'opp', e->'opp',
        'myAd', case e->>'myAd'
                  when 'me' then to_jsonb('partner'::text)
                  when 'partner' then to_jsonb('me'::text)
                  else null end,
        'oppAd', e->'oppAd'
      ))
      order by ord
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(coalesce(p_sets, '[]'::jsonb)) with ordinality t(e, ord);
$$;

create or replace function public.copy_personal_match_perspective(
  p_source_match_id uuid,
  p_user_id uuid,
  p_sets jsonb,
  p_opponent jsonb,
  p_partner jsonb,
  p_opponent2 jsonb
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_src personal_matches%rowtype;
  v_id uuid := gen_random_uuid();
begin
  select * into v_src from personal_matches where id = p_source_match_id;
  if not found then raise exception 'source_not_found'; end if;

  insert into personal_matches
    (id, user_id, source_type, source_request_id, played_at, played_time, match_type, surface,
     set_scores, notes, court_name, rotation_session_id, group_seq, room_id)
  values
    (v_id, p_user_id, v_src.source_type, v_src.source_request_id, v_src.played_at, v_src.played_time,
     v_src.match_type, v_src.surface, p_sets, null, v_src.court_name,
     v_src.rotation_session_id, v_src.group_seq, v_src.room_id);

  insert into personal_match_participants (match_id, role, user_id, name, dominant_hand, ntrp_snapshot)
  select v_id, r.role, nullif(r.p->>'userId', '')::uuid, r.p->>'name',
         nullif(r.p->>'hand', ''), nullif(r.p->>'ntrp', '')::numeric
  from (values ('opponent', p_opponent), ('partner', p_partner), ('opponent2', p_opponent2)) as r(role, p)
  where coalesce(r.p->>'name', '') <> '';

  return v_id;
end;
$$;

revoke all on function public.copy_personal_match_perspective(uuid, uuid, jsonb, jsonb, jsonb, jsonb)
  from public, anon, authenticated;

create or replace function public.is_active_member(p_user_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select p_user_id is not null and exists (
    select 1 from users u where u.id = p_user_id and u.is_guest = false and u.deleted_at is null
  );
$$;

revoke all on function public.is_active_member(uuid) from public, anon, authenticated;

-- ── 2) RLS — UPDATE만 참가자로 완화 (INSERT는 방장 유지) ──
drop policy personal_matches_update on public.personal_matches;
create policy personal_matches_update on public.personal_matches
  for update using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (room_id is null or public.is_room_participant(room_id))
  );

-- ── 3) materialize_accepted_request ──
create or replace function public.materialize_accepted_request(p_request_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_req match_requests%rowtype;
  v_requester users%rowtype;
  v_acceptor users%rowtype;
  v_member users%rowtype;
  v_is_doubles boolean;
  v_inverted_scores jsonb;
  v_requester_ntrp numeric;
  v_acceptor_ntrp numeric;
  v_partner_user_id uuid; v_partner_name text; v_partner_hand text; v_partner_ntrp numeric;
  v_opp2_user_id uuid; v_opp2_name text; v_opp2_hand text; v_opp2_ntrp numeric;
  v_pm_requester uuid := gen_random_uuid();
  v_pm_acceptor uuid := gen_random_uuid();
  v_result_status text;
  v_requester_json jsonb; v_acceptor_json jsonb; v_partner_json jsonb; v_opp2_json jsonb;
begin
  select * into v_req from match_requests where id = p_request_id;
  if not found then raise exception 'request_not_found'; end if;

  select * into v_requester from users where id = v_req.requester_id;
  select * into v_acceptor from users where id = v_req.opponent_user_id;
  v_is_doubles := v_req.match_type <> 'singles';

  if jsonb_array_length(v_req.set_scores) = 0 then
    v_inverted_scores := '[]'::jsonb;
  else
    v_inverted_scores := public.invert_set_scores(v_req.set_scores);
  end if;

  v_requester_ntrp := public.derive_public_ntrp(v_requester);
  v_acceptor_ntrp := public.derive_public_ntrp(v_acceptor);

  if v_is_doubles then
    select user_id, name, dominant_hand, ntrp_snapshot into v_partner_user_id, v_partner_name, v_partner_hand, v_partner_ntrp
    from match_request_participants where request_id = p_request_id and role = 'partner';
    if v_partner_user_id is not null then
      select * into v_member from users where id = v_partner_user_id;
      if found then
        v_partner_name := v_member.name;
        v_partner_ntrp := coalesce(public.derive_public_ntrp(v_member), v_partner_ntrp);
        v_partner_hand := v_member.dominant_hand;
      end if;
    end if;

    select user_id, name, dominant_hand, ntrp_snapshot into v_opp2_user_id, v_opp2_name, v_opp2_hand, v_opp2_ntrp
    from match_request_participants where request_id = p_request_id and role = 'opponent2';
    if v_opp2_user_id is not null then
      select * into v_member from users where id = v_opp2_user_id;
      if found then
        v_opp2_name := v_member.name;
        v_opp2_ntrp := coalesce(public.derive_public_ntrp(v_member), v_opp2_ntrp);
        v_opp2_hand := v_member.dominant_hand;
      end if;
    end if;
  end if;

  insert into personal_matches
    (id, user_id, source_type, source_request_id, played_at, played_time, match_type, surface, set_scores, notes, court_name, room_id)
  values
    (v_pm_requester, v_req.requester_id, 'confirmation', v_req.id, v_req.played_at, v_req.played_time,
     v_req.match_type, v_req.surface, v_req.set_scores, v_req.notes, v_req.court_name, v_req.room_id);

  insert into personal_match_participants (match_id, role, user_id, name, dominant_hand, ntrp_snapshot)
  values (v_pm_requester, 'opponent', v_acceptor.id, v_acceptor.name, v_acceptor.dominant_hand, v_acceptor_ntrp);
  if v_is_doubles then
    insert into personal_match_participants (match_id, role, user_id, name, dominant_hand, ntrp_snapshot)
    values (v_pm_requester, 'partner', v_partner_user_id, v_partner_name, v_partner_hand, v_partner_ntrp);
    insert into personal_match_participants (match_id, role, user_id, name, dominant_hand, ntrp_snapshot)
    values (v_pm_requester, 'opponent2', v_opp2_user_id, v_opp2_name, v_opp2_hand, v_opp2_ntrp);
  end if;

  insert into personal_matches
    (id, user_id, source_type, source_request_id, played_at, played_time, match_type, surface, set_scores, notes, court_name, room_id)
  values
    (v_pm_acceptor, v_acceptor.id, 'confirmation', v_req.id, v_req.played_at, v_req.played_time,
     v_req.match_type, v_req.surface, v_inverted_scores, null, v_req.court_name, v_req.room_id);

  insert into personal_match_participants (match_id, role, user_id, name, dominant_hand, ntrp_snapshot)
  values (v_pm_acceptor, 'opponent', v_requester.id, v_requester.name, v_requester.dominant_hand, v_requester_ntrp);
  if v_is_doubles then
    insert into personal_match_participants (match_id, role, user_id, name, dominant_hand, ntrp_snapshot)
    values (v_pm_acceptor, 'partner', v_opp2_user_id, v_opp2_name, v_opp2_hand, v_opp2_ntrp);
    insert into personal_match_participants (match_id, role, user_id, name, dominant_hand, ntrp_snapshot)
    values (v_pm_acceptor, 'opponent2', v_partner_user_id, v_partner_name, v_partner_hand, v_partner_ntrp);
  end if;

  if v_req.room_id is not null and v_is_doubles then
    v_requester_json := jsonb_strip_nulls(jsonb_build_object(
      'userId', v_requester.id, 'name', v_requester.name, 'hand', v_requester.dominant_hand, 'ntrp', v_requester_ntrp));
    v_acceptor_json := jsonb_strip_nulls(jsonb_build_object(
      'userId', v_acceptor.id, 'name', v_acceptor.name, 'hand', v_acceptor.dominant_hand, 'ntrp', v_acceptor_ntrp));
    v_partner_json := jsonb_strip_nulls(jsonb_build_object(
      'userId', v_partner_user_id, 'name', v_partner_name, 'hand', v_partner_hand, 'ntrp', v_partner_ntrp));
    v_opp2_json := jsonb_strip_nulls(jsonb_build_object(
      'userId', v_opp2_user_id, 'name', v_opp2_name, 'hand', v_opp2_hand, 'ntrp', v_opp2_ntrp));

    if public.is_active_member(v_partner_user_id) and v_partner_user_id not in (v_requester.id, v_acceptor.id) then
      perform public.copy_personal_match_perspective(
        v_pm_requester, v_partner_user_id,
        public.swap_partner_perspective(v_req.set_scores),
        v_acceptor_json, v_requester_json, v_opp2_json);
    end if;
    if public.is_active_member(v_opp2_user_id) and v_opp2_user_id not in (v_requester.id, v_acceptor.id) then
      perform public.copy_personal_match_perspective(
        v_pm_requester, v_opp2_user_id,
        public.swap_partner_perspective(v_inverted_scores),
        v_requester_json, v_acceptor_json, v_partner_json);
    end if;
  end if;

  v_result_status := case when jsonb_array_length(v_req.set_scores) = 0 then 'none' else 'confirmed' end;
  insert into match_result_negotiations (request_id, set_scores, result_status)
  values (p_request_id, v_req.set_scores, v_result_status);

  if v_req.room_id is not null then
    insert into match_room_members (room_id, user_id, role, status, source_role, responded_at)
    values (v_req.room_id, v_acceptor.id, 'player', 'joined', 'opponent', now())
    on conflict (room_id, user_id) do update
      set role = case when match_room_members.role = 'host' then 'host' else 'player' end,
          status = 'joined',
          source_role = 'opponent',
          responded_at = now();
  end if;
end;
$$;

revoke all on function public.materialize_accepted_request(uuid) from public, anon, authenticated;

create or replace function public.accept_match_request(p_request_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_req match_requests%rowtype;
  v_requester users%rowtype;
begin
  select * into v_req from match_requests where id = p_request_id for update;
  if not found then raise exception 'request_not_found'; end if;
  if v_req.status <> 'pending' then raise exception 'request_not_pending'; end if;
  if v_req.opponent_user_id <> auth.uid() then raise exception 'not_request_opponent'; end if;

  select * into v_requester from users where id = v_req.requester_id;
  if not found or v_requester.deleted_at is not null then raise exception 'requester_deleted'; end if;

  perform public.materialize_accepted_request(p_request_id);

  update match_requests set status = 'accepted', responded_at = now() where id = p_request_id;
end;
$$;

revoke all on function public.accept_match_request(uuid) from public;
revoke execute on function public.accept_match_request(uuid) from anon;
grant execute on function public.accept_match_request(uuid) to authenticated;

-- ── 4) create_room_game ──
create or replace function public.create_room_game(
  p_room_id uuid,
  p_opponent_user_id uuid,
  p_partner jsonb default null,
  p_opponent2 jsonb default null,
  p_replace_match_id uuid default null
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room match_rooms%rowtype;
  v_src match_requests%rowtype;
  v_id uuid := gen_random_uuid();
  v_is_doubles boolean;
  v_partner_user_id uuid;
  v_opp2_user_id uuid;
  v_seed personal_matches%rowtype;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select * into v_room from match_rooms where id = p_room_id;
  if not found then raise exception 'room_not_found'; end if;
  if not public.is_room_participant(p_room_id) then raise exception 'not_room_member'; end if;

  if exists (select 1 from rotation_sessions where room_id = p_room_id) then raise exception 'room_not_ready'; end if;
  if v_room.source_kind = 'confirmation' then
    select * into v_src from match_requests where room_id = p_room_id order by created_at limit 1;
    if not found or v_src.status <> 'accepted' then raise exception 'room_not_ready'; end if;
  end if;

  if v_uid = p_opponent_user_id then raise exception 'cannot_request_self'; end if;
  if not public.is_active_member(p_opponent_user_id) then raise exception 'invalid_opponent'; end if;
  if not exists (
    select 1 from match_room_members m
    where m.room_id = p_room_id and m.user_id = p_opponent_user_id and m.status = 'joined'
  ) then
    raise exception 'opponent_not_in_room';
  end if;

  v_is_doubles := v_room.match_type <> 'singles';
  if v_is_doubles then
    if p_partner is null or p_opponent2 is null
       or coalesce(p_partner->>'name', '') = '' or coalesce(p_opponent2->>'name', '') = '' then
      raise exception 'doubles_players_required';
    end if;
    v_partner_user_id := nullif(p_partner->>'user_id', '')::uuid;
    v_opp2_user_id := nullif(p_opponent2->>'user_id', '')::uuid;
    if v_partner_user_id is not null and v_partner_user_id in (v_uid, p_opponent_user_id) then
      raise exception 'invalid_partner';
    end if;
    if v_opp2_user_id is not null and v_opp2_user_id in (v_uid, p_opponent_user_id) then
      raise exception 'invalid_opponent2';
    end if;
    if v_partner_user_id is not null and v_opp2_user_id is not null and v_partner_user_id = v_opp2_user_id then
      raise exception 'duplicate_players';
    end if;
    if v_partner_user_id is not null and not exists (
      select 1 from match_room_members m
      where m.room_id = p_room_id and m.user_id = v_partner_user_id and m.status = 'joined'
    ) then
      raise exception 'participant_not_in_room';
    end if;
    if v_opp2_user_id is not null and not exists (
      select 1 from match_room_members m
      where m.room_id = p_room_id and m.user_id = v_opp2_user_id and m.status = 'joined'
    ) then
      raise exception 'participant_not_in_room';
    end if;
  end if;

  insert into match_requests
    (id, requester_id, opponent_user_id, played_at, played_time, match_type, surface,
     notes, set_scores, court_name, room_id, status, responded_at)
  values
    (v_id, v_uid, p_opponent_user_id, v_room.played_at, coalesce(v_room.played_time, '00:00'::time),
     v_room.match_type, coalesce(v_room.surface, 'other'), null, '[]'::jsonb, v_room.court_name,
     p_room_id, 'accepted', now());

  if v_is_doubles then
    insert into match_request_participants (request_id, role, user_id, name, dominant_hand, ntrp_snapshot)
    values (v_id, 'partner', v_partner_user_id, p_partner->>'name',
            nullif(p_partner->>'dominant_hand', ''), nullif(p_partner->>'ntrp', '')::numeric);
    insert into match_request_participants (request_id, role, user_id, name, dominant_hand, ntrp_snapshot)
    values (v_id, 'opponent2', v_opp2_user_id, p_opponent2->>'name',
            nullif(p_opponent2->>'dominant_hand', ''), nullif(p_opponent2->>'ntrp', '')::numeric);
  end if;

  perform public.materialize_accepted_request(v_id);

  if p_replace_match_id is not null then
    select * into v_seed from personal_matches
    where id = p_replace_match_id and user_id = v_uid and room_id = p_room_id
      and source_type = 'direct' and source_request_id is null
      and jsonb_array_length(set_scores) = 0;
    if not found then raise exception 'replace_not_allowed'; end if;
    delete from personal_matches where id = p_replace_match_id;
  end if;

  return v_id;
end;
$$;

revoke all on function public.create_room_game(uuid, uuid, jsonb, jsonb, uuid) from public;
revoke execute on function public.create_room_game(uuid, uuid, jsonb, jsonb, uuid) from anon;
grant execute on function public.create_room_game(uuid, uuid, jsonb, jsonb, uuid) to authenticated;

-- ── 5) confirm_match_result ──
create or replace function public.confirm_match_result(p_request_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_req match_requests%rowtype;
  v_neg match_result_negotiations%rowtype;
  v_uid uuid := auth.uid();
  v_inverted jsonb;
  v_requester_rows int;
  v_opponent_rows int;
  v_partner_user_id uuid;
  v_opp2_user_id uuid;
begin
  select * into v_req from match_requests where id = p_request_id for update;
  if not found then raise exception 'request_not_found'; end if;
  if v_req.status <> 'accepted' then raise exception 'request_not_accepted'; end if;
  if v_uid is null or (v_req.requester_id <> v_uid and v_req.opponent_user_id <> v_uid) then
    raise exception 'not_request_party';
  end if;

  select * into v_neg from match_result_negotiations where request_id = p_request_id for update;
  if not found or v_neg.result_status <> 'proposed' then raise exception 'result_not_proposed'; end if;
  if v_neg.proposed_by = v_uid then raise exception 'cannot_confirm_own_proposal'; end if;

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
  end if;
  if v_opp2_user_id is not null then
    update personal_matches
    set set_scores = public.swap_partner_perspective(v_inverted)
    where source_request_id = p_request_id and user_id = v_opp2_user_id;
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

-- ── 6) finalize_rotation_session ──
create or replace function public.finalize_rotation_session(p_session_id uuid, p_games jsonb)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_s rotation_sessions%rowtype;
  v_owner users%rowtype;
  v_owner_json jsonb;
  g jsonb;
  v_sets jsonb;
  v_match_id uuid;
  v_seq int := 0;
  v_partner_id uuid; v_opp1_id uuid; v_opp2_id uuid;
begin
  delete from rotation_sessions
  where id = p_session_id and user_id = auth.uid()
  returning * into v_s;
  if not found then raise exception 'session_not_found'; end if;

  if p_games is null or jsonb_typeof(p_games) <> 'array'
     or jsonb_array_length(p_games) < 1 or jsonb_array_length(p_games) > 20 then
    raise exception 'invalid_games';
  end if;

  select * into v_owner from users where id = v_s.user_id;
  v_owner_json := jsonb_strip_nulls(jsonb_build_object(
    'userId', v_owner.id, 'name', v_owner.name, 'hand', v_owner.dominant_hand,
    'ntrp', coalesce(public.derive_public_ntrp(v_owner), v_owner.ntrp)));

  for g in select value from jsonb_array_elements(p_games) loop
    if coalesce(g->'partner'->>'name', '') = ''
       or coalesce(g->'opp1'->>'name', '') = ''
       or coalesce(g->'opp2'->>'name', '') = '' then
      raise exception 'invalid_games';
    end if;
    if jsonb_typeof(g->'sets') <> 'array' or jsonb_array_length(g->'sets') <> 1
       or not public.validate_set_scores(g->'sets') then
      raise exception 'invalid_set_scores';
    end if;
    v_sets := public.normalize_set_scores(g->'sets', true);
    v_match_id := gen_random_uuid();
    v_seq := v_seq + 1;

    insert into personal_matches
      (id, user_id, source_type, played_at, played_time, match_type, surface, set_scores, notes, court_name,
       rotation_session_id, group_seq, room_id)
    values
      (v_match_id, v_s.user_id, 'rotation', v_s.played_at, v_s.played_time, v_s.match_type, v_s.surface, v_sets,
       v_s.notes, v_s.court_name, p_session_id, v_seq, v_s.room_id);

    insert into personal_match_participants (match_id, role, user_id, name, dominant_hand, ntrp_snapshot)
    values (v_match_id, 'opponent', nullif(g->'opp1'->>'userId', '')::uuid, g->'opp1'->>'name', nullif(g->'opp1'->>'hand', ''), nullif(g->'opp1'->>'ntrp', '')::numeric);
    insert into personal_match_participants (match_id, role, user_id, name, dominant_hand, ntrp_snapshot)
    values (v_match_id, 'partner', nullif(g->'partner'->>'userId', '')::uuid, g->'partner'->>'name', nullif(g->'partner'->>'hand', ''), nullif(g->'partner'->>'ntrp', '')::numeric);
    insert into personal_match_participants (match_id, role, user_id, name, dominant_hand, ntrp_snapshot)
    values (v_match_id, 'opponent2', nullif(g->'opp2'->>'userId', '')::uuid, g->'opp2'->>'name', nullif(g->'opp2'->>'hand', ''), nullif(g->'opp2'->>'ntrp', '')::numeric);

    if v_s.room_id is not null then
      v_partner_id := nullif(g->'partner'->>'userId', '')::uuid;
      v_opp1_id := nullif(g->'opp1'->>'userId', '')::uuid;
      v_opp2_id := nullif(g->'opp2'->>'userId', '')::uuid;

      if public.is_active_member(v_partner_id) and v_partner_id <> v_s.user_id then
        perform public.copy_personal_match_perspective(
          v_match_id, v_partner_id, public.swap_partner_perspective(v_sets),
          g->'opp1', v_owner_json, g->'opp2');
      end if;
      if public.is_active_member(v_opp1_id) and v_opp1_id <> v_s.user_id then
        perform public.copy_personal_match_perspective(
          v_match_id, v_opp1_id, public.invert_set_scores(v_sets),
          v_owner_json, g->'opp2', g->'partner');
      end if;
      if public.is_active_member(v_opp2_id) and v_opp2_id <> v_s.user_id then
        perform public.copy_personal_match_perspective(
          v_match_id, v_opp2_id, public.swap_partner_perspective(public.invert_set_scores(v_sets)),
          v_owner_json, g->'opp1', g->'partner');
      end if;
    end if;
  end loop;
end;
$$;

revoke all on function public.finalize_rotation_session(uuid, jsonb) from public;
revoke execute on function public.finalize_rotation_session(uuid, jsonb) from anon;
grant execute on function public.finalize_rotation_session(uuid, jsonb) to authenticated;

-- ── 7) has_result → is_settled ──
alter table public.match_rooms rename column has_result to is_settled;
comment on column public.match_rooms.is_settled is
  '방의 primary 게임이 1건 이상이고 전부 확정(세트 있음). pending 요청·미확정 로테이션 세션이 있으면 false. 경기 리스트 예정/지난 분리에 쓴다(0049)';

create or replace function public.recompute_match_room_settled(p_room_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_room match_rooms%rowtype;
  v_total int;
  v_open int;
begin
  if p_room_id is null then return; end if;
  select * into v_room from match_rooms where id = p_room_id;
  if not found then return; end if;

  select count(*), count(*) filter (where jsonb_array_length(pm.set_scores) = 0)
  into v_total, v_open
  from personal_matches pm
  where pm.room_id = p_room_id
    and (
      pm.source_type = 'direct'
      or (pm.source_type = 'rotation' and pm.user_id = v_room.host_user_id)
      or (pm.source_type = 'confirmation' and exists (
            select 1 from match_requests r where r.id = pm.source_request_id and r.requester_id = pm.user_id))
    );

  update match_rooms
  set is_settled = (
    v_total > 0 and v_open = 0
    and not exists (select 1 from match_requests r where r.room_id = p_room_id and r.status = 'pending')
    and not exists (select 1 from rotation_sessions s where s.room_id = p_room_id)
  )
  where id = p_room_id;
end;
$$;

revoke all on function public.recompute_match_room_settled(uuid) from public, anon, authenticated;

create or replace function public.sync_match_room_from_personal_match()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_room_id uuid;
begin
  if tg_op = 'DELETE' then
    v_room_id := old.room_id;
  else
    v_room_id := new.room_id;
    if new.source_type = 'direct' then
      update match_rooms r
      set played_at = new.played_at, played_time = new.played_time, match_type = new.match_type,
          surface = new.surface, court_name = new.court_name, notes = new.notes
      where r.id = new.room_id and r.host_user_id = new.user_id;
    end if;
  end if;

  perform public.recompute_match_room_settled(v_room_id);
  if tg_op = 'UPDATE' and old.room_id is not null and old.room_id is distinct from new.room_id then
    perform public.recompute_match_room_settled(old.room_id);
  end if;
  return null;
end;
$$;

drop trigger if exists personal_matches_sync_room on public.personal_matches;
drop trigger if exists personal_matches_sync_room_ins on public.personal_matches;
drop trigger if exists personal_matches_sync_room_upd on public.personal_matches;
drop trigger if exists personal_matches_sync_room_del on public.personal_matches;
create trigger personal_matches_sync_room_ins
  after insert on public.personal_matches
  for each row when (new.room_id is not null)
  execute function public.sync_match_room_from_personal_match();
create trigger personal_matches_sync_room_upd
  after update on public.personal_matches
  for each row when (new.room_id is not null or old.room_id is not null)
  execute function public.sync_match_room_from_personal_match();
create trigger personal_matches_sync_room_del
  after delete on public.personal_matches
  for each row when (old.room_id is not null)
  execute function public.sync_match_room_from_personal_match();

create or replace function public.sync_match_room_from_request()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  perform public.recompute_match_room_settled(new.room_id);
  return null;
end;
$$;

revoke all on function public.sync_match_room_from_request() from public, anon, authenticated;

drop trigger if exists match_requests_sync_room on public.match_requests;
create trigger match_requests_sync_room
  after update of status on public.match_requests
  for each row when (new.room_id is not null)
  execute function public.sync_match_room_from_request();

create or replace function public.create_match_room(p_source_kind text, p_source_id uuid, p_password text)
returns uuid
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_room uuid := gen_random_uuid();
  v_pm personal_matches%rowtype;
  v_req match_requests%rowtype;
  v_s rotation_sessions%rowtype;
  v_played_at date; v_played_time time; v_match_type text; v_surface text; v_court_name text; v_notes text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_password is null or char_length(p_password) < 4 or char_length(p_password) > 20 or p_password ~ '\s' then
    raise exception 'invalid_password';
  end if;

  if p_source_kind = 'direct' then
    select * into v_pm from personal_matches where id = p_source_id and user_id = v_uid for update;
    if not found or v_pm.source_type <> 'direct' then raise exception 'source_not_found'; end if;
    if v_pm.room_id is not null then raise exception 'already_listed'; end if;
    v_played_at := v_pm.played_at; v_played_time := v_pm.played_time; v_match_type := v_pm.match_type;
    v_surface := v_pm.surface; v_court_name := v_pm.court_name; v_notes := v_pm.notes;
  elsif p_source_kind = 'confirmation' then
    select * into v_req from match_requests where id = p_source_id and requester_id = v_uid for update;
    if not found or v_req.status <> 'pending' then raise exception 'source_not_found'; end if;
    if v_req.room_id is not null then raise exception 'already_listed'; end if;
    v_played_at := v_req.played_at; v_played_time := v_req.played_time; v_match_type := v_req.match_type;
    v_surface := v_req.surface; v_court_name := v_req.court_name; v_notes := v_req.notes;
  elsif p_source_kind = 'rotation' then
    select * into v_s from rotation_sessions where id = p_source_id and user_id = v_uid for update;
    if not found then raise exception 'source_not_found'; end if;
    if v_s.room_id is not null then raise exception 'already_listed'; end if;
    v_played_at := v_s.played_at; v_played_time := v_s.played_time; v_match_type := v_s.match_type;
    v_surface := v_s.surface; v_court_name := v_s.court_name; v_notes := v_s.notes;
  else
    raise exception 'invalid_source_kind';
  end if;

  insert into match_rooms (id, host_user_id, source_kind, played_at, played_time, match_type, surface, court_name, notes)
  values (v_room, v_uid, p_source_kind, v_played_at, v_played_time, v_match_type, v_surface, v_court_name, v_notes);
  insert into match_room_secrets (room_id, password_hash) values (v_room, crypt(p_password, gen_salt('bf')));
  insert into match_room_members (room_id, user_id, role, status) values (v_room, v_uid, 'host', 'joined');

  if p_source_kind = 'direct' then
    insert into match_room_members (room_id, user_id, role, status, source_role)
    select v_room, p.user_id, 'player', 'invited', p.role
    from personal_match_participants p join users u on u.id = p.user_id
    where p.match_id = p_source_id and u.is_guest = false and u.deleted_at is null and u.id <> v_uid
    on conflict (room_id, user_id) do nothing;
    update personal_matches set room_id = v_room where id = p_source_id;
  elsif p_source_kind = 'confirmation' then
    insert into match_room_members (room_id, user_id, role, status, source_role)
    select v_room, p.user_id, 'player', 'invited', p.role
    from match_request_participants p join users u on u.id = p.user_id
    where p.request_id = p_source_id and u.is_guest = false and u.deleted_at is null
      and u.id <> v_uid and u.id <> v_req.opponent_user_id
    on conflict (room_id, user_id) do nothing;
    update match_requests set room_id = v_room where id = p_source_id;
  else
    insert into match_room_members (room_id, user_id, role, status, source_role)
    select v_room, u.id, 'player', 'invited', 'pool'
    from jsonb_array_elements(v_s.players) e
    join users u on u.id = nullif(e->>'userId', '')::uuid
    where u.is_guest = false and u.deleted_at is null and u.id <> v_uid
    on conflict (room_id, user_id) do nothing;
    update rotation_sessions set room_id = v_room where id = p_source_id;
  end if;

  perform public.recompute_match_room_settled(v_room);
  return v_room;
end;
$$;

revoke all on function public.create_match_room(text, uuid, text) from public;
revoke execute on function public.create_match_room(text, uuid, text) from anon;
grant execute on function public.create_match_room(text, uuid, text) to authenticated;

-- ── 8) get_match_room_detail ──
create or replace function public.get_match_room_detail(p_room_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room match_rooms%rowtype;
  v_host users%rowtype;
  v_viewer match_room_members%rowtype;
  v_req match_requests%rowtype;
  v_neg match_result_negotiations%rowtype;
  v_s rotation_sessions%rowtype;
  v_source jsonb;
  v_members jsonb;
  v_games jsonb;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select * into v_room from match_rooms where id = p_room_id;
  if not found then raise exception 'room_not_found'; end if;
  select * into v_viewer from match_room_members where room_id = p_room_id and user_id = v_uid;
  if v_room.host_user_id <> v_uid and (not found or v_viewer.status = 'declined') then
    raise exception 'not_member';
  end if;
  select * into v_host from users where id = v_room.host_user_id;

  select coalesce(jsonb_agg(jsonb_build_object(
      'userId', m.user_id, 'name', u.name, 'nickname', u.nickname, 'profileImage', u.profile_image,
      'deleted', u.deleted_at is not null, 'role', m.role, 'status', m.status, 'sourceRole', m.source_role
    ) order by (m.role = 'host') desc, (m.status = 'joined') desc, m.created_at), '[]'::jsonb)
  into v_members
  from match_room_members m join users u on u.id = m.user_id
  where m.room_id = p_room_id;

  if v_room.source_kind = 'confirmation' then
    select * into v_req from match_requests where room_id = p_room_id order by created_at limit 1;
    if found then
      select * into v_neg from match_result_negotiations where request_id = v_req.id;
      v_source := jsonb_build_object(
        'kind', 'confirmation',
        'requestStatus', v_req.status,
        'resultStatus', coalesce(v_neg.result_status, 'none'),
        'repName', (select u.name from users u where u.id = v_req.opponent_user_id),
        'repUserId', v_req.opponent_user_id,
        'participants', (
          select coalesce(jsonb_agg(jsonb_build_object('role', p.role, 'name', p.name, 'userId', p.user_id) order by p.role), '[]'::jsonb)
          from match_request_participants p where p.request_id = v_req.id
        )
      );
    else
      v_source := jsonb_build_object('kind', 'confirmation');
    end if;
  elsif v_room.source_kind = 'rotation' then
    select * into v_s from rotation_sessions where room_id = p_room_id;
    v_source := jsonb_build_object(
      'kind', 'rotation',
      'isFinalized', not found,
      'pool', case when found then v_s.players else null end
    );
  else
    v_source := jsonb_build_object('kind', 'direct');
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', pm.id, 'groupSeq', pm.group_seq, 'matchType', pm.match_type, 'setScores', pm.set_scores,
      'ownerUserId', pm.user_id, 'ownerName', ou.name,
      'sourceType', pm.source_type, 'sourceRequestId', pm.source_request_id,
      'resultStatus', neg.result_status,
      'participants', (
        select coalesce(jsonb_agg(jsonb_build_object('role', p.role, 'name', p.name, 'userId', p.user_id) order by p.role), '[]'::jsonb)
        from personal_match_participants p where p.match_id = pm.id
      )
    ) order by pm.group_seq nulls first, pm.created_at), '[]'::jsonb)
  into v_games
  from personal_matches pm
  join users ou on ou.id = pm.user_id
  left join match_result_negotiations neg on neg.request_id = pm.source_request_id
  where pm.room_id = p_room_id
    and (
      pm.source_type = 'direct'
      or (pm.source_type = 'rotation' and pm.user_id = v_room.host_user_id)
      or (pm.source_type = 'confirmation' and exists (
            select 1 from match_requests r where r.id = pm.source_request_id and r.requester_id = pm.user_id))
    );

  return jsonb_build_object(
    'room', jsonb_build_object(
      'id', v_room.id, 'hostUserId', v_room.host_user_id, 'sourceKind', v_room.source_kind,
      'playedAt', v_room.played_at, 'playedTime', v_room.played_time, 'matchType', v_room.match_type,
      'surface', v_room.surface, 'courtName', v_room.court_name, 'notes', v_room.notes,
      'isSettled', v_room.is_settled, 'createdAt', v_room.created_at
    ),
    'host', jsonb_build_object(
      'id', v_host.id, 'name', v_host.name, 'nickname', v_host.nickname,
      'profileImage', v_host.profile_image, 'deleted', v_host.deleted_at is not null
    ),
    'viewer', case when v_viewer.id is null then null
      else jsonb_build_object('role', v_viewer.role, 'status', v_viewer.status) end,
    'members', v_members,
    'source', v_source,
    'games', v_games
  );
end;
$$;

revoke all on function public.get_match_room_detail(uuid) from public;
revoke execute on function public.get_match_room_detail(uuid) from anon;
grant execute on function public.get_match_room_detail(uuid) to authenticated;

-- ── 9) 기존 방 정산 상태 백필 ──
do $$
declare r record;
begin
  for r in select id from match_rooms loop
    perform public.recompute_match_room_settled(r.id);
  end loop;
end $$;
