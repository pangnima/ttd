-- 20260910062922 0071_room_lineup_edit
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
alter table public.match_requests
  add column if not exists origin text not null default 'game'
  check (origin in ('game', 'lineup'));

comment on column public.match_requests.origin is
  '만든 경로 — game: 참가자가 손으로 추가(create_room_game) / lineup: 방장의 자동 대진표(create_room_lineup). 방장이 통째로 고칠 수 있는 것은 lineup뿐이다.';

create or replace function public.insert_room_lineup_games(p_room_id uuid, p_games jsonb)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_room match_rooms%rowtype;
  v_is_doubles boolean;
  v_team_size integer;
  v_count integer := 0;
  g jsonb;
  v_slots jsonb[];
  v_keys text[];
  v_slot jsonb;
  v_requester jsonb; v_partner jsonb; v_opponent jsonb; v_opponent2 jsonb;
  v_req_id uuid;
  i integer;
begin
  if p_games is null or jsonb_typeof(p_games) <> 'array' or jsonb_array_length(p_games) > 20 then
    raise exception 'invalid_games';
  end if;
  if jsonb_array_length(p_games) = 0 then return 0; end if;

  select * into v_room from match_rooms where id = p_room_id;
  if not found then raise exception 'room_not_found'; end if;

  v_is_doubles := v_room.match_type <> 'singles';
  v_team_size := case when v_is_doubles then 2 else 1 end;

  for g in select value from jsonb_array_elements(p_games) loop
    if jsonb_typeof(g->'team1') <> 'array' or jsonb_typeof(g->'team2') <> 'array'
       or jsonb_array_length(g->'team1') <> v_team_size
       or jsonb_array_length(g->'team2') <> v_team_size then
      raise exception 'invalid_games';
    end if;

    v_slots := '{}';
    for v_slot in select value from jsonb_array_elements(g->'team1') loop
      v_slots := v_slots || public.resolve_room_player(p_room_id, v_slot);
    end loop;
    for v_slot in select value from jsonb_array_elements(g->'team2') loop
      v_slots := v_slots || public.resolve_room_player(p_room_id, v_slot);
    end loop;

    v_keys := '{}';
    for i in 1 .. array_length(v_slots, 1) loop
      v_keys := v_keys || coalesce(
        'id:' || (v_slots[i]->>'user_id'),
        'name:' || lower(btrim(v_slots[i]->>'name'))
      );
    end loop;
    if array_length(v_keys, 1) <> (select count(distinct k) from unnest(v_keys) k) then
      raise exception 'duplicate_players';
    end if;

    v_requester := null; v_partner := null; v_opponent := null; v_opponent2 := null;
    for i in 1 .. v_team_size loop
      if v_slots[i]->>'user_id' is not null and v_requester is null then
        v_requester := v_slots[i];
      else
        v_partner := v_slots[i];
      end if;
    end loop;
    for i in v_team_size + 1 .. v_team_size * 2 loop
      if v_slots[i]->>'user_id' is not null and v_opponent is null then
        v_opponent := v_slots[i];
      else
        v_opponent2 := v_slots[i];
      end if;
    end loop;
    if v_requester is null or v_opponent is null then raise exception 'invalid_games'; end if;
    if v_is_doubles and (v_partner is null or v_opponent2 is null) then raise exception 'invalid_games'; end if;

    v_req_id := gen_random_uuid();
    insert into match_requests
      (id, requester_id, opponent_user_id, played_at, played_time, match_type, surface,
       notes, set_scores, court_name, room_id, status, responded_at, origin)
    values
      (v_req_id, (v_requester->>'user_id')::uuid, (v_opponent->>'user_id')::uuid,
       v_room.played_at, coalesce(v_room.played_time, '00:00'::time),
       v_room.match_type, coalesce(v_room.surface, 'other'), null, '[]'::jsonb, v_room.court_name,
       p_room_id, 'accepted', now(), 'lineup');

    if v_is_doubles then
      insert into match_request_participants (request_id, role, user_id, name, dominant_hand, ntrp_snapshot)
      values (v_req_id, 'partner', nullif(v_partner->>'user_id', '')::uuid, v_partner->>'name',
              nullif(v_partner->>'dominant_hand', ''), nullif(v_partner->>'ntrp', '')::numeric);
      insert into match_request_participants (request_id, role, user_id, name, dominant_hand, ntrp_snapshot)
      values (v_req_id, 'opponent2', nullif(v_opponent2->>'user_id', '')::uuid, v_opponent2->>'name',
              nullif(v_opponent2->>'dominant_hand', ''), nullif(v_opponent2->>'ntrp', '')::numeric);
    end if;

    perform public.materialize_accepted_request(v_req_id);
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.insert_room_lineup_games(uuid, jsonb) from public, anon, authenticated;

create or replace function public.create_room_lineup(p_room_id uuid, p_games jsonb)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room match_rooms%rowtype;
  v_count integer;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select * into v_room from match_rooms where id = p_room_id for update;
  if not found then raise exception 'room_not_found'; end if;
  if v_room.host_user_id <> v_uid then raise exception 'not_room_host'; end if;
  if v_room.is_settled then raise exception 'room_already_closed'; end if;
  if exists (select 1 from rotation_sessions where room_id = p_room_id) then raise exception 'room_not_ready'; end if;

  if p_games is null or jsonb_typeof(p_games) <> 'array' or jsonb_array_length(p_games) < 1 then
    raise exception 'invalid_games';
  end if;

  v_count := public.insert_room_lineup_games(p_room_id, p_games);
  perform public.recompute_match_room_settled(p_room_id);
  return v_count;
end;
$$;

revoke all on function public.create_room_lineup(uuid, jsonb) from public;
revoke execute on function public.create_room_lineup(uuid, jsonb) from anon;
grant execute on function public.create_room_lineup(uuid, jsonb) to authenticated;

create or replace function public.get_room_lineup_requests(p_room_id uuid)
returns table (game_id uuid, request_id uuid)
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

  return query
    select pm.id, req.id
    from personal_matches pm
    join match_requests req on req.id = pm.source_request_id
    left join match_result_negotiations neg on neg.request_id = req.id
    where pm.room_id = p_room_id
      and not pm.is_perspective
      and req.origin = 'lineup'
      and req.status = 'accepted'
      and jsonb_array_length(pm.set_scores) = 0
      and coalesce(neg.result_status, 'none') = 'none'
    order by pm.created_at;
end;
$$;

revoke all on function public.get_room_lineup_requests(uuid) from public;
revoke execute on function public.get_room_lineup_requests(uuid) from anon;
grant execute on function public.get_room_lineup_requests(uuid) to authenticated;

create or replace function public.replace_room_lineup(
  p_room_id uuid, p_request_ids uuid[], p_games jsonb
)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room match_rooms%rowtype;
  v_ids uuid[] := coalesce(p_request_ids, '{}');
  v_locked integer;
  v_count integer;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select * into v_room from match_rooms where id = p_room_id for update;
  if not found then raise exception 'room_not_found'; end if;
  if v_room.host_user_id <> v_uid then raise exception 'not_room_host'; end if;
  if exists (select 1 from rotation_sessions where room_id = p_room_id) then raise exception 'room_not_ready'; end if;

  select count(*) into v_locked
  from unnest(v_ids) as t(id)
  where not exists (
    select 1
    from match_requests req
    left join match_result_negotiations neg on neg.request_id = req.id
    where req.id = t.id
      and req.room_id = p_room_id
      and req.origin = 'lineup'
      and req.status = 'accepted'
      and jsonb_array_length(req.set_scores) = 0
      and coalesce(neg.result_status, 'none') = 'none'
      and not exists (
        select 1 from personal_matches pm
        where pm.source_request_id = req.id and jsonb_array_length(pm.set_scores) > 0
      )
  );
  if v_locked > 0 then raise exception 'lineup_locked'; end if;

  if array_length(v_ids, 1) is not null then
    delete from personal_matches where source_request_id = any(v_ids);
    delete from match_requests where id = any(v_ids);
  end if;

  v_count := public.insert_room_lineup_games(p_room_id, coalesce(p_games, '[]'::jsonb));
  perform public.recompute_match_room_settled(p_room_id);
  return v_count;
end;
$$;

revoke all on function public.replace_room_lineup(uuid, uuid[], jsonb) from public;
revoke execute on function public.replace_room_lineup(uuid, uuid[], jsonb) from anon;
grant execute on function public.replace_room_lineup(uuid, uuid[], jsonb) to authenticated;
