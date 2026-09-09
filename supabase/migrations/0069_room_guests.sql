-- 0069_room_guests.sql — 매칭 룸의 비회원(게스트) 참가자 (Week 41)
--
-- 증상: 룸의 「참가자 초대」는 회원만 부를 수 있다(invite_room_members, 0065). 그런데 코트에는
--       계정 없는 사람이 함께 온다. 지금 그 사람은 **게임에 이름을 적어 넣은 뒤에야** 명단에 나타난다 —
--       buildMemberRows의 '비회원' 행이 출처 기록(로테이션 풀·등록된 게임 참가자)에서 파생되기 때문이다.
--       그래서 방장이 자동 대진표(0066)를 짤 때 게스트는 아예 배치 대상에 없다.
--
-- 원인: match_room_members.user_id가 not null references users(0046)라 게스트 멤버 행이 불가능하고,
--       게스트를 '방에 있는 사람'으로 등록할 자리가 어디에도 없었다.
--
-- 설계 결정
--  · 저장소는 새 테이블 match_room_guests. 방식(단식/복식)과 무관한 단일 출처이고, 게스트마다
--    안정적인 uuid가 생겨 그것이 곧 대진 배치 key·명단 키·삭제 키가 된다.
--  · users에 is_guest 행을 만들지 않는다(add_guest_player와 다른 길). 개인 경기 기록은 게스트를
--    user_id null + 이름으로 저장하므로, users 행을 만들면 같은 사람이 두 모델로 갈린다.
--  · rotation_sessions.players를 재사용하지 않는다. 로테이션 방에만 있는 자리이고, 0058이 방 세션
--    풀 조작을 room_session_invite_unsupported로 막아 둔 규칙에 예외를 파야 한다.
--  · **게임 저장 경로는 건드리지 않는다.** resolve_room_player(0066)와 create_room_game의 파트너·
--    상대2 슬롯이 이미 user_id null + 이름을 받는다. 게스트는 후보 목록에 들어가기만 하면 된다.
--  · 자격은 초대와 같은 눈높이(방장 ∨ joined 참가자) — 방에 들어와 있으면 사람을 부를 수 있다.
--  · 이름은 방 안에서 유일해야 한다. 명단·풀의 게스트 dedupe가 이름 기준이라(members-view,
--    rotation-pool) 동명이인을 허용하면 두 사람이 한 행으로 접힌다.
--  · 게스트를 빼도 이미 저장된 게임은 그대로다 — 기록 속 게스트는 이름 문자열로 독립해 있다.


-- ════════════════════════════════════════════════════════════════
-- §1 match_room_guests — 방에 등록된 비회원
-- ════════════════════════════════════════════════════════════════
create table if not exists public.match_room_guests (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.match_rooms(id) on delete cascade,
  name text not null,
  dominant_hand text check (dominant_hand in ('right','left')),
  ntrp numeric(2,1) check (ntrp >= 1.0 and ntrp <= 7.0),
  gender text check (gender in ('male','female')),
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists match_room_guests_room_idx on public.match_room_guests(room_id);
-- 방 안 이름 유일 — 앱의 게스트 dedupe가 이름 기준이다
create unique index if not exists match_room_guests_room_name_key
  on public.match_room_guests(room_id, lower(btrim(name)));
-- 미인덱스 FK를 늘리지 않는다(백로그)
create index if not exists match_room_guests_created_by_idx on public.match_room_guests(created_by);

alter table public.match_room_guests enable row level security;

-- 읽기는 방 참가자(명단 자체는 룸 상세 RPC가 게이트한다), 쓰기 정책은 두지 않는다.
-- 쓰기 = RPC 전용(match_room_secrets와 같은 관용구).
drop policy if exists "match_room_guests_select" on public.match_room_guests;
create policy "match_room_guests_select" on public.match_room_guests
  for select using (
    public.is_room_participant(room_id)
    or exists (select 1 from public.match_rooms r where r.id = room_id and r.host_user_id = auth.uid())
  );


-- ════════════════════════════════════════════════════════════════
-- §2 add_room_guest — 방에 비회원 1명 등록
-- ════════════════════════════════════════════════════════════════
create or replace function public.add_room_guest(
  p_room_id uuid,
  p_name text,
  p_hand text default null,
  p_ntrp numeric default null,
  p_gender text default null
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room match_rooms%rowtype;
  v_name text;
  v_id uuid;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  -- 방 행 락 — 동시 등록이 같은 이름을 통과시키지 못하게 한다(유니크 인덱스는 마지막 그물)
  select * into v_room from match_rooms where id = p_room_id for update;
  if not found then raise exception 'room_not_found'; end if;
  if v_room.is_settled then raise exception 'room_already_closed'; end if;

  if v_room.host_user_id <> v_uid and not exists (
    select 1 from match_room_members m
    where m.room_id = p_room_id and m.user_id = v_uid and m.status = 'joined'
  ) then
    raise exception 'not_room_member';
  end if;

  v_name := btrim(coalesce(p_name, ''));
  if v_name = '' or char_length(v_name) > 40 then raise exception 'invalid_guest_name'; end if;

  -- 회원 이름과도 겹치면 안 된다 — 명단에서 둘을 구별할 방법이 이름밖에 없다
  if exists (
    select 1 from match_room_members m join users u on u.id = m.user_id
    where m.room_id = p_room_id and m.status in ('invited','joined','removed')
      and lower(btrim(u.name)) = lower(v_name)
  ) or exists (
    select 1 from match_room_guests g
    where g.room_id = p_room_id and lower(btrim(g.name)) = lower(v_name)
  ) then
    raise exception 'duplicate_guest_name';
  end if;

  insert into match_room_guests (room_id, name, dominant_hand, ntrp, gender, created_by)
  values (
    p_room_id, v_name,
    nullif(btrim(coalesce(p_hand, '')), ''),
    p_ntrp,
    nullif(btrim(coalesce(p_gender, '')), ''),
    v_uid
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.add_room_guest(uuid, text, text, numeric, text) from public;
revoke execute on function public.add_room_guest(uuid, text, text, numeric, text) from anon;
grant execute on function public.add_room_guest(uuid, text, text, numeric, text) to authenticated;

comment on function public.add_room_guest(uuid, text, text, numeric, text) is
  '매칭 룸에 비회원(게스트) 참가자를 등록 — 방장 ∨ 참가자, 방 안 이름 유일 (0069).';


-- ════════════════════════════════════════════════════════════════
-- §3 remove_room_guest — 명단에서 비회원 1명 제거
-- ════════════════════════════════════════════════════════════════
--- 이미 저장된 게임은 손대지 않는다 — 게임 속 게스트는 이름 문자열로 독립해 있고,
--- 그 게임이 남아 있는 한 명단에도 파생 '비회원' 행으로 계속 보인다(members-view).
create or replace function public.remove_room_guest(p_guest_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_guest match_room_guests%rowtype;
  v_room match_rooms%rowtype;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select * into v_guest from match_room_guests where id = p_guest_id;
  if not found then raise exception 'guest_not_found'; end if;

  select * into v_room from match_rooms where id = v_guest.room_id for update;
  if not found then raise exception 'room_not_found'; end if;
  if v_room.is_settled then raise exception 'room_already_closed'; end if;

  -- 등록한 본인은 언제나 되돌릴 수 있고, 그 밖에는 방장만 — 남이 부른 사람을 아무나 지우지 못한다
  if v_room.host_user_id <> v_uid and v_guest.created_by is distinct from v_uid then
    raise exception 'not_room_host';
  end if;

  delete from match_room_guests where id = p_guest_id;
end;
$$;

revoke all on function public.remove_room_guest(uuid) from public;
revoke execute on function public.remove_room_guest(uuid) from anon;
grant execute on function public.remove_room_guest(uuid) to authenticated;

comment on function public.remove_room_guest(uuid) is
  '매칭 룸 명단에서 비회원 제거 — 방장 ∨ 등록한 본인. 이미 저장된 게임 기록은 건드리지 않는다 (0069).';


-- ════════════════════════════════════════════════════════════════
-- §4 get_match_room_detail — 'guests' 키 추가 (0067 본문 + 게스트 블록)
-- ════════════════════════════════════════════════════════════════
--- 0067판 그대로에 v_guests 집계와 반환 키 한 줄만 더했다. 게이트·조인·다른 블록은 손대지 않는다.
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
  if v_room.host_user_id <> v_uid and (not found or v_viewer.status = 'declined') then
    raise exception 'not_member';
  end if;
  select * into v_host from users where id = v_room.host_user_id;

  select coalesce(jsonb_agg(jsonb_build_object(
      'userId', m.user_id, 'name', u.name, 'nickname', u.nickname, 'profileImage', u.profile_image,
      'deleted', u.deleted_at is not null, 'role', m.role, 'status', m.status, 'sourceRole', m.source_role,
      -- Week 41: 명단에 노출할 프로필 메타. 게스트는 users 행이 없어 여기 오지 않는다
      'ntrp', public.derive_public_ntrp(u),
      'hand', u.dominant_hand,
      'racketBrand', u.racket_brand,
      'racketModel', u.racket_model
    ) order by (m.role = 'host') desc, (m.status = 'joined') desc, m.created_at), '[]'::jsonb)
  into v_members
  from match_room_members m join users u on u.id = m.user_id
  where m.room_id = p_room_id;

  -- 0069: 방에 등록된 비회원. 회원 멤버와 나란히 '방에 있는 사람'을 이룬다
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', g.id, 'name', g.name, 'hand', g.dominant_hand, 'ntrp', g.ntrp,
      'gender', g.gender, 'createdBy', g.created_by
    ) order by g.created_at), '[]'::jsonb)
  into v_guests
  from match_room_guests g where g.room_id = p_room_id;

  if v_room.source_kind = 'confirmation' then
    -- 방 게임이 쌓이면 요청이 여러 건이므로 방을 만든 최초 요청을 출처로 고정한다
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

  -- primary 게임 = 관점 복사본이 아닌 행 한 벌 (작성자가 방장이 아니어도 방 전원에게 보인다)
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
