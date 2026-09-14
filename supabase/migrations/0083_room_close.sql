-- 0083 — 방 닫기: 정산 위에 얹는 잠금 (Week 53)
--
-- 1차 오픈 스펙은 "기록이 끝나면 호스트가 방을 닫아 더 이상 수정할 수 없게 한다"를 원한다.
-- 정산(`is_settled`)은 0049부터 **자동 파생**이다 — 대표 게임 전부 확정 ∧ 대기 요청 없음 ∧ 세션 없음이면
-- 트리거가 세운다. 그 판정을 방장의 손에 넘기면 "닫기 전엔 얼마든 고친다"가 되어 확정의 뜻이 흐려지므로,
-- 닫기는 정산을 **대체하지 않고 그 위에 얹는다**: `closed_at`이 있으면 정산을 되돌리는 모든 손이 막힌다.
--
-- 되돌리는 손은 하나가 아니다 — [결과 정정](reopen_match_result)뿐 아니라 소유자의 direct 행 DELETE/UPDATE,
-- `replace_room_lineup`(정산 가드가 없었다 — N-3)까지 전부 `recompute_match_room_settled`를 거친다.
-- 그래서 **recompute를 초크포인트로** 삼는다: 새 값이 false인데 닫혀 있으면 `room_closed`를 raise한다.
-- CHECK만 걸면 트리거 안에서 23514로 터져 사용자에게 불투명하다(0080 교훈: 제약을 걸 때는 값을 넣는
-- 모든 경로를 함께 본다). CHECK는 마지막 안전망으로만 둔다.
--
-- 노출 조건과 짝을 맞추기 위한 명시 가드(0072)도 함께 건다 — 열어 둘 것은 둘이다.
-- `respond_room_invite`는 막지 않는다(막으면 초대가 영영 invited로 남아 뱃지가 사라지지 않는다).
-- `leave_match_room`도 막지 않는다(배정된 경기가 없는 사람의 퇴장은 상태를 바꾸지 않는다).
--
-- ⚠ 기존 `room_already_closed`는 "정산됨"이라는 뜻으로 이미 쓰인다. 새 상태의 코드는 `room_closed`·
--    `room_not_settled`·`room_not_closed`로 구분한다(에러 맵의 최장 일치에 안전).

-- ── 1) 컬럼 + 안전망 CHECK ───────────────────────────────────────────
alter table public.match_rooms
  add column if not exists closed_at timestamptz;

comment on column public.match_rooms.closed_at is
  '방장이 닫은 시각(0083). 정산(is_settled) 위의 잠금 — 있으면 결과 정정·게임 추가·초대·대진 편집·기록 수정이 전부 막힌다. 방장만 다시 열 수 있다. closed ⊆ settled.';

alter table public.match_rooms
  drop constraint if exists match_rooms_closed_requires_settled;
alter table public.match_rooms
  add constraint match_rooms_closed_requires_settled check (closed_at is null or is_settled);

-- ── 2) recompute_match_room_settled — 초크포인트 (0050 §5 본문 + 닫힘 검사) ──
create or replace function public.recompute_match_room_settled(p_room_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_total int;
  v_open int;
  v_settled boolean;
  v_closed_at timestamptz;
begin
  if p_room_id is null then return; end if;
  select closed_at into v_closed_at from match_rooms where id = p_room_id;
  if not found then return; end if;

  select count(*), count(*) filter (where jsonb_array_length(pm.set_scores) = 0)
  into v_total, v_open
  from personal_matches pm
  where pm.room_id = p_room_id and not pm.is_perspective;

  v_settled := (
    v_total > 0 and v_open = 0
    and not exists (select 1 from match_requests r where r.room_id = p_room_id and r.status = 'pending')
    and not exists (select 1 from rotation_sessions s where s.room_id = p_room_id)
  );

  -- 닫힌 방은 정산을 되돌릴 수 없다 — 어느 경로로 왔든 여기서 같은 코드로 막는다
  if v_closed_at is not null and not v_settled then
    raise exception 'room_closed';
  end if;

  update match_rooms set is_settled = v_settled where id = p_room_id;
end;
$$;

revoke all on function public.recompute_match_room_settled(uuid) from public, anon, authenticated;

-- ── 3) close_match_room / reopen_match_room — 방장 전용 ─────────────
create or replace function public.close_match_room(p_room_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room match_rooms%rowtype;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select * into v_room from match_rooms where id = p_room_id for update;
  if not found then raise exception 'room_not_found'; end if;
  if v_room.host_user_id <> v_uid then raise exception 'not_room_host'; end if;
  if not v_room.is_settled then raise exception 'room_not_settled'; end if;
  if v_room.closed_at is not null then raise exception 'room_closed'; end if;
  update match_rooms set closed_at = now() where id = p_room_id;
end;
$$;

revoke all on function public.close_match_room(uuid) from public;
revoke execute on function public.close_match_room(uuid) from anon;
grant execute on function public.close_match_room(uuid) to authenticated;

comment on function public.close_match_room(uuid) is
  '방장이 정산된 방을 닫는다(0083). 닫힌 방은 결과 정정·게임 추가·초대·대진 편집·기록 수정이 막힌다. 정산되지 않은 방은 room_not_settled.';

create or replace function public.reopen_match_room(p_room_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room match_rooms%rowtype;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select * into v_room from match_rooms where id = p_room_id for update;
  if not found then raise exception 'room_not_found'; end if;
  if v_room.host_user_id <> v_uid then raise exception 'not_room_host'; end if;
  if v_room.closed_at is null then raise exception 'room_not_closed'; end if;
  update match_rooms set closed_at = null where id = p_room_id;
end;
$$;

revoke all on function public.reopen_match_room(uuid) from public;
revoke execute on function public.reopen_match_room(uuid) from anon;
grant execute on function public.reopen_match_room(uuid) to authenticated;

comment on function public.reopen_match_room(uuid) is
  '방장이 닫은 방을 다시 연다(0083) — 잘못 확정한 결과를 [결과 정정]으로 고칠 유일한 탈출구.';

-- ── 4) 명시 가드 — 노출 조건의 거울(0072) ───────────────────────────

-- 4a) reopen_match_result (0062 §5 본문 + room_closed)
create or replace function public.reopen_match_result(p_request_id uuid, p_reason text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_req match_requests%rowtype;
  v_neg match_result_negotiations%rowtype;
  v_uid uuid := auth.uid();
  v_seat text;
  v_has_counterpart boolean;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_rows int;
begin
  select * into v_req from match_requests where id = p_request_id for update;
  if not found then raise exception 'request_not_found'; end if;
  if v_req.status <> 'accepted' then raise exception 'request_not_accepted'; end if;

  v_seat := public.request_seat_of(p_request_id, v_uid);
  if v_seat is null then raise exception 'not_request_party'; end if;

  -- 닫힌 방의 결과는 되돌릴 수 없다(0083) — 방장이 다시 열어야 한다
  if v_req.room_id is not null and exists (
    select 1 from match_rooms r where r.id = v_req.room_id and r.closed_at is not null
  ) then
    raise exception 'room_closed';
  end if;

  select * into v_neg from match_result_negotiations where request_id = p_request_id for update;
  if not found or v_neg.result_status <> 'confirmed' then raise exception 'result_not_confirmed'; end if;
  if v_reason is not null and char_length(v_reason) > 200 then raise exception 'dispute_reason_too_long'; end if;

  -- 되돌린 뒤 다시 합의해 줄 사람이 상대팀에 남아 있어야 한다
  if v_seat in ('requester', 'partner') then
    v_has_counterpart := public.is_active_member(v_req.opponent_user_id)
      or exists (select 1 from match_request_participants p
                 where p.request_id = p_request_id and p.role = 'opponent2'
                   and public.is_active_member(p.user_id));
  else
    v_has_counterpart := public.is_active_member(v_req.requester_id)
      or exists (select 1 from match_request_participants p
                 where p.request_id = p_request_id and p.role = 'partner'
                   and public.is_active_member(p.user_id));
  end if;
  if not v_has_counterpart then raise exception 'counterpart_deleted'; end if;

  update personal_matches
  set set_scores = '[]'::jsonb
  where source_request_id = p_request_id;
  get diagnostics v_rows = row_count;
  if v_rows < 2 then raise exception 'personal_matches_missing'; end if;

  update match_result_negotiations
  set result_status = 'disputed',
      set_scores = '[]'::jsonb,
      dispute_reason = coalesce(v_reason, '결과 정정 요청'),
      disputed_by = v_uid,
      dispute_count = dispute_count + 1
  where request_id = p_request_id;
end;
$$;

-- 4b) replace_room_lineup (0076 §5 본문 + 정산 가드 — N-3)
--- create_room_lineup·create_room_game은 정산 방을 막는데(0077·0078) 교체만 열려 있었다.
--- p_game_ids=[]에 새 대진을 넣으면 정산 방에 미확정 게임이 붙어 F-5가 재현된다. UI는 editable이 비어
--- 버튼이 사라지지만, 노출 조건과 가드는 짝이어야 한다(0072).
create or replace function public.replace_room_lineup(
  p_room_id uuid, p_game_ids uuid[], p_games jsonb
)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room match_rooms%rowtype;
  v_ids uuid[] := coalesce(p_game_ids, '{}');
  v_req_ids uuid[];
  v_locked integer;
  v_count integer;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select * into v_room from match_rooms where id = p_room_id for update;
  if not found then raise exception 'room_not_found'; end if;
  if v_room.host_user_id <> v_uid then raise exception 'not_room_host'; end if;
  if v_room.is_settled then raise exception 'room_already_closed'; end if;

  select count(*) into v_locked
  from unnest(v_ids) as t(id)
  where not exists (
    select 1
    from personal_matches pm
    left join match_requests req on req.id = pm.source_request_id
    left join match_result_negotiations neg on neg.request_id = req.id
    where pm.id = t.id
      and pm.room_id = p_room_id
      and not pm.is_perspective
      and jsonb_array_length(pm.set_scores) = 0
      and (
        (pm.source_type = 'confirmation'
           and req.origin = 'lineup'
           and req.status = 'accepted'
           and jsonb_array_length(req.set_scores) = 0
           and coalesce(neg.result_status, 'none') = 'none'
           and not exists (
             select 1 from personal_matches x
             where x.source_request_id = req.id and jsonb_array_length(x.set_scores) > 0
           ))
        or (pm.source_type = 'direct' and pm.origin = 'lineup' and pm.source_request_id is null)
      )
  );
  if v_locked > 0 then raise exception 'lineup_locked'; end if;

  if array_length(v_ids, 1) is not null then
    select array_agg(pm.source_request_id) into v_req_ids
    from personal_matches pm
    where pm.id = any(v_ids) and pm.source_request_id is not null;
    if v_req_ids is not null then
      delete from personal_matches where source_request_id = any(v_req_ids);
      delete from match_requests where id = any(v_req_ids);
    end if;
    delete from personal_matches
    where id = any(v_ids) and source_type = 'direct' and origin = 'lineup';
  end if;

  v_count := public.insert_room_lineup_games(p_room_id, coalesce(p_games, '[]'::jsonb));
  perform public.recompute_match_room_settled(p_room_id);
  return v_count;
end;
$$;

-- 4c) invite_room_members (0068 §5 본문 + 정산 가드 — N-3)
--- 0077 머리말은 "초대는 이미 막힌다"고 적었지만 실제로는 UI만 숨기고 있었다.
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

-- 4d) kick_room_member (0077 §2 본문 + room_closed)
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
  if v_room.closed_at is not null then raise exception 'room_closed'; end if;

  select * into v_m from match_room_members
  where room_id = p_room_id and user_id = p_target_user_id for update;
  if not found then raise exception 'target_not_room_member'; end if;
  if v_m.role = 'host' then raise exception 'cannot_kick_host'; end if;
  if v_m.status = 'removed' then return; end if;

  if public.room_member_has_games(p_room_id, p_target_user_id) then
    raise exception 'member_has_games';
  end if;

  update match_room_members
  set status = 'removed', responded_at = now()
  where id = v_m.id;

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

-- 4e) enter_match_room (0082 §3 본문 + room_closed) — 닫힌 방에 새 참가자는 할 일이 없다
create or replace function public.enter_match_room(p_room_id uuid, p_password text)
returns void
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_room match_rooms%rowtype;
  v_hash text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select * into v_room from match_rooms where id = p_room_id;
  if not found then raise exception 'room_not_found'; end if;
  if not v_room.is_listed then raise exception 'room_not_listed'; end if;
  if v_room.closed_at is not null then raise exception 'room_closed'; end if;
  select s.password_hash into v_hash from match_room_secrets s where s.room_id = p_room_id;
  if not found then raise exception 'room_not_found'; end if;
  if crypt(coalesce(p_password, ''), v_hash) <> v_hash then raise exception 'wrong_password'; end if;
  perform public.join_match_room_as_player(p_room_id, v_uid);
end;
$$;

-- ── 5) 정책 — 닫힌 방의 자유 기록은 소유자도 고치지 못한다 (K-9 부수 해소) ──
--- 앱 insert는 0077이 이미 정산 방을 막는다. 수정·삭제는 소유자 조건뿐이라 정산 뒤에도 direct 행을
--- 지워 방을 미정산으로 되돌릴 수 있었다(recompute가 이제 room_closed로 막지만 정책이 먼저 사람 말을 한다).
drop policy if exists personal_matches_update on public.personal_matches;
create policy personal_matches_update on public.personal_matches
  for update using (
    user_id = auth.uid()
    and not exists (select 1 from public.match_rooms r where r.id = room_id and r.closed_at is not null)
  )
  with check (
    user_id = auth.uid()
    and (room_id is null or public.is_room_participant(room_id))
  );

drop policy if exists personal_matches_delete on public.personal_matches;
create policy personal_matches_delete on public.personal_matches
  for delete using (
    user_id = auth.uid()
    and not exists (select 1 from public.match_rooms r where r.id = room_id and r.closed_at is not null)
  );

-- ── 6) get_match_room_detail — room jsonb에 closedAt (0082 §5 본문 + 키 하나) ──
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
      'closedAt', v_room.closed_at,
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

-- ── 7) cleanup 트리거 — 닫힌 방은 마지막 자유 기록을 지워도 사라지지 않는다 ──
--- 0048 §6은 방을 참조하는 행이 0건이면 방을 지운다. 닫힌 방에서 그것이 먼저 돌면 방이 조용히 사라져
--- recompute의 room_closed 초크포인트가 볼 방이 없다(롤백 스모크가 잡았다). 정책 5)가 앱의 DELETE를 먼저
--- 막지만 security definer 경로까지 같은 코드로 거절해야 한다.
create or replace function public.cleanup_match_room_on_personal_match_delete()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if exists (select 1 from match_rooms r where r.id = old.room_id and r.closed_at is not null) then
    raise exception 'room_closed';
  end if;
  if exists (select 1 from personal_matches where room_id = old.room_id and id <> old.id)
     or exists (select 1 from rotation_sessions where room_id = old.room_id)
     or exists (select 1 from match_requests where room_id = old.room_id) then
    return null;
  end if;
  delete from match_rooms where id = old.room_id and host_user_id = old.user_id;
  return null;
end;
$$;
