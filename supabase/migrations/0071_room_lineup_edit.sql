-- 0071_room_lineup_edit.sql — 저장한 대진 고치기 (Week 42)
--
-- 0066까지 자동 대진표는 **한 방향**이었다. 저장하면 match_requests + 관점 행이 되고, 그 뒤로는
-- 되돌릴 길이 없다 — personal_matches의 RESTRICTIVE 정책(source_type <> 'confirmation', 0040)이
-- 소유자의 UPDATE·DELETE까지 막고, 앱의 유일한 참가자 편집 경로(/me/personal-matches/[id]/edit)는
-- source_request_id가 있으면 리다이렉트로 끊는다. 방장이 대진을 잘못 짜면 그 방은 그대로 굳었고,
-- 배정된 회원은 kick_room_member의 member_has_games(0070)에 걸려 내보낼 수도 없었다.
--
-- 여기서 세 가지를 더한다.
--
-- 1) match_requests.origin — 라인업이 만든 게임과 참가자가 손으로 추가한 게임(create_room_game)은
--    지금까지 저장 결과가 **구조적으로 완전히 동일**해서 구별할 수가 없었다. 표식이 없으면 방장의
--    [대진 편집]이 남이 자기 기준으로 넣은 게임까지 지운다. 기존 행은 판별할 방법이 없어 backfill
--    하지 않는다 — 'game'으로 남고 편집 대상이 되지 않는다.
--
-- 2) replace_room_lineup — 지정한 라인업 게임을 지우고 새 대진을 저장한다. 자리 하나만 바꿔도
--    requester_id·opponent_user_id가 달라져 관점의 기준 자체가 바뀌므로, 부분 UPDATE는 사실상
--    전체 재구성이다. 한 트랜잭션 안의 삭제+삽입이 더 단순하고 중간 상태가 없다.
--
-- 3) create_room_lineup에 빠져 있던 가드 둘 — 정산된 방(add_room_guest는 0069에서 막는다)과
--    미확정 로테이션 방(create_room_game은 0049에서 막는다). 어느 쪽도 라인업만 통과시키고 있었다.

-- ── 1) 라인업이 만든 요청임을 표식한다 ──
alter table public.match_requests
  add column if not exists origin text not null default 'game'
  check (origin in ('game', 'lineup'));

comment on column public.match_requests.origin is
  '만든 경로 — game: 참가자가 손으로 추가(create_room_game) / lineup: 방장의 자동 대진표(create_room_lineup). 방장이 통째로 고칠 수 있는 것은 lineup뿐이다.';

-- ── 2) insert_room_lineup_games — 저장 루프 (0066의 본문을 추출) ──
--- 자격 검사는 하지 않는다. 부르는 쪽(create_room_lineup·replace_room_lineup)이 이미 방장을 확인했다.
--- p_games[i] = { "team1": [player, ...], "team2": [player, ...] }
---   player   = { "user_id": uuid|null, "name": text, "dominant_hand": text|null, "ntrp": numeric|null }
create or replace function public.insert_room_lineup_games(p_room_id uuid, p_games jsonb)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_room match_rooms%rowtype;
  v_is_doubles boolean;
  v_team_size integer;
  v_count integer := 0;
  g jsonb;
  v_slots jsonb[];
  v_keys text[];
  v_slot jsonb;
  v_requester jsonb; v_partner jsonb; v_opponent jsonb; v_opponent2 jsonb;
  v_req_id uuid;
  i integer;
begin
  if p_games is null or jsonb_typeof(p_games) <> 'array' or jsonb_array_length(p_games) > 20 then
    raise exception 'invalid_games';
  end if;
  -- 0건은 정상이다 — replace가 "대진을 전부 지운다"를 이렇게 표현한다
  if jsonb_array_length(p_games) = 0 then return 0; end if;

  select * into v_room from match_rooms where id = p_room_id;
  if not found then raise exception 'room_not_found'; end if;

  v_is_doubles := v_room.match_type <> 'singles';
  v_team_size := case when v_is_doubles then 2 else 1 end;

  for g in select value from jsonb_array_elements(p_games) loop
    if jsonb_typeof(g->'team1') <> 'array' or jsonb_typeof(g->'team2') <> 'array'
       or jsonb_array_length(g->'team1') <> v_team_size
       or jsonb_array_length(g->'team2') <> v_team_size then
      raise exception 'invalid_games';
    end if;

    -- 슬롯 정규화: team1 먼저, team2 다음 (회원 값은 users에서 다시 읽는다)
    v_slots := '{}';
    for v_slot in select value from jsonb_array_elements(g->'team1') loop
      v_slots := v_slots || public.resolve_room_player(p_room_id, v_slot);
    end loop;
    for v_slot in select value from jsonb_array_elements(g->'team2') loop
      v_slots := v_slots || public.resolve_room_player(p_room_id, v_slot);
    end loop;

    -- 한 게임에 같은 사람이 두 번 오면 안 된다 (회원은 id, 비회원은 이름이 기준)
    v_keys := '{}';
    for i in 1 .. array_length(v_slots, 1) loop
      v_keys := v_keys || coalesce(
        'id:' || (v_slots[i]->>'user_id'),
        'name:' || lower(btrim(v_slots[i]->>'name'))
      );
    end loop;
    if array_length(v_keys, 1) <> (select count(distinct k) from unnest(v_keys) k) then
      raise exception 'duplicate_players';
    end if;

    -- 각 팀에 회원이 최소 1명 — match_requests.requester_id·opponent_user_id가 NOT NULL이다
    v_requester := null; v_partner := null; v_opponent := null; v_opponent2 := null;
    for i in 1 .. v_team_size loop
      if v_slots[i]->>'user_id' is not null and v_requester is null then
        v_requester := v_slots[i];
      else
        v_partner := v_slots[i];
      end if;
    end loop;
    for i in v_team_size + 1 .. v_team_size * 2 loop
      if v_slots[i]->>'user_id' is not null and v_opponent is null then
        v_opponent := v_slots[i];
      else
        v_opponent2 := v_slots[i];
      end if;
    end loop;
    if v_requester is null or v_opponent is null then raise exception 'invalid_games'; end if;
    if v_is_doubles and (v_partner is null or v_opponent2 is null) then raise exception 'invalid_games'; end if;

    -- 요청 메타는 전부 방에서 복사한다 — 클라이언트가 날짜·코트를 위조할 수 없다
    v_req_id := gen_random_uuid();
    insert into match_requests
      (id, requester_id, opponent_user_id, played_at, played_time, match_type, surface,
       notes, set_scores, court_name, room_id, status, responded_at, origin)
    values
      (v_req_id, (v_requester->>'user_id')::uuid, (v_opponent->>'user_id')::uuid,
       v_room.played_at, coalesce(v_room.played_time, '00:00'::time),
       v_room.match_type, coalesce(v_room.surface, 'other'), null, '[]'::jsonb, v_room.court_name,
       p_room_id, 'accepted', now(), 'lineup');

    if v_is_doubles then
      insert into match_request_participants (request_id, role, user_id, name, dominant_hand, ntrp_snapshot)
      values (v_req_id, 'partner', nullif(v_partner->>'user_id', '')::uuid, v_partner->>'name',
              nullif(v_partner->>'dominant_hand', ''), nullif(v_partner->>'ntrp', '')::numeric);
      insert into match_request_participants (request_id, role, user_id, name, dominant_hand, ntrp_snapshot)
      values (v_req_id, 'opponent2', nullif(v_opponent2->>'user_id', '')::uuid, v_opponent2->>'name',
              nullif(v_opponent2->>'dominant_hand', ''), nullif(v_opponent2->>'ntrp', '')::numeric);
    end if;

    -- 회원 참가자 전원에게 관점 행. 스코어가 없으므로 result_status는 'none'으로 시작한다
    perform public.materialize_accepted_request(v_req_id);
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.insert_room_lineup_games(uuid, jsonb) from public, anon, authenticated;

-- ── 3) create_room_lineup — 자격·가드만 남기고 저장은 위임한다 ──
create or replace function public.create_room_lineup(p_room_id uuid, p_games jsonb)
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
  -- 정산된 방에 게임을 더하면 is_settled가 뒤집혀 방이 '진행 중'으로 되살아난다 (0069와 같은 눈높이)
  if v_room.is_settled then raise exception 'room_already_closed'; end if;
  -- 미확정 로테이션 방은 게임 빌더(finalize)가 담당한다 (0049와 같은 눈높이)
  if exists (select 1 from rotation_sessions where room_id = p_room_id) then raise exception 'room_not_ready'; end if;

  if p_games is null or jsonb_typeof(p_games) <> 'array' or jsonb_array_length(p_games) < 1 then
    raise exception 'invalid_games';
  end if;

  v_count := public.insert_room_lineup_games(p_room_id, p_games);
  perform public.recompute_match_room_settled(p_room_id);
  return v_count;
end;
$$;

revoke all on function public.create_room_lineup(uuid, jsonb) from public;
revoke execute on function public.create_room_lineup(uuid, jsonb) from anon;
grant execute on function public.create_room_lineup(uuid, jsonb) to authenticated;

-- ── 4) get_room_lineup_requests — 지금 고칠 수 있는 대진이 무엇인지 ──
--- 방장은 자기가 안 뛰는 게임의 요청 행을 직접 읽을 수 없다(match_requests_select는 당사자 둘만).
--- 그래서 상세 RPC와 별개로 이 목록을 준다. 편집 버튼을 그릴지도 이 결과가 정한다.
create or replace function public.get_room_lineup_requests(p_room_id uuid)
returns table (game_id uuid, request_id uuid)
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room match_rooms%rowtype;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select * into v_room from match_rooms where id = p_room_id;
  if not found then raise exception 'room_not_found'; end if;
  if v_room.host_user_id <> v_uid then raise exception 'not_room_host'; end if;

  return query
    select pm.id, req.id
    from personal_matches pm
    join match_requests req on req.id = pm.source_request_id
    left join match_result_negotiations neg on neg.request_id = req.id
    where pm.room_id = p_room_id
      and not pm.is_perspective
      and req.origin = 'lineup'
      and req.status = 'accepted'
      and jsonb_array_length(pm.set_scores) = 0
      and coalesce(neg.result_status, 'none') = 'none'
    order by pm.created_at;
end;
$$;

revoke all on function public.get_room_lineup_requests(uuid) from public;
revoke execute on function public.get_room_lineup_requests(uuid) from anon;
grant execute on function public.get_room_lineup_requests(uuid) to authenticated;

-- ── 5) replace_room_lineup — 라인업 게임을 지우고 새 대진을 넣는다 ──
--- p_request_ids가 빈 배열이면 순수 추가(create와 같다), p_games가 빈 배열이면 순수 삭제.
create or replace function public.replace_room_lineup(
  p_room_id uuid, p_request_ids uuid[], p_games jsonb
)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room match_rooms%rowtype;
  v_ids uuid[] := coalesce(p_request_ids, '{}');
  v_locked integer;
  v_count integer;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select * into v_room from match_rooms where id = p_room_id for update;
  if not found then raise exception 'room_not_found'; end if;
  if v_room.host_user_id <> v_uid then raise exception 'not_room_host'; end if;
  if exists (select 1 from rotation_sessions where room_id = p_room_id) then raise exception 'room_not_ready'; end if;

  -- 고칠 수 있는 것만 고친다. 스코어가 붙었거나 결과 협상이 시작된 게임의 자리를 바꾸면
  -- 이미 확인한 좌석의 동의가 **다른 사람 경기**에 붙는다. 손으로 추가한 게임(origin='game')도
  -- 그 사람 기준의 기록이라 방장이 건드리지 않는다.
  select count(*) into v_locked
  from unnest(v_ids) as t(id)
  where not exists (
    select 1
    from match_requests req
    left join match_result_negotiations neg on neg.request_id = req.id
    where req.id = t.id
      and req.room_id = p_room_id
      and req.origin = 'lineup'
      and req.status = 'accepted'
      and jsonb_array_length(req.set_scores) = 0
      and coalesce(neg.result_status, 'none') = 'none'
      and not exists (
        select 1 from personal_matches pm
        where pm.source_request_id = req.id and jsonb_array_length(pm.set_scores) > 0
      )
  );
  if v_locked > 0 then raise exception 'lineup_locked'; end if;

  if array_length(v_ids, 1) is not null then
    -- 관점 행이 먼저다 — source_request_id가 on delete set null이라 요청부터 지우면
    -- 개인 기록이 고아로 남아 방 상세에 유령 게임으로 계속 뜬다.
    delete from personal_matches where source_request_id = any(v_ids);
    -- 참가자·협상 행은 request FK의 cascade가 걷어간다
    delete from match_requests where id = any(v_ids);
  end if;

  v_count := public.insert_room_lineup_games(p_room_id, coalesce(p_games, '[]'::jsonb));
  perform public.recompute_match_room_settled(p_room_id);
  return v_count;
end;
$$;

revoke all on function public.replace_room_lineup(uuid, uuid[], jsonb) from public;
revoke execute on function public.replace_room_lineup(uuid, uuid[], jsonb) from anon;
grant execute on function public.replace_room_lineup(uuid, uuid[], jsonb) to authenticated;
