-- 20260911082221 0077_room_settled_and_leave_guards
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
-- 0077_room_settled_and_leave_guards.sql — 정산된 방의 게임 추가 차단 · 배정된 회원의 방 나가기 차단 (Week 50)
-- 정본은 supabase/migrations/0077_room_settled_and_leave_guards.sql (배경 주석은 그 파일에).

create or replace function public.room_member_has_games(p_room_id uuid, p_user_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from personal_matches pm
    where pm.room_id = p_room_id
      and (pm.user_id = p_user_id or exists (
        select 1 from personal_match_participants p
        where p.match_id = pm.id and p.user_id = p_user_id
      ))
  ) or exists (
    select 1 from match_requests r
    where r.room_id = p_room_id
      and (r.requester_id = p_user_id or r.opponent_user_id = p_user_id or exists (
        select 1 from match_request_participants p
        where p.request_id = r.id and p.user_id = p_user_id
      ))
  );
$$;

revoke all on function public.room_member_has_games(uuid, uuid) from public, anon, authenticated;

create or replace function public.kick_room_member(p_room_id uuid, p_target_user_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room match_rooms%rowtype;
  v_m match_room_members%rowtype;
  v_s rotation_sessions%rowtype;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select * into v_room from match_rooms where id = p_room_id;
  if not found then raise exception 'room_not_found'; end if;
  if v_room.host_user_id <> v_uid then raise exception 'not_room_host'; end if;

  select * into v_m from match_room_members
  where room_id = p_room_id and user_id = p_target_user_id for update;
  if not found then raise exception 'target_not_room_member'; end if;
  if v_m.role = 'host' then raise exception 'cannot_kick_host'; end if;
  if v_m.status = 'removed' then return; end if;

  if public.room_member_has_games(p_room_id, p_target_user_id) then
    raise exception 'member_has_games';
  end if;

  update match_room_members
  set status = 'removed', responded_at = now()
  where id = v_m.id;

  select * into v_s from rotation_sessions where room_id = p_room_id for update;
  if found then
    update rotation_sessions
    set players = coalesce((
      select jsonb_agg(e)
      from jsonb_array_elements(v_s.players) e
      where e->>'userId' is distinct from p_target_user_id::text
    ), '[]'::jsonb)
    where id = v_s.id;
  end if;
end;
$$;

revoke all on function public.kick_room_member(uuid, uuid) from public;
revoke execute on function public.kick_room_member(uuid, uuid) from anon;
grant execute on function public.kick_room_member(uuid, uuid) to authenticated;

create or replace function public.leave_match_room(p_room_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room match_rooms%rowtype;
  v_s rotation_sessions%rowtype;
  v_rows int;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select * into v_room from match_rooms where id = p_room_id;
  if not found then raise exception 'room_not_found'; end if;
  if v_room.host_user_id = v_uid then raise exception 'host_cannot_leave'; end if;

  -- 0077: 이 방의 경기에 배정된 사람은 나갈 수 없다(강퇴와 대칭)
  if public.room_member_has_games(p_room_id, v_uid) then raise exception 'leave_member_has_games'; end if;

  update match_room_members
  set status = 'declined', responded_at = now()
  where room_id = p_room_id and user_id = v_uid and role <> 'host'
    and status <> 'removed';
  get diagnostics v_rows = row_count;
  if v_rows = 0 then raise exception 'not_room_member'; end if;

  select * into v_s from rotation_sessions where room_id = p_room_id for update;
  if found then
    update rotation_sessions
    set players = coalesce((
      select jsonb_agg(e)
      from jsonb_array_elements(v_s.players) e
      where e->>'userId' is distinct from v_uid::text
    ), '[]'::jsonb)
    where id = v_s.id;
  end if;
end;
$$;

revoke all on function public.leave_match_room(uuid) from public;
revoke execute on function public.leave_match_room(uuid) from anon;
grant execute on function public.leave_match_room(uuid) to authenticated;

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
  -- 0077: 정산된 방에는 게임을 붙이지 않는다 — 재개는 [결과 정정]
  if v_room.is_settled then raise exception 'room_already_closed'; end if;

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

drop policy if exists personal_matches_insert on public.personal_matches;
create policy personal_matches_insert on public.personal_matches
  for insert with check (
    user_id = auth.uid()
    and (
      room_id is null
      or (
        public.is_room_participant(room_id)
        and not exists (select 1 from public.match_rooms r where r.id = room_id and r.is_settled)
      )
    )
  );
