-- 20260909074019 0069_room_guests
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
-- 0069_room_guests.sql — 매칭 룸의 비회원(게스트) 참가자 (Week 41)
-- 저장소는 새 테이블 match_room_guests(방식 무관 단일 출처, 안정 uuid = 대진 key·명단 키).
-- 게임 저장 경로는 그대로다 — resolve_room_player(0066)·create_room_game이 이미 user_id null + 이름을 받는다.

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
create index if not exists match_room_guests_created_by_idx on public.match_room_guests(created_by);

alter table public.match_room_guests enable row level security;

-- 읽기는 방 참가자, 쓰기 정책은 두지 않는다(RPC 전용 — match_room_secrets 관용구)
drop policy if exists "match_room_guests_select" on public.match_room_guests;
create policy "match_room_guests_select" on public.match_room_guests
  for select using (
    public.is_room_participant(room_id)
    or exists (select 1 from public.match_rooms r where r.id = room_id and r.host_user_id = auth.uid())
  );

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

-- get_match_room_detail — 0067 본문 + 'guests' 키
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
