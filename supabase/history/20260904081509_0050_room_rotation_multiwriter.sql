-- 20260904081509 0050_room_rotation_multiwriter
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
-- 0050_room_rotation_multiwriter.sql (본문은 supabase/migrations/0050_room_rotation_multiwriter.sql 참조)

alter table public.personal_matches
  add column is_perspective boolean not null default false;

comment on column public.personal_matches.is_perspective is
  '다른 참가자의 기록에서 파생된 관점 복사본 여부. 방의 primary 게임(대표 한 벌) 판정 단일 기준(0050)';

create index personal_matches_room_primary_idx
  on public.personal_matches (room_id)
  where room_id is not null and is_perspective = false;

update public.personal_matches pm set is_perspective = true
where pm.source_type = 'confirmation'
  and not exists (
    select 1 from public.match_requests r
    where r.id = pm.source_request_id and r.requester_id = pm.user_id
  );

update public.personal_matches pm set is_perspective = true
where pm.source_type = 'rotation'
  and pm.room_id is not null
  and pm.user_id is distinct from (
    select r.host_user_id from public.match_rooms r where r.id = pm.room_id
  );

create or replace function public.swap_opponent_perspective(p_sets jsonb)
returns jsonb
language sql immutable
as $$
  select coalesce(
    jsonb_agg(
      jsonb_strip_nulls(jsonb_build_object(
        'me', e->'me',
        'opp', e->'opp',
        'myAd', e->'myAd',
        'oppAd', case e->>'oppAd'
                   when 'opponent' then to_jsonb('opponent2'::text)
                   when 'opponent2' then to_jsonb('opponent'::text)
                   else null end
      ))
      order by ord
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(coalesce(p_sets, '[]'::jsonb)) with ordinality t(e, ord);
$$;

create or replace function public.resolve_rotation_player(p_player jsonb)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_id uuid := nullif(p_player->>'userId', '')::uuid;
  v_u users%rowtype;
begin
  if v_id is not null then
    select * into v_u from users where id = v_id and is_guest = false and deleted_at is null;
    if found then
      return jsonb_strip_nulls(jsonb_build_object(
        'userId', v_u.id,
        'name', v_u.name,
        'hand', v_u.dominant_hand,
        'ntrp', coalesce(public.derive_public_ntrp(v_u), v_u.ntrp, nullif(p_player->>'ntrp', '')::numeric)
      ));
    end if;
  end if;
  return jsonb_strip_nulls(jsonb_build_object(
    'userId', v_id,
    'name', p_player->>'name',
    'hand', nullif(p_player->>'hand', ''),
    'ntrp', nullif(p_player->>'ntrp', '')::numeric
  ));
end;
$$;

revoke all on function public.swap_opponent_perspective(jsonb) from public, anon, authenticated;
revoke all on function public.resolve_rotation_player(jsonb) from public, anon, authenticated;

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
     set_scores, notes, court_name, rotation_session_id, group_seq, room_id, is_perspective)
  values
    (v_id, p_user_id, v_src.source_type, v_src.source_request_id, v_src.played_at, v_src.played_time,
     v_src.match_type, v_src.surface, p_sets, null, v_src.court_name,
     v_src.rotation_session_id, v_src.group_seq, v_src.room_id, true);

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

drop function if exists public.materialize_accepted_request(uuid);

create or replace function public.materialize_accepted_request(
  p_request_id uuid,
  p_rotation_session_id uuid default null,
  p_group_seq smallint default null
)
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
    (id, user_id, source_type, source_request_id, played_at, played_time, match_type, surface,
     set_scores, notes, court_name, room_id, rotation_session_id, group_seq, is_perspective)
  values
    (v_pm_requester, v_req.requester_id, 'confirmation', v_req.id, v_req.played_at, v_req.played_time,
     v_req.match_type, v_req.surface, v_req.set_scores, v_req.notes, v_req.court_name, v_req.room_id,
     p_rotation_session_id, p_group_seq, false);

  insert into personal_match_participants (match_id, role, user_id, name, dominant_hand, ntrp_snapshot)
  values (v_pm_requester, 'opponent', v_acceptor.id, v_acceptor.name, v_acceptor.dominant_hand, v_acceptor_ntrp);
  if v_is_doubles then
    insert into personal_match_participants (match_id, role, user_id, name, dominant_hand, ntrp_snapshot)
    values (v_pm_requester, 'partner', v_partner_user_id, v_partner_name, v_partner_hand, v_partner_ntrp);
    insert into personal_match_participants (match_id, role, user_id, name, dominant_hand, ntrp_snapshot)
    values (v_pm_requester, 'opponent2', v_opp2_user_id, v_opp2_name, v_opp2_hand, v_opp2_ntrp);
  end if;

  insert into personal_matches
    (id, user_id, source_type, source_request_id, played_at, played_time, match_type, surface,
     set_scores, notes, court_name, room_id, rotation_session_id, group_seq, is_perspective)
  values
    (v_pm_acceptor, v_acceptor.id, 'confirmation', v_req.id, v_req.played_at, v_req.played_time,
     v_req.match_type, v_req.surface, v_inverted_scores, null, v_req.court_name, v_req.room_id,
     p_rotation_session_id, p_group_seq, true);

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

revoke all on function public.materialize_accepted_request(uuid, uuid, smallint) from public, anon, authenticated;

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

create or replace function public.recompute_match_room_settled(p_room_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_total int;
  v_open int;
begin
  if p_room_id is null then return; end if;
  if not exists (select 1 from match_rooms where id = p_room_id) then return; end if;

  select count(*), count(*) filter (where jsonb_array_length(pm.set_scores) = 0)
  into v_total, v_open
  from personal_matches pm
  where pm.room_id = p_room_id and not pm.is_perspective;

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

create or replace function public.join_match_room_as_player(p_room_id uuid, p_user_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_room match_rooms%rowtype;
  v_s rotation_sessions%rowtype;
  v_u users%rowtype;
  v_ntrp numeric;
begin
  select * into v_room from match_rooms where id = p_room_id;
  if not found then raise exception 'room_not_found'; end if;
  if v_room.host_user_id = p_user_id then return; end if;

  insert into match_room_members (room_id, user_id, role, status, responded_at)
  values (p_room_id, p_user_id, 'player', 'joined', now())
  on conflict (room_id, user_id) do update
    set role = 'player', status = 'joined', responded_at = now()
    where match_room_members.role <> 'host';

  select * into v_s from rotation_sessions where room_id = p_room_id for update;
  if not found then return; end if;
  if exists (select 1 from jsonb_array_elements(v_s.players) e where e->>'userId' = p_user_id::text) then return; end if;

  select * into v_u from users where id = p_user_id and is_guest = false and deleted_at is null;
  if not found then return; end if;
  v_ntrp := coalesce(public.derive_public_ntrp(v_u), v_u.ntrp);
  if v_ntrp is null then return; end if;

  update rotation_sessions
  set players = players || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
    'userId', v_u.id, 'name', v_u.name, 'hand', v_u.dominant_hand, 'ntrp', v_ntrp
  )))
  where id = v_s.id;
  update match_room_members set source_role = 'pool' where room_id = p_room_id and user_id = p_user_id;
end;
$$;

revoke all on function public.join_match_room_as_player(uuid, uuid) from public, anon, authenticated;

create or replace function public.respond_room_invite(p_room_id uuid, p_accept boolean)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  update match_room_members
  set status = case when p_accept then 'joined' else 'declined' end, responded_at = now()
  where room_id = p_room_id and user_id = v_uid and status = 'invited';
  if not found then raise exception 'invite_not_found'; end if;

  if p_accept then
    perform public.join_match_room_as_player(p_room_id, v_uid);
  end if;
end;
$$;

revoke all on function public.respond_room_invite(uuid, boolean) from public;
revoke execute on function public.respond_room_invite(uuid, boolean) from anon;
grant execute on function public.respond_room_invite(uuid, boolean) to authenticated;

create or replace function public.finalize_rotation_session(p_session_id uuid, p_games jsonb)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_s rotation_sessions%rowtype;
  v_me users%rowtype;
  v_me_json jsonb;
  v_allowed uuid[];
  v_notes text;
  g jsonb;
  v_sets jsonb;
  v_seq int;
  v_match_id uuid;
  v_req_id uuid;
  v_partner jsonb; v_opp1 jsonb; v_opp2 jsonb;
  v_partner_id uuid; v_opp1_id uuid; v_opp2_id uuid;
  v_rep_id uuid; v_other jsonb;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select * into v_s from rotation_sessions where id = p_session_id for update;
  if not found then raise exception 'session_not_found'; end if;

  if v_s.room_id is null then
    if v_s.user_id <> v_uid then raise exception 'session_not_found'; end if;
  elsif v_s.user_id <> v_uid and not public.is_room_participant(v_s.room_id) then
    raise exception 'not_session_participant';
  end if;

  if p_games is null or jsonb_typeof(p_games) <> 'array'
     or jsonb_array_length(p_games) < 1 or jsonb_array_length(p_games) > 20 then
    raise exception 'invalid_games';
  end if;

  select * into v_me from users where id = v_uid;
  v_me_json := jsonb_strip_nulls(jsonb_build_object(
    'userId', v_me.id, 'name', v_me.name, 'hand', v_me.dominant_hand,
    'ntrp', coalesce(public.derive_public_ntrp(v_me), v_me.ntrp)));

  v_notes := case when v_s.user_id = v_uid then v_s.notes else null end;

  select coalesce(array_agg(distinct t.uid), '{}'::uuid[]) into v_allowed
  from (
    select nullif(e->>'userId', '')::uuid as uid from jsonb_array_elements(v_s.players) e
    union
    select m.user_id from match_room_members m
      where v_s.room_id is not null and m.room_id = v_s.room_id and m.status = 'joined'
    union
    select v_s.user_id
  ) t
  where t.uid is not null;

  select coalesce(max(group_seq), 0) into v_seq
  from personal_matches where rotation_session_id = p_session_id;

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

    v_partner := public.resolve_rotation_player(g->'partner');
    v_opp1 := public.resolve_rotation_player(g->'opp1');
    v_opp2 := public.resolve_rotation_player(g->'opp2');
    v_partner_id := nullif(v_partner->>'userId', '')::uuid;
    v_opp1_id := nullif(v_opp1->>'userId', '')::uuid;
    v_opp2_id := nullif(v_opp2->>'userId', '')::uuid;

    if (v_partner_id is not null and not (v_partner_id = any(v_allowed)))
       or (v_opp1_id is not null and not (v_opp1_id = any(v_allowed)))
       or (v_opp2_id is not null and not (v_opp2_id = any(v_allowed))) then
      raise exception 'participant_not_in_room';
    end if;
    if v_partner_id = v_uid or v_opp1_id = v_uid or v_opp2_id = v_uid then
      raise exception 'invalid_games';
    end if;
    if (v_partner_id is not null and v_partner_id in (v_opp1_id, v_opp2_id))
       or (v_opp1_id is not null and v_opp1_id = v_opp2_id) then
      raise exception 'duplicate_players';
    end if;

    v_sets := public.normalize_set_scores(g->'sets', true);
    v_seq := v_seq + 1;

    v_rep_id := null;
    if v_s.room_id is not null then
      if public.is_active_member(v_opp1_id) then
        v_rep_id := v_opp1_id; v_other := v_opp2;
      elsif public.is_active_member(v_opp2_id) then
        v_rep_id := v_opp2_id; v_other := v_opp1;
        v_sets := public.swap_opponent_perspective(v_sets);
      end if;
    end if;

    if v_rep_id is not null then
      v_req_id := gen_random_uuid();
      insert into match_requests
        (id, requester_id, opponent_user_id, played_at, played_time, match_type, surface,
         notes, set_scores, court_name, room_id, status, responded_at)
      values
        (v_req_id, v_uid, v_rep_id, v_s.played_at, v_s.played_time, v_s.match_type, v_s.surface,
         v_notes, '[]'::jsonb, v_s.court_name, v_s.room_id, 'accepted', now());

      insert into match_request_participants (request_id, role, user_id, name, dominant_hand, ntrp_snapshot)
      values (v_req_id, 'partner', v_partner_id, v_partner->>'name',
              nullif(v_partner->>'hand', ''), nullif(v_partner->>'ntrp', '')::numeric);
      insert into match_request_participants (request_id, role, user_id, name, dominant_hand, ntrp_snapshot)
      values (v_req_id, 'opponent2', nullif(v_other->>'userId', '')::uuid, v_other->>'name',
              nullif(v_other->>'hand', ''), nullif(v_other->>'ntrp', '')::numeric);

      perform public.materialize_accepted_request(v_req_id, p_session_id, v_seq::smallint);
      perform public.propose_match_result(v_req_id, v_sets);
    else
      v_match_id := gen_random_uuid();

      insert into personal_matches
        (id, user_id, source_type, played_at, played_time, match_type, surface, set_scores, notes, court_name,
         rotation_session_id, group_seq, room_id, is_perspective)
      values
        (v_match_id, v_uid, 'rotation', v_s.played_at, v_s.played_time, v_s.match_type, v_s.surface, v_sets,
         v_notes, v_s.court_name, p_session_id, v_seq, v_s.room_id, false);

      insert into personal_match_participants (match_id, role, user_id, name, dominant_hand, ntrp_snapshot)
      select v_match_id, r.role, nullif(r.p->>'userId', '')::uuid, r.p->>'name',
             nullif(r.p->>'hand', ''), nullif(r.p->>'ntrp', '')::numeric
      from (values ('opponent', v_opp1), ('partner', v_partner), ('opponent2', v_opp2)) as r(role, p);

      if v_s.room_id is not null then
        if public.is_active_member(v_partner_id) then
          perform public.copy_personal_match_perspective(
            v_match_id, v_partner_id, public.swap_partner_perspective(v_sets),
            v_opp1, v_me_json, v_opp2);
        end if;
        if public.is_active_member(v_opp1_id) then
          perform public.copy_personal_match_perspective(
            v_match_id, v_opp1_id, public.invert_set_scores(v_sets),
            v_me_json, v_opp2, v_partner);
        end if;
        if public.is_active_member(v_opp2_id) then
          perform public.copy_personal_match_perspective(
            v_match_id, v_opp2_id, public.swap_partner_perspective(public.invert_set_scores(v_sets)),
            v_me_json, v_opp1, v_partner);
        end if;
      end if;
    end if;
  end loop;

  if v_s.room_id is null then
    delete from rotation_sessions where id = p_session_id;
  else
    perform public.recompute_match_room_settled(v_s.room_id);
  end if;
end;
$$;

revoke all on function public.finalize_rotation_session(uuid, jsonb) from public;
revoke execute on function public.finalize_rotation_session(uuid, jsonb) from anon;
grant execute on function public.finalize_rotation_session(uuid, jsonb) to authenticated;

create or replace function public.close_rotation_room(p_room_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room match_rooms%rowtype;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select * into v_room from match_rooms where id = p_room_id;
  if not found then raise exception 'room_not_found'; end if;
  if v_room.host_user_id <> v_uid then raise exception 'not_room_host'; end if;
  if not exists (select 1 from rotation_sessions where room_id = p_room_id) then
    raise exception 'room_already_closed';
  end if;

  delete from rotation_sessions where room_id = p_room_id;
  perform public.recompute_match_room_settled(p_room_id);
end;
$$;

revoke all on function public.close_rotation_room(uuid) from public;
revoke execute on function public.close_rotation_room(uuid) from anon;
grant execute on function public.close_rotation_room(uuid) to authenticated;

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
      'sessionId', case when found then v_s.id else null end,
      'ownerUserId', case when found then v_s.user_id else null end,
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
  where pm.room_id = p_room_id and not pm.is_perspective;

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

drop policy rotation_sessions_select on public.rotation_sessions;
create policy rotation_sessions_select on public.rotation_sessions
  for select using (
    user_id = auth.uid()
    or (room_id is not null and public.is_room_participant(room_id))
  );

do $$
declare r record;
begin
  for r in select id from match_rooms loop
    perform public.recompute_match_room_settled(r.id);
  end loop;
end $$;
