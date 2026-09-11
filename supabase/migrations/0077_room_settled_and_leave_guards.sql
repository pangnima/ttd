-- 0077_room_settled_and_leave_guards.sql — 정산된 방의 게임 추가 차단 · 배정된 회원의 방 나가기 차단 (Week 50)
--
-- 첫 전수 E2E(docs/e2e/, Week 49)가 잡은 어긋남 둘을 서버 가드로 닫는다. 둘 다 "노출 조건과 가드는 거울"
-- (0072)의 원칙이 한쪽에만 있던 자리다.
--
-- F-5 — 정산된(종료) 방에서 초대·게스트·자동 대진표는 room_already_closed로 막히는데 **게임 추가만** 열려
--   있었다(create_room_game에 is_settled 검사 없음, 전원 비회원 상대의 자유 기록은 RLS personal_matches_insert가
--   참가 여부만 봄). 붙이면 방이 조용히 미정산으로 돌아가 「종료」 칩과 어긋난다. 재개는 [결과 정정]이 맡는다.
--
-- F-13 / Week 41 잔여 — 0070이 강퇴에는 member_has_games 가드를 걸었지만 스스로 나가는 쪽은 비워 뒀다.
--   결과 미입력 게임을 둔 채 나가면 상세는 게이트에 막히고(declined는 not_member), 뱃지는 그 게임의 차례를
--   계속 세어 「참여 중인 매칭」 카드 0 · 뱃지 1이 된다. 좌석 만장일치가 영영 채워지지 않는 교착이기도 하다.
--   강퇴와 같은 자격 술어를 나가기에도 건다 — 기록이 남은 사람은 결과를 마무리하거나 방장이 대진을 고쳐야 나갈 수 있다.
--
-- 술어는 0070에 인라인이었다. 두 RPC가 같은 뜻을 쓰므로 함수로 뽑고 둘 다 그것을 부른다.

-- ── 1) room_member_has_games — 이 방의 경기에 배정된 회원인가 (0070 §kick 인라인 술어 추출) ──
--- 확정 여부를 가리지 않는다: 확정된 경기의 상대도 그 방의 기록에 남아 있는 사람이고,
--- 미확정이면 그의 확인 없이는 결과가 확정될 수 없다(좌석 만장일치, 0060).
create or replace function public.room_member_has_games(p_room_id uuid, p_user_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from personal_matches pm
    where pm.room_id = p_room_id
      and (pm.user_id = p_user_id or exists (
        select 1 from personal_match_participants p
        where p.match_id = pm.id and p.user_id = p_user_id
      ))
  ) or exists (
    select 1 from match_requests r
    where r.room_id = p_room_id
      and (r.requester_id = p_user_id or r.opponent_user_id = p_user_id or exists (
        select 1 from match_request_participants p
        where p.request_id = r.id and p.user_id = p_user_id
      ))
  );
$$;

revoke all on function public.room_member_has_games(uuid, uuid) from public, anon, authenticated;

-- ── 2) kick_room_member — 0070 본문, 술어만 함수 호출로 ──
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

  -- 0070: 이 방의 경기에 이미 배정된 사람은 내보낼 수 없다.
  if public.room_member_has_games(p_room_id, p_target_user_id) then
    raise exception 'member_has_games';
  end if;

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

-- ── 3) leave_match_room — 0068 본문 + 배정된 회원 차단 ──
--- 예외 코드를 kick과 다르게 둔다(leave_member_has_games) — 화면 문구가 "내보낼 수 없습니다"와 달라야 한다.
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

  -- 0077: 이 방의 경기에 배정된 사람은 나갈 수 없다(강퇴와 대칭). 나가면 결과를 확인할 길이 없어
  -- 좌석 만장일치가 영영 비고, 뱃지는 그 차례를 계속 센다.
  if public.room_member_has_games(p_room_id, v_uid) then raise exception 'leave_member_has_games'; end if;

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

-- ── 4) create_room_game — 0049 §4 본문 + 정산 가드 ──
--- 노출 조건 canAddRoomGame(room-context.ts)의 거울. 초대·게스트·자동 대진표(0069·0071)와 같은 코드.
create or replace function public.create_room_game(
  p_room_id uuid,
  p_opponent_user_id uuid,
  p_partner jsonb default null,
  p_opponent2 jsonb default null,
  p_replace_match_id uuid default null
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room match_rooms%rowtype;
  v_src match_requests%rowtype;
  v_id uuid := gen_random_uuid();
  v_is_doubles boolean;
  v_partner_user_id uuid;
  v_opp2_user_id uuid;
  v_seed personal_matches%rowtype;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select * into v_room from match_rooms where id = p_room_id;
  if not found then raise exception 'room_not_found'; end if;
  if not public.is_room_participant(p_room_id) then raise exception 'not_room_member'; end if;
  -- 0077: 정산된 방에는 게임을 붙이지 않는다 — 재개는 [결과 정정]
  if v_room.is_settled then raise exception 'room_already_closed'; end if;

  -- 미확정 로테이션 방은 게임 빌더(finalize)가 담당한다
  if exists (select 1 from rotation_sessions where room_id = p_room_id) then raise exception 'room_not_ready'; end if;
  if v_room.source_kind = 'confirmation' then
    select * into v_src from match_requests where room_id = p_room_id order by created_at limit 1;
    if not found or v_src.status <> 'accepted' then raise exception 'room_not_ready'; end if;
  end if;

  if v_uid = p_opponent_user_id then raise exception 'cannot_request_self'; end if;
  if not public.is_active_member(p_opponent_user_id) then raise exception 'invalid_opponent'; end if;
  if not exists (
    select 1 from match_room_members m
    where m.room_id = p_room_id and m.user_id = p_opponent_user_id and m.status = 'joined'
  ) then
    raise exception 'opponent_not_in_room';
  end if;

  v_is_doubles := v_room.match_type <> 'singles';
  if v_is_doubles then
    if p_partner is null or p_opponent2 is null
       or coalesce(p_partner->>'name', '') = '' or coalesce(p_opponent2->>'name', '') = '' then
      raise exception 'doubles_players_required';
    end if;
    v_partner_user_id := nullif(p_partner->>'user_id', '')::uuid;
    v_opp2_user_id := nullif(p_opponent2->>'user_id', '')::uuid;
    if v_partner_user_id is not null and v_partner_user_id in (v_uid, p_opponent_user_id) then
      raise exception 'invalid_partner';
    end if;
    if v_opp2_user_id is not null and v_opp2_user_id in (v_uid, p_opponent_user_id) then
      raise exception 'invalid_opponent2';
    end if;
    if v_partner_user_id is not null and v_opp2_user_id is not null and v_partner_user_id = v_opp2_user_id then
      raise exception 'duplicate_players';
    end if;
    -- 회원 참가자는 방에 들어와 있어야 한다 (비회원 이름 입력은 그대로 허용)
    if v_partner_user_id is not null and not exists (
      select 1 from match_room_members m
      where m.room_id = p_room_id and m.user_id = v_partner_user_id and m.status = 'joined'
    ) then
      raise exception 'participant_not_in_room';
    end if;
    if v_opp2_user_id is not null and not exists (
      select 1 from match_room_members m
      where m.room_id = p_room_id and m.user_id = v_opp2_user_id and m.status = 'joined'
    ) then
      raise exception 'participant_not_in_room';
    end if;
  end if;

  insert into match_requests
    (id, requester_id, opponent_user_id, played_at, played_time, match_type, surface,
     notes, set_scores, court_name, room_id, status, responded_at)
  values
    (v_id, v_uid, p_opponent_user_id, v_room.played_at, coalesce(v_room.played_time, '00:00'::time),
     v_room.match_type, coalesce(v_room.surface, 'other'), null, '[]'::jsonb, v_room.court_name,
     p_room_id, 'accepted', now());

  if v_is_doubles then
    insert into match_request_participants (request_id, role, user_id, name, dominant_hand, ntrp_snapshot)
    values (v_id, 'partner', v_partner_user_id, p_partner->>'name',
            nullif(p_partner->>'dominant_hand', ''), nullif(p_partner->>'ntrp', '')::numeric);
    insert into match_request_participants (request_id, role, user_id, name, dominant_hand, ntrp_snapshot)
    values (v_id, 'opponent2', v_opp2_user_id, p_opponent2->>'name',
            nullif(p_opponent2->>'dominant_hand', ''), nullif(p_opponent2->>'ntrp', '')::numeric);
  end if;

  perform public.materialize_accepted_request(v_id);

  -- 모집 중이던 내 자유 기록(seed)을 이 게임으로 치환한다 — 결과가 없는 내 direct 행만
  if p_replace_match_id is not null then
    select * into v_seed from personal_matches
    where id = p_replace_match_id and user_id = v_uid and room_id = p_room_id
      and source_type = 'direct' and source_request_id is null
      and jsonb_array_length(set_scores) = 0;
    if not found then raise exception 'replace_not_allowed'; end if;
    delete from personal_matches where id = p_replace_match_id;
  end if;

  return v_id;
end;
$$;

revoke all on function public.create_room_game(uuid, uuid, jsonb, jsonb, uuid) from public;
revoke execute on function public.create_room_game(uuid, uuid, jsonb, jsonb, uuid) from anon;
grant execute on function public.create_room_game(uuid, uuid, jsonb, jsonb, uuid) to authenticated;

-- ── 5) personal_matches_insert — 정산된 방에는 자유 기록도 붙이지 않는다 (0054 §1 대체) ──
--- 전원 비회원 상대의 방 게임은 RPC가 아니라 앱 insert라 이 정책이 유일한 서버 가드다.
--- 앱 액션(createPersonalMatchesAction)이 먼저 같은 뜻을 사람 말로 거절하고, 정책은 안전망이다.
drop policy if exists personal_matches_insert on public.personal_matches;
create policy personal_matches_insert on public.personal_matches
  for insert with check (
    user_id = auth.uid()
    and (
      room_id is null
      or (
        public.is_room_participant(room_id)
        and not exists (select 1 from public.match_rooms r where r.id = room_id and r.is_settled)
      )
    )
  );
