-- 0048_room_open_join.sql
--- 경기 방을 "정원 없는 모임"으로 재정의한다.
---  - 비밀번호를 알고 들어온 회원은 그 자체로 참가자(player·joined)다. 열람 전용(viewer) 역할과 로테이션 풀 합류 신청
---    (requested → 방장 승인)은 폐지한다. 미확정 로테이션 방이면 입장 즉시 세션 풀(rotation_sessions.players)에 추가된다.
---  - 정원(match_rooms.capacity)은 없다. 단식 방에 4명이 들어와 단식을 돌아가며 칠 수도, 복식 방에 6명이 들어올 수도 있다.
---  - 방장은 들어온 참가자로 게임을 여러 건 구성한다(등록 폼이 room_id를 붙여 personal_matches를 추가). 따라서 한 방에
---    방장 자유 기록이 여러 건 매달릴 수 있고, 게임 1건을 지워도 방은 남아야 한다 — 마지막 참조 행이 사라질 때만 방을 지운다.
---
--- 불변식 유지: "세트가 있는 기록은 라인업이 완성돼 있다"(0047)는 그대로다. 방 참가자 명단(match_room_members)과
--- 게임 라인업(personal_match_participants)은 별개 축이며, 명단은 게임 구성의 후보일 뿐 통계에 들어가지 않는다.

-- ── 1) 참가 헬퍼 — enter_match_room·백필이 공유. 외부 호출 금지(권한 전부 회수) ──
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
  -- 방장은 이미 host·joined
  if v_room.host_user_id = p_user_id then return; end if;

  -- 초대 대기·거절 상태였더라도 비밀번호를 알고 들어왔으면 참가로 확정 (host 행은 건드리지 않는다)
  insert into match_room_members (room_id, user_id, role, status, responded_at)
  values (p_room_id, p_user_id, 'player', 'joined', now())
  on conflict (room_id, user_id) do update
    set role = 'player', status = 'joined', responded_at = now()
    where match_room_members.role <> 'host';

  -- 미확정 로테이션 방이면 세션 풀에도 추가 (0047 approve_room_join 이관 — 풀 전원 NTRP 필수 규칙)
  select * into v_s from rotation_sessions where room_id = p_room_id for update;
  if not found then return; end if;
  if exists (select 1 from jsonb_array_elements(v_s.players) e where e->>'userId' = p_user_id::text) then return; end if;

  select * into v_u from users where id = p_user_id and is_guest = false and deleted_at is null;
  if not found then raise exception 'user_not_found'; end if;
  v_ntrp := coalesce(public.derive_public_ntrp(v_u), v_u.ntrp);
  if v_ntrp is null then raise exception 'ntrp_missing'; end if;

  update rotation_sessions
  set players = players || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
    'userId', v_u.id, 'name', v_u.name, 'hand', v_u.dominant_hand, 'ntrp', v_ntrp
  )))
  where id = v_s.id;
  update match_room_members set source_role = 'pool' where room_id = p_room_id and user_id = p_user_id;
end;
$$;

revoke all on function public.join_match_room_as_player(uuid, uuid) from public, anon, authenticated;

-- ── 2) enter_match_room — 비밀번호 검증 후 참가 ──
create or replace function public.enter_match_room(p_room_id uuid, p_password text)
returns void
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_hash text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select s.password_hash into v_hash from match_room_secrets s where s.room_id = p_room_id;
  if not found then raise exception 'room_not_found'; end if;
  if crypt(coalesce(p_password, ''), v_hash) <> v_hash then raise exception 'wrong_password'; end if;
  perform public.join_match_room_as_player(p_room_id, v_uid);
end;
$$;

revoke all on function public.enter_match_room(uuid, text) from public;
revoke execute on function public.enter_match_room(uuid, text) from anon;
grant execute on function public.enter_match_room(uuid, text) to authenticated;

-- ── 3) 합류 신청 RPC 폐지 ──
drop function if exists public.request_room_join(uuid);
drop function if exists public.approve_room_join(uuid, uuid);
drop function if exists public.reject_room_join(uuid, uuid);

-- ── 4) 백필 — 열람자·합류 신청자를 참가자로 승격한 뒤 role/status 값을 축소 ──
--- 로테이션 풀 append가 실패하는 행(NTRP 없음 등)은 명단만 참가로 바꾼다.
do $$
declare r record;
begin
  for r in select room_id, user_id from match_room_members where status = 'requested' or role = 'viewer' loop
    begin
      perform public.join_match_room_as_player(r.room_id, r.user_id);
    exception when others then
      update match_room_members
      set role = 'player', status = 'joined', responded_at = coalesce(responded_at, now())
      where room_id = r.room_id and user_id = r.user_id;
    end;
  end loop;
end $$;

alter table public.match_room_members drop constraint match_room_members_role_check;
alter table public.match_room_members
  add constraint match_room_members_role_check check (role in ('host','player'));
alter table public.match_room_members drop constraint match_room_members_status_check;
alter table public.match_room_members
  add constraint match_room_members_status_check check (status in ('invited','joined','declined'));

-- ── 5) capacity 제거 — 의존 함수부터 재정의 ──
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
  v_has_result boolean := false;
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
    v_has_result := jsonb_array_length(v_pm.set_scores) > 0;
  elsif p_source_kind = 'confirmation' then
    select * into v_req from match_requests where id = p_source_id and requester_id = v_uid for update;
    if not found or v_req.status <> 'pending' then raise exception 'source_not_found'; end if;
    if v_req.room_id is not null then raise exception 'already_listed'; end if;
    v_played_at := v_req.played_at; v_played_time := v_req.played_time; v_match_type := v_req.match_type;
    v_surface := v_req.surface; v_court_name := v_req.court_name; v_notes := v_req.notes;
  elsif p_source_kind = 'rotation' then
    select * into v_s from rotation_sessions where id = p_source_id and user_id = v_uid for update;
    if not found then raise exception 'source_not_found'; end if;
    if v_s.room_id is not null then raise exception 'already_listed'; end if;
    v_played_at := v_s.played_at; v_played_time := v_s.played_time; v_match_type := v_s.match_type;
    v_surface := v_s.surface; v_court_name := v_s.court_name; v_notes := v_s.notes;
  else
    raise exception 'invalid_source_kind';
  end if;

  insert into match_rooms (id, host_user_id, source_kind, played_at, played_time, match_type, surface, court_name, notes, has_result)
  values (v_room, v_uid, p_source_kind, v_played_at, v_played_time, v_match_type, v_surface, v_court_name, v_notes, v_has_result);
  insert into match_room_secrets (room_id, password_hash) values (v_room, crypt(p_password, gen_salt('bf')));
  insert into match_room_members (room_id, user_id, role, status) values (v_room, v_uid, 'host', 'joined');

  -- 초대: 기록에 입력된 회원 (게스트·탈퇴·본인 제외). 확인 요청 대표는 accept가 참가 처리하므로 제외.
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

--- 메타 복사(direct만) + has_result. 방 게임 추가 폼은 메타를 방 값으로 고정하므로 여러 행이 있어도 드리프트가 없다.
create or replace function public.sync_match_room_from_personal_match()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.source_type = 'direct' then
    update match_rooms r
    set played_at = new.played_at, played_time = new.played_time, match_type = new.match_type,
        surface = new.surface, court_name = new.court_name, notes = new.notes
    where r.id = new.room_id and r.host_user_id = new.user_id;
  end if;
  update match_rooms r
  set has_result = exists (
    select 1 from personal_matches pm
    where pm.room_id = r.id and pm.user_id = r.host_user_id and jsonb_array_length(pm.set_scores) > 0
  )
  where r.id = new.room_id and r.host_user_id = new.user_id;
  return null;
end;
$$;

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
    select * into v_req from match_requests where room_id = p_room_id;
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
      'pool', case when found then v_s.players else null end
    );
  else
    v_source := jsonb_build_object('kind', 'direct');
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', pm.id, 'groupSeq', pm.group_seq, 'matchType', pm.match_type, 'setScores', pm.set_scores,
      'participants', (
        select coalesce(jsonb_agg(jsonb_build_object('role', p.role, 'name', p.name, 'userId', p.user_id) order by p.role), '[]'::jsonb)
        from personal_match_participants p where p.match_id = pm.id
      )
    ) order by pm.group_seq nulls first, pm.created_at), '[]'::jsonb)
  into v_games
  from personal_matches pm
  where pm.room_id = p_room_id and pm.user_id = v_room.host_user_id;

  return jsonb_build_object(
    'room', jsonb_build_object(
      'id', v_room.id, 'hostUserId', v_room.host_user_id, 'sourceKind', v_room.source_kind,
      'playedAt', v_room.played_at, 'playedTime', v_room.played_time, 'matchType', v_room.match_type,
      'surface', v_room.surface, 'courtName', v_room.court_name, 'notes', v_room.notes,
      'hasResult', v_room.has_result, 'createdAt', v_room.created_at
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

alter table public.match_rooms drop column capacity;

-- ── 6) 자유 기록 삭제 → 방을 참조하는 행이 더 없을 때만 방 삭제 (게임 다건) ──
create or replace function public.cleanup_match_room_on_personal_match_delete()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if exists (select 1 from personal_matches where room_id = old.room_id and id <> old.id)
     or exists (select 1 from rotation_sessions where room_id = old.room_id)
     or exists (select 1 from match_requests where room_id = old.room_id) then
    return null;
  end if;
  delete from match_rooms where id = old.room_id and host_user_id = old.user_id;
  return null;
end;
$$;

-- ── 7) 참가자 INSERT 트리거 — 비밀번호로 먼저 들어온 참가자를 방장이 슬롯에 넣어도 강등하지 않는다 ──
--- 이미 player·joined면 어느 슬롯인지(source_role)만 갱신. 초대 대기·거절 상태는 그대로 둔다.
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
    set source_role = excluded.source_role
    where match_room_members.role = 'player' and match_room_members.status = 'joined';
  return null;
end;
$$;

revoke all on function public.invite_room_member_from_participant() from public, anon, authenticated;
