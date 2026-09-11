-- 0076_room_lineup_free_games.sql — 자동 대진표: 회원이 한 팀에만 있는 게임을 자유 기록으로 저장 (Week 48)
--
-- 남자25의 방(단식 · 방장 1명 + 게스트 4명)에서 자동 대진표가 아무 게임도 만들지 못했다. 원인은 버그가
-- 아니라 저장 모델이다 — create_room_lineup(0066)은 게임마다 match_requests 행을 만들고 requester_id·
-- opponent_user_id가 NOT NULL이라 **각 팀에 회원 1명**(단식은 둘 다 회원)이 하드 제약이었다. 그래서
-- 0069가 게스트를 배치 대상에 넣었어도, 회원이 2명 미만인 방에서는 어떤 게임도 성립하지 않았다.
--
-- 방 안 회원 vs 비회원 게임은 이미 **자유 기록**으로 존재한다(personal_matches direct + room_id, 0054).
-- 그래서 저장 루프에 분기 하나를 더한다: 양 팀에 회원이 있으면 종전대로 match_requests, 한 팀에만
-- 있으면 그 팀의 첫 회원을 소유자로 personal_matches(source_type='direct') 행 하나 + 참가자 행.
-- 회원이 한 명도 없는 게임은 여전히 invalid_games — personal_matches는 '나' 관점 행이라 소유자가 뛰지
-- 않는 게임을 표현할 수 없다.
--
-- 자유 기록의 의미론을 그대로 상속한다 — 소유자만 손대고, 확인해 줄 상대가 없으니 결과를 넣으면 곧 확정.
-- 관점 복사본은 만들지 않는다(만들면 소유자 행의 결과 입력이 복사본에 전파되지 않아 유령이 남는다).
--
-- 편집(0071)과의 정합: [대진 편집]은 match_requests.origin='lineup'만 봤다. direct 라인업 행도 보고 지울 수
-- 있어야 하므로 personal_matches에 같은 origin 컬럼을 두고, 교체 RPC의 키를 request_id에서 **game_id**
-- (personal_matches 대표 행 id)로 바꾼다 — direct 행은 request가 없고, 앱은 이미 game id를 들고 있다.
--
-- ⚠ cleanup 트리거: personal_matches_cleanup_room(0046)은 direct 행 삭제 시 방을 참조하는 행이 0건이고
-- 방장 소유면 방을 지운다. 방장+게스트 방의 라인업은 전부 방장 소유 direct라 [대진 편집]으로 전부 지우면
-- 방이 사라진다. 라인업 행은 방의 파생물이지 출처가 아니므로 origin='game'에만 걸리게 좁힌다.
--
-- ⚠ create_room_lineup은 건드리지 않는다(0072·0075와 같은 이유 — 0071 정의를 복사하면 room_not_ready
-- 가드가 되살아난다). 저장 루프만 바꾸면 create·replace 두 경로가 함께 고쳐진다.

-- ── 1) personal_matches.origin — match_requests.origin(0071)의 거울 ──
alter table public.personal_matches
  add column if not exists origin text not null default 'game'
  check (origin in ('game', 'lineup'));

comment on column public.personal_matches.origin is
  '만든 경로 — game: 참가자/소유자가 손으로 저장(앱 insert·create_room_game seed) / lineup: 방장의 자동 대진표가 만든 자유 기록(insert_room_lineup_games direct 경로, 0076). match_requests.origin(0071)의 거울. 방장이 [대진 편집]으로 통째로 지울 수 있는 것은 lineup뿐이다. backfill 없음 — 0076 이전 direct 행은 전부 손으로 만든 것이다.';

-- ── 2) cleanup 트리거 — 라인업 자유 기록 삭제는 방을 지우지 않는다 ──
drop trigger if exists personal_matches_cleanup_room on public.personal_matches;
create trigger personal_matches_cleanup_room
  after delete on public.personal_matches
  for each row when (old.room_id is not null and old.source_type = 'direct' and old.origin = 'game')
  execute function public.cleanup_match_room_on_personal_match_delete();

-- ── 3) insert_room_lineup_games — 회원 분포로 저장 경로를 가른다 ──
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
  v_owner jsonb; v_owner_id uuid;
  v_t1_members integer; v_t2_members integer;
  v_lo integer; v_hi integer; v_ol integer; v_oh integer;
  v_req_id uuid;
  v_pm_id uuid;
  v_stamp timestamptz;
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

    -- 팀별 회원 수 — 저장 경로를 가른다
    v_t1_members := 0; v_t2_members := 0;
    for i in 1 .. v_team_size loop
      if v_slots[i]->>'user_id' is not null then v_t1_members := v_t1_members + 1; end if;
    end loop;
    for i in v_team_size + 1 .. v_team_size * 2 loop
      if v_slots[i]->>'user_id' is not null then v_t2_members := v_t2_members + 1; end if;
    end loop;
    -- 소유자 없는 게임은 저장할 자리가 없다
    if v_t1_members = 0 and v_t2_members = 0 then raise exception 'invalid_games'; end if;

    -- created_at은 now()가 아니라 clock_timestamp()다(0075) — 목록 순서가 곧 라운드·코트다
    v_stamp := clock_timestamp();

    if v_t1_members > 0 and v_t2_members > 0 then
      -- ── 경로 A: 양 팀에 회원 → 상호 확인 게임(match_requests). 0075 본문 그대로 ──
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
      if v_is_doubles and (v_partner is null or v_opponent2 is null) then raise exception 'invalid_games'; end if;

      -- 요청 메타는 전부 방에서 복사한다 — 클라이언트가 날짜·코트를 위조할 수 없다
      v_req_id := gen_random_uuid();
      insert into match_requests
        (id, requester_id, opponent_user_id, played_at, played_time, match_type, surface,
         notes, set_scores, court_name, room_id, status, responded_at, origin, created_at)
      values
        (v_req_id, (v_requester->>'user_id')::uuid, (v_opponent->>'user_id')::uuid,
         v_room.played_at, coalesce(v_room.played_time, '00:00'::time),
         v_room.match_type, coalesce(v_room.surface, 'other'), null, '[]'::jsonb, v_room.court_name,
         p_room_id, 'accepted', v_stamp, 'lineup', v_stamp);

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
      -- 관점 행까지 같은 시각으로 맞춘다 — 대표 게임의 순서가 곧 대진의 순서다
      update personal_matches set created_at = v_stamp where source_request_id = v_req_id;

    else
      -- ── 경로 B: 회원이 한 팀에만 → 그 팀 첫 회원 소유의 자유 기록 (0076) ──
      -- 소유팀 = 회원이 있는 팀. 상대팀은 정의상 전원 비회원(user_id null)이다.
      if v_t1_members > 0 then
        v_lo := 1;               v_hi := v_team_size;     v_ol := v_team_size + 1; v_oh := v_team_size * 2;
      else
        v_lo := v_team_size + 1; v_hi := v_team_size * 2; v_ol := 1;               v_oh := v_team_size;
      end if;

      v_owner := null; v_partner := null;
      for i in v_lo .. v_hi loop
        if v_slots[i]->>'user_id' is not null and v_owner is null then
          v_owner := v_slots[i];
        else
          v_partner := v_slots[i];   -- 복식: 회원일 수도 게스트일 수도 있다
        end if;
      end loop;
      v_opponent  := v_slots[v_ol];
      v_opponent2 := case when v_is_doubles then v_slots[v_oh] else null end;
      v_owner_id  := (v_owner->>'user_id')::uuid;

      -- 메타는 방 값을 **그대로** 복사한다(coalesce 금지) — 소유자가 방장이면 sync_match_room_from_personal_match
      -- (0049)가 insert 직후 이 행의 값을 방으로 되써 넣으므로 항등이어야 방 메타가 흔들리지 않는다.
      -- notes는 소유자 사적 기록이라 방장에게만 방 notes를, 나머지는 null(0049 규칙).
      v_pm_id := gen_random_uuid();
      insert into personal_matches
        (id, user_id, source_type, source_request_id,
         played_at, played_time, match_type, surface,
         set_scores, notes, court_name,
         room_id, rotation_session_id, group_seq, is_perspective, origin, created_at)
      values
        (v_pm_id, v_owner_id, 'direct', null,
         v_room.played_at, v_room.played_time, v_room.match_type, v_room.surface,
         '[]'::jsonb,
         case when v_owner_id = v_room.host_user_id then v_room.notes else null end,
         v_room.court_name,
         p_room_id, null, null, false, 'lineup', v_stamp);

      insert into personal_match_participants (match_id, role, user_id, name, dominant_hand, ntrp_snapshot)
      values (v_pm_id, 'opponent', nullif(v_opponent->>'user_id', '')::uuid, v_opponent->>'name',
              nullif(v_opponent->>'dominant_hand', ''), nullif(v_opponent->>'ntrp', '')::numeric);
      if v_is_doubles then
        insert into personal_match_participants (match_id, role, user_id, name, dominant_hand, ntrp_snapshot)
        values (v_pm_id, 'partner', nullif(v_partner->>'user_id', '')::uuid, v_partner->>'name',
                nullif(v_partner->>'dominant_hand', ''), nullif(v_partner->>'ntrp', '')::numeric);
        insert into personal_match_participants (match_id, role, user_id, name, dominant_hand, ntrp_snapshot)
        values (v_pm_id, 'opponent2', nullif(v_opponent2->>'user_id', '')::uuid, v_opponent2->>'name',
                nullif(v_opponent2->>'dominant_hand', ''), nullif(v_opponent2->>'ntrp', '')::numeric);
      end if;
    end if;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.insert_room_lineup_games(uuid, jsonb) from public, anon, authenticated;

-- ── 4) get_room_lineup_requests — direct 라인업 행도 편집 대상 (request_id는 null) ──
--- 시그니처는 그대로 둔다(game_id가 곧 personal_matches 대표 행 id라 별도 match_id는 중복이다).
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
    left join match_requests req on req.id = pm.source_request_id
    left join match_result_negotiations neg on neg.request_id = req.id
    where pm.room_id = p_room_id
      and not pm.is_perspective
      and jsonb_array_length(pm.set_scores) = 0
      and (
        (pm.source_type = 'confirmation' and req.origin = 'lineup'
           and req.status = 'accepted' and coalesce(neg.result_status, 'none') = 'none')
        or (pm.source_type = 'direct' and pm.origin = 'lineup')
      )
    order by pm.created_at;
end;
$$;

revoke all on function public.get_room_lineup_requests(uuid) from public;
revoke execute on function public.get_room_lineup_requests(uuid) from anon;
grant execute on function public.get_room_lineup_requests(uuid) to authenticated;

-- ── 5) replace_room_lineup — 키를 game_id로. 두 종류를 함께 잠금 검사·삭제한다 ──
--- 파라미터 이름이 바뀌므로 create or replace가 아니라 drop 후 create(오버로드가 남지 않게).
--- 본문은 0072(room_not_ready 가드 없는 판)를 잇는다.
drop function if exists public.replace_room_lineup(uuid, uuid[], jsonb);

create function public.replace_room_lineup(
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

  -- 고칠 수 있는 것만 고친다. 스코어가 붙었거나 결과 협상이 시작된 게임의 자리를 바꾸면
  -- 이미 확인한 좌석의 동의가 **다른 사람 경기**에 붙는다. 손으로 추가한 게임(origin='game')도
  -- 그 사람 기준의 기록이라 방장이 건드리지 않는다. direct 라인업 행은 스코어가 없을 때만.
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
    -- 1) 상호 확인형: 요청 id를 모은 뒤 관점 행(대표 행 포함) → 요청 행. source_request_id가
    --    on delete set null이라 요청부터 지우면 개인 기록이 고아로 남아 유령 게임으로 계속 뜬다(0071).
    select array_agg(pm.source_request_id) into v_req_ids
    from personal_matches pm
    where pm.id = any(v_ids) and pm.source_request_id is not null;
    if v_req_ids is not null then
      delete from personal_matches where source_request_id = any(v_req_ids);
      -- 참가자·협상 행은 request FK의 cascade가 걷어간다
      delete from match_requests where id = any(v_req_ids);
    end if;
    -- 2) 자유 기록형: 대표 행 삭제(참가자 행은 cascade). §2 덕에 cleanup 트리거는 돌지 않는다
    delete from personal_matches
    where id = any(v_ids) and source_type = 'direct' and origin = 'lineup';
  end if;

  v_count := public.insert_room_lineup_games(p_room_id, coalesce(p_games, '[]'::jsonb));
  perform public.recompute_match_room_settled(p_room_id);
  return v_count;
end;
$$;

revoke all on function public.replace_room_lineup(uuid, uuid[], jsonb) from public;
revoke execute on function public.replace_room_lineup(uuid, uuid[], jsonb) from anon;
grant execute on function public.replace_room_lineup(uuid, uuid[], jsonb) to authenticated;
