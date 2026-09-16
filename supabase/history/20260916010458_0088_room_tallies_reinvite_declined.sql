-- 20260916010458 0088_room_tallies_reinvite_declined
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
create or replace function public.room_game_tallies(p_room_ids uuid[])
returns table(room_id uuid, total integer, settled integer)
language sql
security definer
stable
set search_path = public
as $$
  select pm.room_id,
         count(*)::int as total,
         count(*) filter (where jsonb_array_length(pm.set_scores) > 0)::int as settled
  from public.personal_matches pm
  where pm.room_id = any(p_room_ids)
    and not pm.is_perspective
    and public.is_room_participant(pm.room_id)
  group by pm.room_id;
$$;

revoke all on function public.room_game_tallies(uuid[]) from public, anon;
grant execute on function public.room_game_tallies(uuid[]) to authenticated;

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

  -- 호스트만 내보낸 사람(removed)과 나간 사람(declined)을 다시 부른다(0088). 참가자가 부르면 그대로다.
  if v_room.host_user_id = v_uid then
    update match_room_members
    set status = 'invited', responded_at = null
    where room_id = p_room_id and user_id = any(p_user_ids) and status in ('removed', 'declined');
    get diagnostics v_reinvited = row_count;
    v_invited := v_invited + v_reinvited;
  end if;

  return v_invited;
end;
$$;
