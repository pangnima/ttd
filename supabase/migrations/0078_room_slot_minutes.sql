-- 0078 — 방이 경기당 시간을 기억한다 (K-6, Week 51)
--
-- 0073이 방에 시작 시각·예정 소요 시간·코트 면 수를 넣었지만 **경기당 시간(slot)은 넣지 않았다**.
-- 그 값은 자동 대진표를 짤 때 고르는 것이라 방의 속성이 아니라고 본 결정이었다. 그런데 Week 44가
-- 라운드·코트를 목록 **순서에서 파생**하게 되면서 그 결정이 화면에 구멍을 냈다 —
-- 라운드 헤더의 예상 시각을 그리려면 경기당 시간이 필요한데 방이 모르므로
-- `derivedSlotMinutes`가 **예정 소요 시간 ÷ 라운드 수**로 되짚는다. 대진이 예정 시간에 딱 맞게
-- 짜였을 때만 그 값이 방장이 고른 값과 같아지고, 그렇지 않으면 어긋난다:
--   방장이 30분으로 3라운드를 짰는데 방의 예정이 120분이면 화면은 10:00·10:40·11:20으로 읽는다
--   (E2E S3.14가 잡은 그대로 — 팝업은 10:00·10:30·11:00이었다).
--
-- 그래서 **고른 값을 저장한다**. 여전히 방을 만들 때 묻지 않는다(0073의 결정은 그대로다) —
-- 자동 대진표가 저장할 때 함께 적어 둘 뿐이다. 저장된 적이 없으면 null이고 화면은 종전대로 역산한다.
-- 코트 **배정**은 이번에도 하지 않는다(라운드·코트는 계속 순서에서 파생한다).

-- ── 1) 컬럼 ────────────────────────────────────────────────────────────
--- nullable이다 — 0078 이전 방과 대진표를 쓰지 않은 방은 null로 남고 화면은 역산을 계속 쓴다.
--- 상한 180분은 SLOT_MINUTES_OPTIONS(20~60)보다 넉넉히 잡았다. 손으로 넣는 값이 아니라
--- 앱이 고른 값만 들어오므로 범위는 사고 방지용이다.
alter table public.match_rooms
  add column if not exists slot_minutes int check (slot_minutes between 10 and 180);

comment on column public.match_rooms.slot_minutes is
  '경기당 시간(분) — 방장이 자동 대진표를 저장할 때 고른 값(0078). 라운드 예상 시각의 근거이고, 없으면 예정 소요 시간 ÷ 라운드 수로 역산한다. 방 생성 시에는 묻지 않는다.';

-- ── 2) get_match_room_detail — room jsonb에 slotMinutes ────────────────
--- 0074 정의를 그대로 잇고 room 객체에 키 하나만 더한다.
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

revoke all on function public.get_match_room_detail(uuid) from public;
revoke execute on function public.get_match_room_detail(uuid) from anon;
grant execute on function public.get_match_room_detail(uuid) to authenticated;

-- ── 3) create_room_lineup — 고른 경기당 시간을 방에 적는다 ─────────────
--- 파라미터가 하나 늘어나므로 create or replace가 아니라 drop 후 create다
--- (파라미터 수가 다르면 오버로드가 남아 어느 쪽이 불릴지 알 수 없게 된다 — 0073이 겪은 것과 같다).
--- 본문은 0071 정의를 그대로 잇는다. ⚠ `room_not_ready` 가드는 **되살리지 않는다** —
--- 0072가 그것을 되돌렸고(복식 방은 전부 로테이션 방이라 자동 대진표가 통째로 막혔다),
--- 0075가 이 함수를 복사하지 않은 이유도 그 가드가 딸려 오는 것을 막기 위해서였다.
drop function if exists public.create_room_lineup(uuid, jsonb);

create function public.create_room_lineup(
  p_room_id uuid, p_games jsonb, p_slot_minutes int default null
)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room match_rooms%rowtype;
  v_count integer;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select * into v_room from match_rooms where id = p_room_id for update;
  if not found then raise exception 'room_not_found'; end if;
  -- 방장만 — 여러 명이 각자 대진표를 만들면 방이 게임으로 뒤덮인다
  if v_room.host_user_id <> v_uid then raise exception 'not_room_host'; end if;
  -- 정산된 방에 게임을 더하면 is_settled가 뒤집혀 방이 '진행 중'으로 되살아난다 (0069·0077과 같은 눈높이)
  if v_room.is_settled then raise exception 'room_already_closed'; end if;

  if p_games is null or jsonb_typeof(p_games) <> 'array' or jsonb_array_length(p_games) < 1 then
    raise exception 'invalid_games';
  end if;

  if p_slot_minutes is not null and (p_slot_minutes < 10 or p_slot_minutes > 180) then
    raise exception 'invalid_slot_minutes';
  end if;

  v_count := public.insert_room_lineup_games(p_room_id, p_games);

  -- 방장이 고른 경기당 시간을 남긴다(0078). 이어붙이기로 두 번 저장하면 **마지막 값이 이긴다** —
  -- 라운드 시각은 목록 전체를 한 격자로 읽으므로 방에 값이 하나만 있어야 한다.
  if p_slot_minutes is not null then
    update match_rooms set slot_minutes = p_slot_minutes where id = p_room_id;
  end if;

  perform public.recompute_match_room_settled(p_room_id);
  return v_count;
end;
$$;

revoke all on function public.create_room_lineup(uuid, jsonb, int) from public;
revoke execute on function public.create_room_lineup(uuid, jsonb, int) from anon;
grant execute on function public.create_room_lineup(uuid, jsonb, int) to authenticated;

-- ⚠ replace_room_lineup(대진 편집)은 건드리지 않는다. 편집 화면은 경기당 시간을 묻지 않고
--   게임의 자리만 고치므로 방이 기억한 값이 그대로 맞다. 게임을 지워 라운드 수가 줄어도
--   경기당 시간은 그대로여야 한다 — 그것이 역산과 갈리는 지점이고 이 마이그레이션의 요점이다.
