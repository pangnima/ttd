-- 0088: 방별 게임 총계 RPC + 거절한 초대의 호스트 재초대 (F-21 · F-22, Week 63)
--
-- F-21 — 호스트의 「게임 입력 종료」 차례가 목록·뱃지에서 빠지던 결함.
--   `closeRotationRooms`(room-turn.ts)는 방의 대표 게임이 전부 확정됐는지를 본다. 그 재료를 앱이
--   `personal_matches`를 직접 세어 만들었는데, SELECT 정책은 `user_id = auth.uid()`라 호스트가 requester가
--   아닌 게임(0076: 대표 행은 team1[0] 소유)은 호스트 눈에 아예 없다 → 총계가 실제보다 작아 "전부 확정"이
--   조기에 참이 되거나 0/0으로 비어 차례가 사라진다. 대표 행의 숫자만 돌려주는 definer RPC로 바꾼다
--   (`get_club_member_counts` 0019 관용구). 참가자가 아닌 방은 돌려주지 않는다(`is_room_participant`).
--   설정 술어는 `recompute_match_room_settled`(0083)와 같은 `jsonb_array_length(set_scores) > 0`.
--
-- F-22 — 비노출 방(0082)에서 초대를 [거절]한 회원은 다시 들어올 길이 없었다.
--   `invite_room_members`가 declined 행을 `on conflict do nothing`으로 두고, 호스트 전용 복귀는
--   removed → invited뿐이었다. 비노출 방은 비밀번호 입장이 `room_not_listed`라 영구 차단이다.
--   복귀 조건을 `status in ('removed', 'declined')`로 넓힌다 — 호스트만, 정산 가드는 그대로.
--   본문은 **0083의 것을 그대로 옮겨 적었다**(0075·0078의 함정 — 옛 정의를 복사하면 지운 가드가 되살아난다).

-- 1) room_game_tallies
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

-- 2) invite_room_members (0083 §4c 본문 + declined 복귀)
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
