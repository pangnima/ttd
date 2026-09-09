-- 0068_room_member_kick.sql — 방장 강퇴 (Week 41)
--
-- 방장이 잘못 들어온 사람이나 노쇼를 내보낼 방법이 없었다. match_room_members에는
-- UPDATE/DELETE RLS 정책이 처음부터 없으므로(0046 §RLS) 강퇴는 SECURITY DEFINER RPC 전용이다.
--
-- ── 'removed'의 정의: 읽기는 남고 참가만 끊긴다 ──
-- get_match_room_detail의 게이트(`not found or status='declined'`)는 **손대지 않는다**.
-- 결과 확인 UI(RoomGameActions)는 매칭 룸 상세 안에만 있고, Week 39의 "미확정 행이 놓이는 자리는
-- room_id가 가른다"는 규칙 때문에 /me/personal-matches는 room_id가 null인 행만 그린다.
-- 상세까지 막으면 강퇴당한 사람은 확인 버튼이 있는 화면에 영영 도달할 수 없고, 그 게임은
-- 영영 확정되지 않는다 — 방까지 정산 불가가 된다. 그래서 막는 곳은 입장·참가 경로뿐이다.
--
-- 앱의 자격 판정이 전부 status='joined' 비교이므로(is_room_participant·isMember·목록 쿼리)
-- removed는 자동으로 읽기 전용이 된다. 협상 자격은 좌석 축(request_seat_of)이라 그대로 살아 있다.
--
-- declined(본인이 나감)와 구분하는 이유는 둘: 나간 사람은 비밀번호로 돌아올 수 있지만 강퇴당한
-- 사람은 못 돌아온다, 그리고 명단에 '강퇴됨'으로 남아야 방장이 누구를 뺐는지 볼 수 있다
-- (members-view의 memberStatusLabel이 declined를 명단에서 아예 제외한다).

-- ── 1) status에 'removed' 추가 ──
--- 새 제약은 구 제약의 상위집합이라 기존 행이 위반할 수 없다(적용 시점 전 행은 전부 joined).
alter table public.match_room_members drop constraint match_room_members_status_check;
alter table public.match_room_members
  add constraint match_room_members_status_check
  check (status in ('invited','joined','declined','removed'));

-- ── 2) kick_room_member — 방장이 참가자를 내보낸다 ──
--- leave_match_room(0054 §2)의 골격을 그대로 쓰되 자격을 방장으로 좁히고 대상을 파라미터로 받는다.
--- match_requests·personal_matches는 건드리지 않는다: 이미 함께 뛴 경기의 기록과 그 결과를
--- 확인·이의할 권한은 남긴다(끊으면 그 게임이 영영 확정되지 않는다). 따라서 정산 재계산도 없다.
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
  -- 방장 자신을 지정한 경우도 여기로 접힌다 (방을 없애려면 '매칭 리스트에서 내리기')
  if v_m.role = 'host' then raise exception 'cannot_kick_host'; end if;
  -- 멱등 — 목록이 낡아 두 번 눌러도, 두 창에서 동시에 눌러도 무해해야 한다
  if v_m.status = 'removed' then return; end if;

  update match_room_members
  set status = 'removed', responded_at = now()
  where id = v_m.id;

  -- 미확정 로테이션 방이면 선수 풀에서도 뺀다. players를 갱신하면 트리거
  -- sync_rotation_session_participants(0057)가 좌석을 알아서 정리한다(rejected는 보존).
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

-- ── 3) join_match_room_as_player — 강퇴자의 재입장 차단 (0056 §10 대체) ──
--- ⚠ 이 함수의 정본은 0050이 아니라 0056 §10이다. 0050 본문을 복사하면 Week 29에 붙인
---   "방 입장 = 그 방 pending 요청의 내 좌석 수락" 루프가 조용히 사라진다. 아래는 0056 본문 +
---   removed 가드 한 블록이다.
--- 조용히 0행으로 넘기지 않고 예외를 던지는 이유: 비밀번호가 맞았는데 아무 일도 일어나지 않으면
---   사용자가 원인을 알 수 없다. enter_match_room 트랜잭션을 통째로 되돌리고 앱이 문구로 번역한다.
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
  -- 방장은 이미 host·joined
  if v_room.host_user_id = p_user_id then return; end if;

  -- 강퇴당한 사람은 비밀번호를 알아도, 초대 수락으로도 돌아오지 못한다 (0068)
  select status into v_status from match_room_members
  where room_id = p_room_id and user_id = p_user_id;
  if v_status = 'removed' then raise exception 'room_member_removed'; end if;

  -- 초대 대기·거절 상태였더라도 비밀번호를 알고 들어왔으면 참가로 확정 (host 행은 건드리지 않는다)
  insert into match_room_members (room_id, user_id, role, status, responded_at)
  values (p_room_id, p_user_id, 'player', 'joined', now())
  on conflict (room_id, user_id) do update
    set role = 'player', status = 'joined', responded_at = now()
    where match_room_members.role <> 'host';

  -- 이 방의 대기 중인 요청에서 내 참가자 자리를 수락 처리한다(입장 = 참여 동의).
  -- auth.uid()를 쓰지 않는다 — 이 헬퍼는 초대 수락 등 다른 주체를 대신해서도 불린다.
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

  -- 미확정 로테이션 방이면 세션 풀에도 추가
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

-- ── 4) leave_match_room — 강퇴 우회 차단 (0054 §2 대체) ──
--- 그대로 두면 강퇴당한 사람이 '방 나가기'를 눌러 removed → declined로 바꾼 뒤
--- 비밀번호로 재입장할 수 있다(declined → joined upsert). 강퇴가 통째로 무효화된다.
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
  -- 방장은 나갈 수 없다 — 방을 없애려면 '매칭 리스트에서 내리기'를 쓴다
  if v_room.host_user_id = v_uid then raise exception 'host_cannot_leave'; end if;

  update match_room_members
  set status = 'declined', responded_at = now()
  where room_id = p_room_id and user_id = v_uid and role <> 'host'
    and status <> 'removed';
  get diagnostics v_rows = row_count;
  if v_rows = 0 then raise exception 'not_room_member'; end if;

  -- 미확정 로테이션 방이면 선수 풀에서도 뺀다 (join_match_room_as_player의 append와 대칭)
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

-- ── 5) invite_room_members — 재초대가 강퇴를 푼다 (0065 §1 대체) ──
--- 본문은 0065 그대로(on conflict do nothing = joined/declined 강등 금지)이고,
--- 뒤에 방장 전용 한 문장을 덧붙였다. 강퇴는 방장의 결정이므로 참가자의 초대가 그것을
--- 무효화하면 안 된다 — 0060의 '로테이션 removed → 재초대 시 pending 복귀'와 같은 정신이다.
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

  -- 강퇴 해제는 방장만 (0068)
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

-- ── 6) 강퇴가 조용히 풀리는 것을 막는 안전망 ──
--- accept_match_request·materialize_accepted_request(0056)의 upsert는 방 멤버 상태를 무조건
--- 'joined'로 덮는다. 지금은 방 안 요청이 전부 status='accepted'로 만들어져 도달 경로가 없지만
--- (create_room_game·create_room_lineup), 레거시 pending 요청이 남아 있으면 강퇴가 풀린다.
--- 두 함수를 통째로 복사해 고치는 대신(본문 유실이 더 큰 위험이다) 한 지점에서 막는다.
--- 명시적 안내가 필요한 입장 경로는 §3이 예외를 던지므로, 여기는 조용한 안전망이면 된다.
create or replace function public.keep_removed_room_member()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  -- 강퇴는 재초대('invited')로만 풀린다
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
