-- 20260904023211 0047_recruiting_rooms
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
-- 0047_recruiting_rooms.sql (로컬 supabase/migrations/0047_recruiting_rooms.sql과 동일 본문)
alter table public.rotation_sessions drop constraint rotation_sessions_players_check;
alter table public.rotation_sessions
  add constraint rotation_sessions_players_check check (jsonb_typeof(players) = 'array');

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
  v_capacity int; v_has_result boolean := false;
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
    v_capacity := case when v_pm.match_type = 'singles' then 2 else 4 end;
    v_has_result := jsonb_array_length(v_pm.set_scores) > 0;
  elsif p_source_kind = 'confirmation' then
    select * into v_req from match_requests where id = p_source_id and requester_id = v_uid for update;
    if not found or v_req.status <> 'pending' then raise exception 'source_not_found'; end if;
    if v_req.room_id is not null then raise exception 'already_listed'; end if;
    v_played_at := v_req.played_at; v_played_time := v_req.played_time; v_match_type := v_req.match_type;
    v_surface := v_req.surface; v_court_name := v_req.court_name; v_notes := v_req.notes;
    v_capacity := case when v_req.match_type = 'singles' then 2 else 4 end;
  elsif p_source_kind = 'rotation' then
    select * into v_s from rotation_sessions where id = p_source_id and user_id = v_uid for update;
    if not found then raise exception 'source_not_found'; end if;
    if v_s.room_id is not null then raise exception 'already_listed'; end if;
    v_played_at := v_s.played_at; v_played_time := v_s.played_time; v_match_type := v_s.match_type;
    v_surface := v_s.surface; v_court_name := v_s.court_name; v_notes := v_s.notes;
    v_capacity := greatest(4, 1 + jsonb_array_length(v_s.players));
  else
    raise exception 'invalid_source_kind';
  end if;

  insert into match_rooms (id, host_user_id, source_kind, played_at, played_time, match_type, surface, court_name, notes, capacity, has_result)
  values (v_room, v_uid, p_source_kind, v_played_at, v_played_time, v_match_type, v_surface, v_court_name, v_notes, v_capacity, v_has_result);
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

  return v_room;
end;
$$;

revoke all on function public.create_match_room(text, uuid, text) from public;
revoke execute on function public.create_match_room(text, uuid, text) from anon;
grant execute on function public.create_match_room(text, uuid, text) to authenticated;

create or replace function public.approve_room_join(p_room_id uuid, p_user_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room match_rooms%rowtype;
  v_s rotation_sessions%rowtype;
  v_m match_room_members%rowtype;
  v_u users%rowtype;
  v_ntrp numeric;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select * into v_room from match_rooms where id = p_room_id for update;
  if not found then raise exception 'room_not_found'; end if;
  if v_room.host_user_id <> v_uid then raise exception 'not_host'; end if;
  select * into v_s from rotation_sessions where room_id = p_room_id for update;
  if not found then raise exception 'room_finalized'; end if;
  select * into v_m from match_room_members where room_id = p_room_id and user_id = p_user_id and status = 'requested';
  if not found then raise exception 'request_not_found'; end if;
  select * into v_u from users where id = p_user_id and is_guest = false and deleted_at is null;
  if not found then raise exception 'user_not_found'; end if;

  v_ntrp := coalesce(public.derive_public_ntrp(v_u), v_u.ntrp);
  if v_ntrp is null then raise exception 'ntrp_missing'; end if;

  if not exists (select 1 from jsonb_array_elements(v_s.players) e where e->>'userId' = p_user_id::text) then
    update rotation_sessions
    set players = players || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
      'userId', v_u.id, 'name', v_u.name, 'hand', v_u.dominant_hand, 'ntrp', v_ntrp
    )))
    where id = v_s.id;
    update match_rooms r
    set capacity = greatest(4, 1 + jsonb_array_length(s.players))
    from rotation_sessions s
    where s.id = v_s.id and r.id = p_room_id;
  end if;
  update match_room_members
  set role = 'player', status = 'joined', source_role = 'pool', responded_at = now()
  where id = v_m.id;
end;
$$;

revoke all on function public.approve_room_join(uuid, uuid) from public;
revoke execute on function public.approve_room_join(uuid, uuid) from anon;
grant execute on function public.approve_room_join(uuid, uuid) to authenticated;

create or replace function public.invite_room_member_from_participant()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_pm personal_matches%rowtype;
  v_room match_rooms%rowtype;
begin
  select * into v_pm from personal_matches where id = new.match_id;
  if not found or v_pm.room_id is null or v_pm.source_type <> 'direct' then return null; end if;

  select * into v_room from match_rooms where id = v_pm.room_id and host_user_id = v_pm.user_id;
  if not found or new.user_id = v_room.host_user_id then return null; end if;
  if not exists (
    select 1 from users u where u.id = new.user_id and u.is_guest = false and u.deleted_at is null
  ) then
    return null;
  end if;

  insert into match_room_members (room_id, user_id, role, status, source_role)
  values (v_pm.room_id, new.user_id, 'player', 'invited', new.role)
  on conflict (room_id, user_id) do update
    set role = 'player', status = 'invited', source_role = excluded.source_role, responded_at = null
    where match_room_members.role = 'viewer' and match_room_members.status = 'joined';
  return null;
end;
$$;

revoke all on function public.invite_room_member_from_participant() from public, anon, authenticated;

create trigger personal_match_participants_invite
  after insert on public.personal_match_participants
  for each row when (new.user_id is not null)
  execute function public.invite_room_member_from_participant();
