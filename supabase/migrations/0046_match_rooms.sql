-- 0046_match_rooms.sql
--- 경기 리스트(경기 방). 개인 경기 등록 폼에서 '리스트에 노출'을 켜면 그 기록 1건이 방(match_rooms) 1개가 되어
--- 로그인 회원 전원에게 공개 메타(일시·코트명·경기 타입·방장·인원)가 보이고, 비밀번호를 아는 회원만 상세에 입장한다.
--- 기록에 입력된 회원(단식 상대·복식 파트너/상대2·로테이션 풀)은 방에 '초대됨'으로 등록되고 수락하면 참가자가 된다.
--- 확인 요청 대표(match_requests.opponent_user_id)는 초대 행을 만들지 않고 accept_match_request가 곧바로 참가 처리한다.
---
--- 저장 모델: 등록 산출물이 3종(personal_matches / match_requests / rotation_sessions)이라 방이 다형성 source_id를 갖는
--- 대신 출처 테이블 쪽에 nullable room_id FK(on delete set null)를 둔다(0039~0041 재설계 원칙 — 다형성 컬럼·UNION 회피).
--- 방은 공개 메타를 자체 보관하므로 목록은 match_rooms 단일 SELECT로 끝난다. 메타 드리프트는 수정 가능한 출처가
--- 자유 기록(direct)뿐이므로 personal_matches 트리거가 방으로 복사한다(has_result도 같은 트리거).
---
--- 생성 순서: 출처를 먼저 저장한 뒤 create_match_room(kind, source_id, password)가 출처 행에서 메타·초대 대상·정원을
--- 서버에서 파생한다 — 클라이언트가 메타/초대자를 보내지 않아 위조 불가, 실패 시 보상 삭제 불필요.
---
--- 비밀번호: match_rooms는 전원 SELECT라 해시를 같은 행에 둘 수 없어 match_room_secrets(RLS on, 정책 0개)로 분리하고,
--- 해시 생성·검증은 SECURITY DEFINER RPC 안에서 pgcrypto(extensions 스키마)로만 한다.
---
--- 트리거는 모두 "방의 host = 행 소유자" 조건을 걸어, 클라이언트가 자기 행의 room_id를 남의 방으로 바꿔도
--- 남의 방이 갱신·삭제되지 않게 한다. personal_matches insert/update·rotation_sessions insert 정책도 host 소유 방만 허용.
---
--- accept_match_request는 0045 §1, finalize_rotation_session은 0045 §3 본문에 room_id 관련 줄만 더한 것이다.

-- ── 1) 테이블 ──
create table public.match_rooms (
  id uuid primary key default gen_random_uuid(),
  host_user_id uuid not null references public.users(id) on delete cascade,
  source_kind text not null check (source_kind in ('direct','confirmation','rotation')),
  played_at date not null,
  played_time time,
  match_type text not null check (match_type in ('singles','men_doubles','women_doubles','mixed_doubles')),
  surface text check (surface in ('hard','clay','grass','other')),
  court_name text check (char_length(court_name) <= 40),
  notes text,
  -- 정원: 단식 2 / 페어 복식 4 / 로테이션 1+풀 인원(합류 승인 시 +1)
  capacity int not null check (capacity >= 2),
  -- 방장 기록에 게임 스코어가 있으면 true (personal_matches 트리거가 유지)
  has_result boolean not null default false,
  created_at timestamptz not null default now()
);
create index match_rooms_played_idx on public.match_rooms(played_at, played_time);
create index match_rooms_host_idx on public.match_rooms(host_user_id);

create table public.match_room_secrets (
  room_id uuid primary key references public.match_rooms(id) on delete cascade,
  password_hash text not null
);

create table public.match_room_members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.match_rooms(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('host','player','viewer')),
  -- invited → joined|declined (초대 응답) / 비밀번호 입장 = viewer·joined / 풀 합류 신청 = viewer·requested → 승인 player·joined
  status text not null check (status in ('invited','joined','declined','requested')),
  source_role text check (source_role in ('opponent','partner','opponent2','pool')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (room_id, user_id)
);
create index match_room_members_user_idx on public.match_room_members(user_id, status);
create index match_room_members_room_idx on public.match_room_members(room_id);

alter table public.personal_matches
  add column room_id uuid references public.match_rooms(id) on delete set null;
alter table public.match_requests
  add column room_id uuid references public.match_rooms(id) on delete set null;
alter table public.rotation_sessions
  add column room_id uuid references public.match_rooms(id) on delete set null;
create index personal_matches_room_idx on public.personal_matches(room_id) where room_id is not null;
create index match_requests_room_idx on public.match_requests(room_id) where room_id is not null;
create index rotation_sessions_room_idx on public.rotation_sessions(room_id) where room_id is not null;

-- ── 2) RLS ──
alter table public.match_rooms enable row level security;
alter table public.match_room_secrets enable row level security;
alter table public.match_room_members enable row level security;

-- 공개 메타는 로그인 회원 전원 조회. 생성/수정은 RPC·트리거 전용, 삭제('리스트에서 내리기')는 방장.
create policy match_rooms_select on public.match_rooms
  for select to authenticated using (true);
create policy match_rooms_delete on public.match_rooms
  for delete using (host_user_id = auth.uid());

-- 멤버 행은 user_id·역할·상태만 담으므로 전원 조회(인원 집계·내 상태 표시). 이름·프로필은 get_match_room_detail이 게이트.
create policy match_room_members_select on public.match_room_members
  for select to authenticated using (true);
-- match_room_secrets: 정책 없음 — SECURITY DEFINER RPC만 접근.

-- 출처 행이 가리킬 수 있는 방은 본인이 방장인 방뿐 (finalize는 security invoker라 이 정책을 탄다)
drop policy personal_matches_insert on public.personal_matches;
create policy personal_matches_insert on public.personal_matches
  for insert with check (
    user_id = auth.uid()
    and (room_id is null or exists (select 1 from public.match_rooms r where r.id = room_id and r.host_user_id = auth.uid()))
  );
drop policy personal_matches_update on public.personal_matches;
create policy personal_matches_update on public.personal_matches
  for update using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (room_id is null or exists (select 1 from public.match_rooms r where r.id = room_id and r.host_user_id = auth.uid()))
  );
drop policy rotation_sessions_insert on public.rotation_sessions;
create policy rotation_sessions_insert on public.rotation_sessions
  for insert with check (
    user_id = auth.uid()
    and (room_id is null or exists (select 1 from public.match_rooms r where r.id = room_id and r.host_user_id = auth.uid()))
  );

-- ── 3) 트리거 — 방 메타·결과 동기화, 출처 소멸 시 방 정리 ──
create or replace function public.sync_match_room_from_personal_match()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  -- 자유 기록만 수정 가능하므로 메타는 direct에서만 복사 (확인 경기는 잠금, 로테이션 게임은 세션 값 상속)
  if new.source_type = 'direct' then
    update match_rooms r
    set played_at = new.played_at, played_time = new.played_time, match_type = new.match_type,
        surface = new.surface, court_name = new.court_name, notes = new.notes,
        capacity = case when new.match_type = 'singles' then 2 else 4 end
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

create trigger personal_matches_sync_room
  after insert or update on public.personal_matches
  for each row when (new.room_id is not null)
  execute function public.sync_match_room_from_personal_match();

create or replace function public.cleanup_match_room_on_personal_match_delete()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  delete from match_rooms where id = old.room_id and host_user_id = old.user_id;
  return null;
end;
$$;

-- 자유 기록 삭제 → 방 삭제 (로테이션 게임 1건 삭제는 방 유지)
create trigger personal_matches_cleanup_room
  after delete on public.personal_matches
  for each row when (old.room_id is not null and old.source_type = 'direct')
  execute function public.cleanup_match_room_on_personal_match_delete();

create or replace function public.cleanup_match_room_on_request_close()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  delete from match_rooms where id = new.room_id and host_user_id = new.requester_id;
  return null;
end;
$$;

-- 확인 요청 거절/취소 → 수락 전엔 기록이 없으므로 방도 삭제
create trigger match_requests_cleanup_room
  after update of status on public.match_requests
  for each row when (new.room_id is not null and new.status in ('rejected','canceled'))
  execute function public.cleanup_match_room_on_request_close();

-- ── 4) create_match_room — 출처 행에서 메타·초대 대상·정원 파생 ──
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
    v_capacity := 1 + jsonb_array_length(v_s.players);
  else
    raise exception 'invalid_source_kind';
  end if;

  insert into match_rooms (id, host_user_id, source_kind, played_at, played_time, match_type, surface, court_name, notes, capacity, has_result)
  values (v_room, v_uid, p_source_kind, v_played_at, v_played_time, v_match_type, v_surface, v_court_name, v_notes, v_capacity, v_has_result);
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
grant execute on function public.create_match_room(text, uuid, text) to authenticated;

-- ── 5) enter_match_room — 비밀번호 검증 후 열람 멤버(viewer·joined) 등록 ──
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

  -- 이미 초대/참가 중이면 상태 보존, 거절했던 사람은 열람 멤버로 복귀
  insert into match_room_members (room_id, user_id, role, status)
  values (p_room_id, v_uid, 'viewer', 'joined')
  on conflict (room_id, user_id) do update
    set role = 'viewer', status = 'joined', responded_at = now()
    where match_room_members.status = 'declined';
end;
$$;

revoke all on function public.enter_match_room(uuid, text) from public;
grant execute on function public.enter_match_room(uuid, text) to authenticated;

-- ── 6) respond_room_invite — 초대 수락/거절 (본인 invited 행만) ──
create or replace function public.respond_room_invite(p_room_id uuid, p_accept boolean)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  update match_room_members
  set status = case when p_accept then 'joined' else 'declined' end, responded_at = now()
  where room_id = p_room_id and user_id = v_uid and status = 'invited';
  if not found then raise exception 'invite_not_found'; end if;
end;
$$;

revoke all on function public.respond_room_invite(uuid, boolean) from public;
grant execute on function public.respond_room_invite(uuid, boolean) to authenticated;

-- ── 7) request_room_join / approve_room_join / reject_room_join — 로테이션 풀 합류 ──
create or replace function public.request_room_join(p_room_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room match_rooms%rowtype;
  v_s rotation_sessions%rowtype;
  v_m match_room_members%rowtype;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select * into v_room from match_rooms where id = p_room_id;
  if not found then raise exception 'room_not_found'; end if;
  if v_room.source_kind <> 'rotation' then raise exception 'not_rotation_room'; end if;
  -- finalize 되면 세션 행이 사라지므로 더는 풀에 합류할 수 없다
  select * into v_s from rotation_sessions where room_id = p_room_id;
  if not found then raise exception 'room_finalized'; end if;
  select * into v_m from match_room_members where room_id = p_room_id and user_id = v_uid;
  if not found or v_m.role <> 'viewer' or v_m.status <> 'joined' then raise exception 'not_viewer'; end if;
  if exists (select 1 from jsonb_array_elements(v_s.players) e where e->>'userId' = v_uid::text) then
    raise exception 'already_in_pool';
  end if;
  update match_room_members set status = 'requested', responded_at = null where id = v_m.id;
end;
$$;

revoke all on function public.request_room_join(uuid) from public;
grant execute on function public.request_room_join(uuid) to authenticated;

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

  -- 풀 전원 NTRP 필수 규칙(페어 고정 폼과 동일) — 공개 NTRP가 없으면 자가선언 NTRP
  v_ntrp := coalesce(public.derive_public_ntrp(v_u), v_u.ntrp);
  if v_ntrp is null then raise exception 'ntrp_missing'; end if;

  if not exists (select 1 from jsonb_array_elements(v_s.players) e where e->>'userId' = p_user_id::text) then
    update rotation_sessions
    set players = players || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
      'userId', v_u.id, 'name', v_u.name, 'hand', v_u.dominant_hand, 'ntrp', v_ntrp
    )))
    where id = v_s.id;
    update match_rooms set capacity = capacity + 1 where id = p_room_id;
  end if;
  update match_room_members
  set role = 'player', status = 'joined', source_role = 'pool', responded_at = now()
  where id = v_m.id;
end;
$$;

revoke all on function public.approve_room_join(uuid, uuid) from public;
grant execute on function public.approve_room_join(uuid, uuid) to authenticated;

create or replace function public.reject_room_join(p_room_id uuid, p_user_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if not exists (select 1 from match_rooms where id = p_room_id and host_user_id = v_uid) then
    raise exception 'not_host';
  end if;
  -- 거절해도 열람권은 유지(viewer·joined)
  update match_room_members
  set role = 'viewer', status = 'joined', responded_at = now()
  where room_id = p_room_id and user_id = p_user_id and status = 'requested';
  if not found then raise exception 'request_not_found'; end if;
end;
$$;

revoke all on function public.reject_room_join(uuid, uuid) from public;
grant execute on function public.reject_room_join(uuid, uuid) to authenticated;

-- ── 8) update_match_room_password — 방장 비밀번호 변경 ──
create or replace function public.update_match_room_password(p_room_id uuid, p_password text)
returns void
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_password is null or char_length(p_password) < 4 or char_length(p_password) > 20 or p_password ~ '\s' then
    raise exception 'invalid_password';
  end if;
  if not exists (select 1 from match_rooms where id = p_room_id and host_user_id = v_uid) then
    raise exception 'not_host';
  end if;
  insert into match_room_secrets (room_id, password_hash)
  values (p_room_id, crypt(p_password, gen_salt('bf')))
  on conflict (room_id) do update set password_hash = excluded.password_hash;
end;
$$;

revoke all on function public.update_match_room_password(uuid, text) from public;
grant execute on function public.update_match_room_password(uuid, text) to authenticated;

-- ── 9) get_match_room_detail — 멤버(방장 또는 declined 아닌 행)에게만 상세 반환 ──
--- 반환 jsonb 계약(camelCase): { room, host, viewer, members[], source{kind, requestStatus?, resultStatus?, repName?,
--- participants?[], isFinalized?, pool?[]}, games[] }. games는 방장 관점 personal_matches(room_id) 게임들.
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
        -- 대표 확인자 — 수락 전에는 멤버 행이 없으므로 이름을 따로 준다
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
      'capacity', v_room.capacity, 'hasResult', v_room.has_result, 'createdAt', v_room.created_at
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
grant execute on function public.get_match_room_detail(uuid) to authenticated;

-- ── 10) accept_match_request — 양측 personal_matches에 room_id 상속 + 대표를 방 참가자로 (그 외 0045 §1과 동일) ──
create or replace function public.accept_match_request(p_request_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_req match_requests%rowtype;
  v_requester users%rowtype;
  v_acceptor users%rowtype;
  v_member users%rowtype;
  v_is_doubles boolean;
  v_inverted_scores jsonb;
  v_requester_ntrp numeric;
  v_acceptor_ntrp numeric;
  v_partner_user_id uuid; v_partner_name text; v_partner_hand text; v_partner_ntrp numeric;
  v_opp2_user_id uuid; v_opp2_name text; v_opp2_hand text; v_opp2_ntrp numeric;
  v_pm_requester uuid := gen_random_uuid();
  v_pm_acceptor uuid := gen_random_uuid();
  v_result_status text;
begin
  select * into v_req from match_requests where id = p_request_id for update;
  if not found then raise exception 'request_not_found'; end if;
  if v_req.status <> 'pending' then raise exception 'request_not_pending'; end if;
  if v_req.opponent_user_id <> auth.uid() then raise exception 'not_request_opponent'; end if;

  select * into v_requester from users where id = v_req.requester_id;
  if not found or v_requester.deleted_at is not null then raise exception 'requester_deleted'; end if;
  select * into v_acceptor from users where id = v_req.opponent_user_id;

  v_is_doubles := v_req.match_type <> 'singles';

  if jsonb_array_length(v_req.set_scores) = 0 then
    v_inverted_scores := '[]'::jsonb;
  else
    v_inverted_scores := public.invert_set_scores(v_req.set_scores);
  end if;

  v_requester_ntrp := public.derive_public_ntrp(v_requester);
  v_acceptor_ntrp := public.derive_public_ntrp(v_acceptor);

  if v_is_doubles then
    select user_id, name, dominant_hand, ntrp_snapshot into v_partner_user_id, v_partner_name, v_partner_hand, v_partner_ntrp
    from match_request_participants where request_id = p_request_id and role = 'partner';
    if v_partner_user_id is not null then
      select * into v_member from users where id = v_partner_user_id;
      if found then
        v_partner_name := v_member.name;
        v_partner_ntrp := coalesce(public.derive_public_ntrp(v_member), v_partner_ntrp);
        v_partner_hand := v_member.dominant_hand;
      end if;
    end if;

    select user_id, name, dominant_hand, ntrp_snapshot into v_opp2_user_id, v_opp2_name, v_opp2_hand, v_opp2_ntrp
    from match_request_participants where request_id = p_request_id and role = 'opponent2';
    if v_opp2_user_id is not null then
      select * into v_member from users where id = v_opp2_user_id;
      if found then
        v_opp2_name := v_member.name;
        v_opp2_ntrp := coalesce(public.derive_public_ntrp(v_member), v_opp2_ntrp);
        v_opp2_hand := v_member.dominant_hand;
      end if;
    end if;
  end if;

  -- 요청자 행 (원본 관점, notes·court_name 포함, 방이 있으면 room_id 상속)
  insert into personal_matches
    (id, user_id, source_type, source_request_id, played_at, played_time, match_type, surface, set_scores, notes, court_name, room_id)
  values
    (v_pm_requester, v_req.requester_id, 'confirmation', v_req.id, v_req.played_at, v_req.played_time, v_req.match_type, v_req.surface, v_req.set_scores, v_req.notes, v_req.court_name, v_req.room_id);

  insert into personal_match_participants (match_id, role, user_id, name, dominant_hand, ntrp_snapshot)
  values (v_pm_requester, 'opponent', v_acceptor.id, v_acceptor.name, v_acceptor.dominant_hand, v_acceptor_ntrp);
  if v_is_doubles then
    insert into personal_match_participants (match_id, role, user_id, name, dominant_hand, ntrp_snapshot)
    values (v_pm_requester, 'partner', v_partner_user_id, v_partner_name, v_partner_hand, v_partner_ntrp);
    insert into personal_match_participants (match_id, role, user_id, name, dominant_hand, ntrp_snapshot)
    values (v_pm_requester, 'opponent2', v_opp2_user_id, v_opp2_name, v_opp2_hand, v_opp2_ntrp);
  end if;

  -- 수락자 행 (반전 관점: 세트는 invert_set_scores, 내 파트너=상대2, 상대=요청자, 상대2=요청자 파트너). notes는 요청자 사적 기록이라 제외, court_name·room_id는 공유
  insert into personal_matches
    (id, user_id, source_type, source_request_id, played_at, played_time, match_type, surface, set_scores, notes, court_name, room_id)
  values
    (v_pm_acceptor, v_acceptor.id, 'confirmation', v_req.id, v_req.played_at, v_req.played_time, v_req.match_type, v_req.surface,
     v_inverted_scores, null, v_req.court_name, v_req.room_id);

  insert into personal_match_participants (match_id, role, user_id, name, dominant_hand, ntrp_snapshot)
  values (v_pm_acceptor, 'opponent', v_requester.id, v_requester.name, v_requester.dominant_hand, v_requester_ntrp);
  if v_is_doubles then
    insert into personal_match_participants (match_id, role, user_id, name, dominant_hand, ntrp_snapshot)
    values (v_pm_acceptor, 'partner', v_opp2_user_id, v_opp2_name, v_opp2_hand, v_opp2_ntrp);
    insert into personal_match_participants (match_id, role, user_id, name, dominant_hand, ntrp_snapshot)
    values (v_pm_acceptor, 'opponent2', v_partner_user_id, v_partner_name, v_partner_hand, v_partner_ntrp);
  end if;

  v_result_status := case when jsonb_array_length(v_req.set_scores) = 0 then 'none' else 'confirmed' end;
  insert into match_result_negotiations (request_id, set_scores, result_status)
  values (p_request_id, v_req.set_scores, v_result_status);

  -- 대표 확인자는 수락이 곧 방 참가 (초대 행 없이 바로 joined)
  if v_req.room_id is not null then
    insert into match_room_members (room_id, user_id, role, status, source_role, responded_at)
    values (v_req.room_id, v_acceptor.id, 'player', 'joined', 'opponent', now())
    on conflict (room_id, user_id) do update
      set role = 'player', status = 'joined', source_role = 'opponent', responded_at = now();
  end if;

  update match_requests set status = 'accepted', responded_at = now() where id = p_request_id;
end;
$$;

revoke all on function public.accept_match_request(uuid) from public;
grant execute on function public.accept_match_request(uuid) to authenticated;

-- ── 11) finalize_rotation_session — 게임 행에 세션 room_id 상속 (그 외 0045 §3과 동일) ──
create or replace function public.finalize_rotation_session(p_session_id uuid, p_games jsonb)
returns void
language plpgsql
as $$
declare
  v_s rotation_sessions%rowtype;
  g jsonb;
  v_sets jsonb;
  v_match_id uuid;
  v_seq int := 0;
begin
  delete from rotation_sessions
  where id = p_session_id and user_id = auth.uid()
  returning * into v_s;
  if not found then raise exception 'session_not_found'; end if;

  if p_games is null or jsonb_typeof(p_games) <> 'array'
     or jsonb_array_length(p_games) < 1 or jsonb_array_length(p_games) > 20 then
    raise exception 'invalid_games';
  end if;

  for g in select value from jsonb_array_elements(p_games) loop
    if coalesce(g->'partner'->>'name', '') = ''
       or coalesce(g->'opp1'->>'name', '') = ''
       or coalesce(g->'opp2'->>'name', '') = '' then
      raise exception 'invalid_games';
    end if;
    -- 게임 1건 = 스코어 1줄
    if jsonb_typeof(g->'sets') <> 'array' or jsonb_array_length(g->'sets') <> 1
       or not public.validate_set_scores(g->'sets') then
      raise exception 'invalid_set_scores';
    end if;
    v_sets := public.normalize_set_scores(g->'sets', true);
    v_match_id := gen_random_uuid();
    v_seq := v_seq + 1;

    insert into personal_matches
      (id, user_id, source_type, played_at, played_time, match_type, surface, set_scores, notes, court_name,
       rotation_session_id, group_seq, room_id)
    values
      (v_match_id, v_s.user_id, 'rotation', v_s.played_at, v_s.played_time, v_s.match_type, v_s.surface, v_sets,
       v_s.notes, v_s.court_name, p_session_id, v_seq, v_s.room_id);

    insert into personal_match_participants (match_id, role, user_id, name, dominant_hand, ntrp_snapshot)
    values (v_match_id, 'opponent', nullif(g->'opp1'->>'userId', '')::uuid, g->'opp1'->>'name', nullif(g->'opp1'->>'hand', ''), nullif(g->'opp1'->>'ntrp', '')::numeric);
    insert into personal_match_participants (match_id, role, user_id, name, dominant_hand, ntrp_snapshot)
    values (v_match_id, 'partner', nullif(g->'partner'->>'userId', '')::uuid, g->'partner'->>'name', nullif(g->'partner'->>'hand', ''), nullif(g->'partner'->>'ntrp', '')::numeric);
    insert into personal_match_participants (match_id, role, user_id, name, dominant_hand, ntrp_snapshot)
    values (v_match_id, 'opponent2', nullif(g->'opp2'->>'userId', '')::uuid, g->'opp2'->>'name', nullif(g->'opp2'->>'hand', ''), nullif(g->'opp2'->>'ntrp', '')::numeric);
  end loop;
end;
$$;

revoke all on function public.finalize_rotation_session(uuid, jsonb) from public;
grant execute on function public.finalize_rotation_session(uuid, jsonb) to authenticated;

-- ── 12) anon 실행 권한 회수 ──
--- Supabase 기본 권한(alter default privileges)이 새 함수에 anon EXECUTE를 자동 부여하므로 `revoke … from public`만으로는
--- 남는다(security advisor: anon_security_definer_function_executable). 방 RPC는 전부 로그인 전용이라 anon을 명시 회수하고,
--- 트리거 함수는 직접 호출될 일이 없으니 authenticated도 회수한다.
revoke execute on function public.create_match_room(text, uuid, text) from anon;
revoke execute on function public.enter_match_room(uuid, text) from anon;
revoke execute on function public.respond_room_invite(uuid, boolean) from anon;
revoke execute on function public.request_room_join(uuid) from anon;
revoke execute on function public.approve_room_join(uuid, uuid) from anon;
revoke execute on function public.reject_room_join(uuid, uuid) from anon;
revoke execute on function public.update_match_room_password(uuid, text) from anon;
revoke execute on function public.get_match_room_detail(uuid) from anon;
revoke all on function public.sync_match_room_from_personal_match() from public, anon, authenticated;
revoke all on function public.cleanup_match_room_on_personal_match_delete() from public, anon, authenticated;
revoke all on function public.cleanup_match_room_on_request_close() from public, anon, authenticated;
