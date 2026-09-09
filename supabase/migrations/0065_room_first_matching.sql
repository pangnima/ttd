-- 0065_room_first_matching.sql
--
-- Week 39 — 「매칭 만들기」가 방을 1급 객체로 만든다.
--
-- 배경: 0046~0064까지 방(match_rooms)은 언제나 "이미 저장한 기록을 리스트에 노출"하는 부산물이었다.
-- 그래서 invited 행을 만드는 길이 두 개뿐이었다 —
--   ① create_match_room 내부의 출처 파생(기록에 이름이 적힌 회원)
--   ② 트리거 invite_room_member_from_participant(참가자 행 INSERT)
-- 둘 다 "기록에 사람을 적는다"가 선행 조건이라, 참가자를 비운 채 방부터 만들고
-- 상대를 지목해 초대하는 새 흐름에는 쓸 수 없다.
--
-- 이 마이그레이션은 그 빈 자리를 메우는 RPC 하나만 추가한다. 기존 경로·정책·트리거는 건드리지 않는다.

-- ── 1) invite_room_members — 방에 회원을 명시적으로 초대 ──
--
-- 권한: 방장 또는 이미 참가한(status='joined') 회원. 방 게임 등록(create_room_game)이
--       is_room_participant를 쓰는 것과 같은 눈높이다 — 방에 들어와 있으면 사람을 부를 수 있다.
-- 멱등: (room_id, user_id) 유니크에 on conflict do nothing. 이미 joined/declined인 사람의 상태를
--       초대로 되돌리지 않는다(강등 금지). 거절한 사람의 재초대는 별건이라 여기서 하지 않는다.
-- 조용한 제외: 게스트·탈퇴 회원·본인·존재하지 않는 id는 에러 없이 건너뛴다. 초대 명단은 UI가
--       고른 결과라 개별 실패로 전체를 되돌릴 이유가 없다.
create or replace function public.invite_room_members(p_room_id uuid, p_user_ids uuid[])
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room match_rooms%rowtype;
  v_invited integer := 0;
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

  return v_invited;
end;
$$;

revoke all on function public.invite_room_members(uuid, uuid[]) from public;
revoke execute on function public.invite_room_members(uuid, uuid[]) from anon;
grant execute on function public.invite_room_members(uuid, uuid[]) to authenticated;

comment on function public.invite_room_members(uuid, uuid[]) is
  '방장·참가자가 회원을 방에 초대한다(0065). 초대받은 사람은 respond_room_invite로 비밀번호 없이 참가한다.';
