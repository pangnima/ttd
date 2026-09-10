-- 0073_room_schedule.sql — 매칭 룸에 시간 축 (Week 43)
--
-- 방은 지금까지 **시작 시각만** 알았다(played_at + played_time). 그래서 둘이 안 됐다:
--   1. 화면이 몇 시에 끝나는지 말하지 못한다. 실제로는 보통 시작 +2시간이고 +1·+3 예외가 있다.
--   2. 자동 대진표가 **몇 경기를 짜야 하는지 판단할 근거가 없다.** 사용자가 「1인당 경기 수」를
--      감으로 고르면 총 게임 수가 거기서 파생될 뿐이라, 두 시간짜리 방에 20경기를 꽂아도 아무 말이 없다.
--
-- 시간에서 경기 수를 얻으려면 **동시에 몇 경기가 도는지**를 알아야 하는데 룸에는 코트 면 수가 없었다
-- (court_name 텍스트 하나뿐). 11명이 모인 방을 코트 1면으로 보면 추천이 늘 4경기가 되어 현실과 어긋난다.
-- 그래서 소요 시간과 코트 면 수를 함께 받는다. 면 수는 **추천 계산과 표시에만** 쓰고 경기에 코트를
-- 배정하지는 않는다 — 룸의 대진은 여전히 격자가 아니라 순서 있는 목록이다(lineup.ts).
--
-- 경기당 시간(타임)은 방이 아니라 **자동 대진표를 짤 때** 고른다(사용자 결정). 대진을 짜는 방식이지
-- 방의 약속이 아니고, 만들기 폼을 무겁게 하지 않는다.

-- ── 1) 방 컬럼 ──
--- duration_minutes는 nullable이다 — 0073 이전 방은 null로 남고, 그 방에서는 추천을 아예 그리지 않아
--- 화면이 예전 그대로다. court_count는 default 1이라 기존 방이 모두 '코트 1면'으로 읽힌다.
alter table public.match_rooms
  add column if not exists duration_minutes int check (duration_minutes between 30 and 600),
  add column if not exists court_count int not null default 1 check (court_count between 1 and 12);

comment on column public.match_rooms.duration_minutes is
  '예정 소요 시간(분). 종료 시각은 played_time + 이 값으로 계산한다 — 시각으로 저장하면 자정 넘김에서 종료 < 시작이 되어 계산이 꼬인다.';
comment on column public.match_rooms.court_count is
  '동시에 쓰는 코트 면 수. 자동 대진표의 권장 경기 수 계산과 표시에만 쓰이고, 게임에 코트를 배정하지는 않는다.';

-- ── 2) create_match_room — 방 고유 속성을 파라미터로 받는다 ──
--- 방 메타(날짜·시각·표면·코트명)는 seed 행에서 복사되지만, 소요 시간과 코트 면 수는
--- rotation_sessions·personal_matches 어느 쪽에도 둘 의미가 없는 값이다(개인 경기 기록에 코트 면 수가
--- 왜 필요한가). 그래서 seed를 거치지 않고 RPC 파라미터로 받는다.
---
--- ⚠ create or replace가 아니라 **drop 후 생성**이다. 파라미터 수가 다르면 별개 시그니처가 되어
--- 3-arg 함수가 그대로 남고, supabase-js가 어느 쪽을 부를지 모호해진다.
drop function if exists public.create_match_room(text, uuid, text);

create function public.create_match_room(
  p_source_kind text,
  p_source_id uuid,
  p_password text,
  p_duration_minutes int default null,
  p_court_count int default 1
)
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
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_password is null or char_length(p_password) < 4 or char_length(p_password) > 20 or p_password ~ '\s' then
    raise exception 'invalid_password';
  end if;
  if p_duration_minutes is not null and (p_duration_minutes < 30 or p_duration_minutes > 600) then
    raise exception 'invalid_duration';
  end if;
  if p_court_count is null or p_court_count < 1 or p_court_count > 12 then
    raise exception 'invalid_court_count';
  end if;

  if p_source_kind = 'direct' then
    select * into v_pm from personal_matches where id = p_source_id and user_id = v_uid for update;
    if not found or v_pm.source_type <> 'direct' then raise exception 'source_not_found'; end if;
    if v_pm.room_id is not null then raise exception 'already_listed'; end if;
    v_played_at := v_pm.played_at; v_played_time := v_pm.played_time; v_match_type := v_pm.match_type;
    v_surface := v_pm.surface; v_court_name := v_pm.court_name; v_notes := v_pm.notes;
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

  insert into match_rooms
    (id, host_user_id, source_kind, played_at, played_time, match_type, surface, court_name, notes,
     duration_minutes, court_count)
  values
    (v_room, v_uid, p_source_kind, v_played_at, v_played_time, v_match_type, v_surface, v_court_name, v_notes,
     p_duration_minutes, p_court_count);
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

  perform public.recompute_match_room_settled(v_room);
  return v_room;
end;
$$;

revoke all on function public.create_match_room(text, uuid, text, int, int) from public;
revoke execute on function public.create_match_room(text, uuid, text, int, int) from anon;
grant execute on function public.create_match_room(text, uuid, text, int, int) to authenticated;
