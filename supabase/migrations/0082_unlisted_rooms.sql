-- 0082 — 비노출 방: 직접 기록에서 회원을 부르면 목록에 뜨지 않는 방이 생긴다 (Week 53)
--
-- Week 39는 「회원이 끼면 매칭 룸을 거친다」(requiresRoom)를 세우면서 직접 기록에 회원을 넣는 길을
-- 아예 막았다 — 폼이 "매칭 만들기로 가라"고만 했다. 1차 오픈 스펙은 그 자리에서 곧바로 회원을
-- 초대하길 원한다: **방을 만들되 매칭 리스트에는 올리지 않는다.** 초대받은 사람만 들어오고,
-- 이후 절차(수락 → 참여 중인 매칭 → 대진 → 결과 → 정산)는 노출된 방과 같다.
--
-- 그래서 방에 `is_listed` 하나를 더한다. 비노출 방은 **비밀번호가 없다** — 초대로만 들어오므로
-- 입장 게이트가 있을 자리가 없고, 있으면 "리스트에 없는 방을 비밀번호로 여는" 뒷문이 된다.
-- 비밀번호 없음의 표현은 `match_room_secrets` 행의 부재다(정책 0개·RPC 전용이라 컬럼을 nullable로
-- 만들 필요가 없다). 그 표현을 깨는 경로가 하나 있다 — `update_match_room_password`가 upsert라
-- 비노출 방에 호출하면 행이 생겨 입장이 열린다. 그래서 그쪽도 함께 막는다.
--
-- ⚠ `create_match_room`은 파라미터가 늘어 **drop 후 재생성**한다(0073 선례 — create or replace는
--    시그니처가 다르면 오버로드를 남기고, 그러면 어느 쪽이 불릴지 알 수 없다).

-- ── 1) 컬럼 ────────────────────────────────────────────────────────────
alter table public.match_rooms
  add column if not exists is_listed boolean not null default true;

comment on column public.match_rooms.is_listed is
  '매칭 리스트(/match-rooms)에 노출되는가(0082). false = 직접 기록에서 만든 비노출 방 — 비밀번호(match_room_secrets)가 없고 초대로만 들어온다. 참여 중인 매칭(/me/match-rooms)은 멤버십 기준이라 노출 여부와 무관하게 보인다.';

-- 목록 쿼리는 노출된 방만 본다 — 기존 (played_at, played_time) 인덱스를 노출 방으로 좁힌 부분 인덱스
create index if not exists match_rooms_listed_played_idx
  on public.match_rooms (played_at, played_time)
  where is_listed;

-- ── 2) create_match_room — p_listed (0073 본문 + 노출 분기) ────────────
drop function if exists public.create_match_room(text, uuid, text, int, int);

create function public.create_match_room(
  p_source_kind text,
  p_source_id uuid,
  p_password text,
  p_duration_minutes int default null,
  p_court_count int default 1,
  p_listed boolean default true
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
  -- 비밀번호는 노출 방에만 있다 — 비노출 방은 초대로만 들어오므로 게이트 자체가 없다
  if coalesce(p_listed, true) then
    if p_password is null or char_length(p_password) < 4 or char_length(p_password) > 20 or p_password ~ '\s' then
      raise exception 'invalid_password';
    end if;
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
     duration_minutes, court_count, is_listed)
  values
    (v_room, v_uid, p_source_kind, v_played_at, v_played_time, v_match_type, v_surface, v_court_name, v_notes,
     p_duration_minutes, p_court_count, coalesce(p_listed, true));
  if coalesce(p_listed, true) then
    insert into match_room_secrets (room_id, password_hash) values (v_room, crypt(p_password, gen_salt('bf')));
  end if;
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

revoke all on function public.create_match_room(text, uuid, text, int, int, boolean) from public;
revoke execute on function public.create_match_room(text, uuid, text, int, int, boolean) from anon;
grant execute on function public.create_match_room(text, uuid, text, int, int, boolean) to authenticated;

comment on function public.create_match_room(text, uuid, text, int, int, boolean) is
  '출처 기록을 매칭 룸으로 등록(0046~0082). p_listed=false면 매칭 리스트에 오르지 않고 비밀번호(secrets)도 만들지 않는다 — 직접 기록에서 회원을 부를 때의 경로.';

-- ── 3) enter_match_room — 비노출 방은 비밀번호로 들어올 수 없다 ────────
--- 종전에는 secrets 행이 없으면 room_not_found였다. 비노출 방은 방은 있는데 secrets가 없는 상태라
--- "없는 방"이 아니라 "초대로만 들어오는 방"이라고 말해야 한다 — 방 행을 먼저 본다.
create or replace function public.enter_match_room(p_room_id uuid, p_password text)
returns void
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_listed boolean;
  v_hash text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select r.is_listed into v_listed from match_rooms r where r.id = p_room_id;
  if not found then raise exception 'room_not_found'; end if;
  if not v_listed then raise exception 'room_not_listed'; end if;
  select s.password_hash into v_hash from match_room_secrets s where s.room_id = p_room_id;
  if not found then raise exception 'room_not_found'; end if;
  if crypt(coalesce(p_password, ''), v_hash) <> v_hash then raise exception 'wrong_password'; end if;
  perform public.join_match_room_as_player(p_room_id, v_uid);
end;
$$;

-- ── 4) update_match_room_password — 비노출 방에 비밀번호를 만들지 않는다 ──
--- upsert라 그냥 두면 비노출 방에 secrets 행이 생겨 3)의 게이트가 열린다(뒷문).
create or replace function public.update_match_room_password(p_room_id uuid, p_password text)
returns void
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_room match_rooms%rowtype;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_password is null or char_length(p_password) < 4 or char_length(p_password) > 20 or p_password ~ '\s' then
    raise exception 'invalid_password';
  end if;
  select * into v_room from match_rooms where id = p_room_id and host_user_id = v_uid;
  if not found then raise exception 'not_host'; end if;
  if not v_room.is_listed then raise exception 'room_not_listed'; end if;
  insert into match_room_secrets (room_id, password_hash)
  values (p_room_id, crypt(p_password, gen_salt('bf')))
  on conflict (room_id) do update set password_hash = excluded.password_hash;
end;
$$;

-- ── 5) get_match_room_detail — room jsonb에 isListed (0078 본문 + 키 하나) ──
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
