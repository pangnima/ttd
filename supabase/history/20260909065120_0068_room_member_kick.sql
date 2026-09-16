-- 20260909065120 0068_room_member_kick
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
alter table public.match_room_members drop constraint match_room_members_status_check;
alter table public.match_room_members
  add constraint match_room_members_status_check
  check (status in ('invited','joined','declined','removed'));

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

comment on function public.kick_room_member(uuid, uuid) is
  '방장이 참가자를 내보낸다(0068). 비밀번호를 알아도 재입장할 수 없고 방장의 재초대로만 풀린다. 이미 등록된 경기와 결과 확인 권한은 남는다.';

create or replace function public.join_match_room_as_player(p_room_id uuid, p_user_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_room match_rooms%rowtype;
  v_s rotation_sessions%rowtype;
  v_u users%rowtype;
  v_ntrp numeric;
  v_req_id uuid;
  v_status text;
begin
  select * into v_room from match_rooms where id = p_room_id;
  if not found then raise exception 'room_not_found'; end if;
  if v_room.host_user_id = p_user_id then return; end if;

  select status into v_status from match_room_members
  where room_id = p_room_id and user_id = p_user_id;
  if v_status = 'removed' then raise exception 'room_member_removed'; end if;

  insert into match_room_members (room_id, user_id, role, status, responded_at)
  values (p_room_id, p_user_id, 'player', 'joined', now())
  on conflict (room_id, user_id) do update
    set role = 'player', status = 'joined', responded_at = now()
    where match_room_members.role <> 'host';

  for v_req_id in
    select r.id from match_requests r
    join match_request_participants p on p.request_id = r.id
    where r.room_id = p_room_id and r.status = 'pending'
      and p.user_id = p_user_id and p.participation_status = 'pending'
  loop
    update match_request_participants
    set participation_status = 'accepted', responded_at = now()
    where request_id = v_req_id and user_id = p_user_id and participation_status = 'pending';
    perform public.maybe_materialize_request(v_req_id);
  end loop;

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

revoke all on function public.invite_room_members(uuid, uuid[]) from public;
revoke execute on function public.invite_room_members(uuid, uuid[]) from anon;
grant execute on function public.invite_room_members(uuid, uuid[]) to authenticated;

comment on function public.invite_room_members(uuid, uuid[]) is
  '방장·참가자가 회원을 방에 초대한다(0065). 초대받은 사람은 respond_room_invite로 비밀번호 없이 참가한다. 강퇴 해제는 방장만 할 수 있다(0068).';

create or replace function public.keep_removed_room_member()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.status not in ('removed', 'invited') then
    new.status := 'removed';
    new.role := old.role;
  end if;
  return new;
end;
$$;

revoke all on function public.keep_removed_room_member() from public, anon, authenticated;

drop trigger if exists keep_removed_room_member on public.match_room_members;
create trigger keep_removed_room_member
  before update on public.match_room_members
  for each row when (old.status = 'removed')
  execute function public.keep_removed_room_member();
