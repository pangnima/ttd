-- 20260914083733 0083_room_close
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
-- 0083 — 방 닫기: 정산 위에 얹는 잠금 (Week 53). 정본: supabase/migrations/0083_room_close.sql
alter table public.match_rooms
  add column if not exists closed_at timestamptz;

comment on column public.match_rooms.closed_at is
  '방장이 닫은 시각(0083). 정산(is_settled) 위의 잠금 — 있으면 결과 정정·게임 추가·초대·대진 편집·기록 수정이 전부 막힌다. 방장만 다시 열 수 있다. closed ⊆ settled.';

alter table public.match_rooms
  drop constraint if exists match_rooms_closed_requires_settled;
alter table public.match_rooms
  add constraint match_rooms_closed_requires_settled check (closed_at is null or is_settled);

create or replace function public.recompute_match_room_settled(p_room_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_total int;
  v_open int;
  v_settled boolean;
  v_closed_at timestamptz;
begin
  if p_room_id is null then return; end if;
  select closed_at into v_closed_at from match_rooms where id = p_room_id;
  if not found then return; end if;

  select count(*), count(*) filter (where jsonb_array_length(pm.set_scores) = 0)
  into v_total, v_open
  from personal_matches pm
  where pm.room_id = p_room_id and not pm.is_perspective;

  v_settled := (
    v_total > 0 and v_open = 0
    and not exists (select 1 from match_requests r where r.room_id = p_room_id and r.status = 'pending')
    and not exists (select 1 from rotation_sessions s where s.room_id = p_room_id)
  );

  if v_closed_at is not null and not v_settled then
    raise exception 'room_closed';
  end if;

  update match_rooms set is_settled = v_settled where id = p_room_id;
end;
$$;

revoke all on function public.recompute_match_room_settled(uuid) from public, anon, authenticated;

create or replace function public.close_match_room(p_room_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room match_rooms%rowtype;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select * into v_room from match_rooms where id = p_room_id for update;
  if not found then raise exception 'room_not_found'; end if;
  if v_room.host_user_id <> v_uid then raise exception 'not_room_host'; end if;
  if not v_room.is_settled then raise exception 'room_not_settled'; end if;
  if v_room.closed_at is not null then raise exception 'room_closed'; end if;
  update match_rooms set closed_at = now() where id = p_room_id;
end;
$$;

revoke all on function public.close_match_room(uuid) from public;
revoke execute on function public.close_match_room(uuid) from anon;
grant execute on function public.close_match_room(uuid) to authenticated;

comment on function public.close_match_room(uuid) is
  '방장이 정산된 방을 닫는다(0083). 닫힌 방은 결과 정정·게임 추가·초대·대진 편집·기록 수정이 막힌다. 정산되지 않은 방은 room_not_settled.';

create or replace function public.reopen_match_room(p_room_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room match_rooms%rowtype;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select * into v_room from match_rooms where id = p_room_id for update;
  if not found then raise exception 'room_not_found'; end if;
  if v_room.host_user_id <> v_uid then raise exception 'not_room_host'; end if;
  if v_room.closed_at is null then raise exception 'room_not_closed'; end if;
  update match_rooms set closed_at = null where id = p_room_id;
end;
$$;

revoke all on function public.reopen_match_room(uuid) from public;
revoke execute on function public.reopen_match_room(uuid) from anon;
grant execute on function public.reopen_match_room(uuid) to authenticated;

comment on function public.reopen_match_room(uuid) is
  '방장이 닫은 방을 다시 연다(0083) — 잘못 확정한 결과를 [결과 정정]으로 고칠 유일한 탈출구.';

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

  if v_req.room_id is not null and exists (
    select 1 from match_rooms r where r.id = v_req.room_id and r.closed_at is not null
  ) then
    raise exception 'room_closed';
  end if;

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

create or replace function public.replace_room_lineup(
  p_room_id uuid, p_game_ids uuid[], p_games jsonb
)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room match_rooms%rowtype;
  v_ids uuid[] := coalesce(p_game_ids, '{}');
  v_req_ids uuid[];
  v_locked integer;
  v_count integer;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select * into v_room from match_rooms where id = p_room_id for update;
  if not found then raise exception 'room_not_found'; end if;
  if v_room.host_user_id <> v_uid then raise exception 'not_room_host'; end if;
  if v_room.is_settled then raise exception 'room_already_closed'; end if;

  select count(*) into v_locked
  from unnest(v_ids) as t(id)
  where not exists (
    select 1
    from personal_matches pm
    left join match_requests req on req.id = pm.source_request_id
    left join match_result_negotiations neg on neg.request_id = req.id
    where pm.id = t.id
      and pm.room_id = p_room_id
      and not pm.is_perspective
      and jsonb_array_length(pm.set_scores) = 0
      and (
        (pm.source_type = 'confirmation'
           and req.origin = 'lineup'
           and req.status = 'accepted'
           and jsonb_array_length(req.set_scores) = 0
           and coalesce(neg.result_status, 'none') = 'none'
           and not exists (
             select 1 from personal_matches x
             where x.source_request_id = req.id and jsonb_array_length(x.set_scores) > 0
           ))
        or (pm.source_type = 'direct' and pm.origin = 'lineup' and pm.source_request_id is null)
      )
  );
  if v_locked > 0 then raise exception 'lineup_locked'; end if;

  if array_length(v_ids, 1) is not null then
    select array_agg(pm.source_request_id) into v_req_ids
    from personal_matches pm
    where pm.id = any(v_ids) and pm.source_request_id is not null;
    if v_req_ids is not null then
      delete from personal_matches where source_request_id = any(v_req_ids);
      delete from match_requests where id = any(v_req_ids);
    end if;
    delete from personal_matches
    where id = any(v_ids) and source_type = 'direct' and origin = 'lineup';
  end if;

  v_count := public.insert_room_lineup_games(p_room_id, coalesce(p_games, '[]'::jsonb));
  perform public.recompute_match_room_settled(p_room_id);
  return v_count;
end;
$$;

create or replace function public.invite_room_members(p_room_id uuid, p_user_ids uuid[])
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room match_rooms%rowtype;
  v_invited integer := 0;
  v_reinvited integer := 0;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select * into v_room from match_rooms where id = p_room_id;
  if not found then raise exception 'room_not_found'; end if;
  if v_room.is_settled then raise exception 'room_already_closed'; end if;

  if v_room.host_user_id <> v_uid and not exists (
    select 1 from match_room_members m
    where m.room_id = p_room_id and m.user_id = v_uid and m.status = 'joined'
  ) then
    raise exception 'not_room_member';
  end if;

  if p_user_ids is null or array_length(p_user_ids, 1) is null then
    return 0;
  end if;

  with target as (
    select distinct u.id
    from unnest(p_user_ids) as t(id)
    join users u on u.id = t.id
    where u.is_guest = false and u.deleted_at is null and u.id <> v_uid
  ), ins as (
    insert into match_room_members (room_id, user_id, role, status)
    select p_room_id, target.id, 'player', 'invited' from target
    on conflict (room_id, user_id) do nothing
    returning 1
  )
  select count(*) into v_invited from ins;

  if v_room.host_user_id = v_uid then
    update match_room_members
    set status = 'invited', responded_at = null
    where room_id = p_room_id and user_id = any(p_user_ids) and status = 'removed';
    get diagnostics v_reinvited = row_count;
    v_invited := v_invited + v_reinvited;
  end if;

  return v_invited;
end;
$$;

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
  if v_room.closed_at is not null then raise exception 'room_closed'; end if;

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

create or replace function public.enter_match_room(p_room_id uuid, p_password text)
returns void
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_room match_rooms%rowtype;
  v_hash text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select * into v_room from match_rooms where id = p_room_id;
  if not found then raise exception 'room_not_found'; end if;
  if not v_room.is_listed then raise exception 'room_not_listed'; end if;
  if v_room.closed_at is not null then raise exception 'room_closed'; end if;
  select s.password_hash into v_hash from match_room_secrets s where s.room_id = p_room_id;
  if not found then raise exception 'room_not_found'; end if;
  if crypt(coalesce(p_password, ''), v_hash) <> v_hash then raise exception 'wrong_password'; end if;
  perform public.join_match_room_as_player(p_room_id, v_uid);
end;
$$;

drop policy if exists personal_matches_update on public.personal_matches;
create policy personal_matches_update on public.personal_matches
  for update using (
    user_id = auth.uid()
    and not exists (select 1 from public.match_rooms r where r.id = room_id and r.closed_at is not null)
  )
  with check (
    user_id = auth.uid()
    and (room_id is null or public.is_room_participant(room_id))
  );

drop policy if exists personal_matches_delete on public.personal_matches;
create policy personal_matches_delete on public.personal_matches
  for delete using (
    user_id = auth.uid()
    and not exists (select 1 from public.match_rooms r where r.id = room_id and r.closed_at is not null)
  );

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
  v_guests jsonb;
  v_games jsonb;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select * into v_room from match_rooms where id = p_room_id;
  if not found then raise exception 'room_not_found'; end if;
  select * into v_viewer from match_room_members where room_id = p_room_id and user_id = v_uid;
  if v_room.host_user_id <> v_uid and (not found or v_viewer.status in ('declined', 'removed')) then
    raise exception 'not_member';
  end if;
  select * into v_host from users where id = v_room.host_user_id;

  select coalesce(jsonb_agg(jsonb_build_object(
      'userId', m.user_id, 'name', u.name, 'nickname', u.nickname, 'profileImage', u.profile_image,
      'deleted', u.deleted_at is not null, 'role', m.role, 'status', m.status, 'sourceRole', m.source_role,
      'ntrp', public.derive_public_ntrp(u),
      'hand', u.dominant_hand,
      'racketBrand', u.racket_brand,
      'racketModel', u.racket_model
    ) order by (m.role = 'host') desc, (m.status = 'joined') desc, m.created_at), '[]'::jsonb)
  into v_members
  from match_room_members m join users u on u.id = m.user_id
  where m.room_id = p_room_id;

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', g.id, 'name', g.name, 'hand', g.dominant_hand, 'ntrp', g.ntrp,
      'gender', g.gender, 'createdBy', g.created_by
    ) order by g.created_at), '[]'::jsonb)
  into v_guests
  from match_room_guests g where g.room_id = p_room_id;

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
      'durationMinutes', v_room.duration_minutes, 'courtCount', v_room.court_count,
      'slotMinutes', v_room.slot_minutes,
      'isListed', v_room.is_listed,
      'closedAt', v_room.closed_at,
      'isSettled', v_room.is_settled, 'createdAt', v_room.created_at
    ),
    'host', jsonb_build_object(
      'id', v_host.id, 'name', v_host.name, 'nickname', v_host.nickname,
      'profileImage', v_host.profile_image, 'deleted', v_host.deleted_at is not null
    ),
    'viewer', case when v_viewer.id is null then null
      else jsonb_build_object('role', v_viewer.role, 'status', v_viewer.status) end,
    'members', v_members,
    'guests', v_guests,
    'source', v_source,
    'games', v_games
  );
end;
$$;
