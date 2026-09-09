-- 0066_room_lineup.sql — 매칭 룸 자동 대진표 (Week 40)
--
-- 지금까지 방 안에서 게임을 만드는 두 경로는 모두 **호출자를 앵커**로 삼는다:
--   create_room_game        — requester = auth.uid()
--   finalize_rotation_session — 슬롯에 호출자가 오면 invalid_games (0064 §슬롯 검사)
-- 호출자가 곧 네 번째 선수라는 전제다. 참가자가 5명 이상인 방에서는 대진을 짠 사람도 언젠가
-- 쉬므로, 지금 구조로는 **"내가 안 뛰는 게임"을 저장할 방법이 아예 없다.**
--
-- create_room_lineup은 create_room_game(0049)을 "호출자가 아닌 사람을 requester로"
-- 일반화한 형태다. 내부는 materialize_accepted_request를 그대로 쓰므로 그 뒤의 파이프라인
-- (게임 카드 → 결과 입력 → 제안·확인·이의 → 정산 → 개인 경기 결과 이동)이 통째로 재사용된다.
-- 스코어가 없으니 propose_match_result는 부르지 않는다 → result_status는 'none'으로 시작하고,
-- 방 게임 목록에 '결과 미입력' 카드로 뜬다. 그것이 곧 대진표다.
--
-- 생성 권한은 **방장만**이다(중복 생성 사고 방지). 대진은 이어붙이기만 하며 기존 게임을 지우지 않는다.

-- ── 1) resolve_room_player — 슬롯 1명을 방 기준으로 정규화 ──
--- resolve_rotation_player(0050)과 같은 정신: 회원 슬롯의 이름·손잡이·NTRP는 users에서 다시 읽어
--- 클라이언트가 보낸 값을 무시한다. 회원은 방에 참가(joined)해 있어야 한다.
create or replace function public.resolve_room_player(p_room_id uuid, p jsonb)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_user_id uuid;
  v_u users%rowtype;
begin
  if p is null or jsonb_typeof(p) <> 'object' then raise exception 'invalid_games'; end if;
  v_user_id := nullif(p->>'user_id', '')::uuid;

  if v_user_id is null then
    -- 비회원(게스트) 슬롯 — 이름만 필수
    if coalesce(p->>'name', '') = '' then raise exception 'invalid_games'; end if;
    return jsonb_strip_nulls(jsonb_build_object(
      'user_id', null,
      'name', p->>'name',
      'dominant_hand', nullif(p->>'dominant_hand', ''),
      'ntrp', nullif(p->>'ntrp', '')::numeric
    ));
  end if;

  if not public.is_active_member(v_user_id) then raise exception 'invalid_participant'; end if;
  if not exists (
    select 1 from match_room_members m
    where m.room_id = p_room_id and m.user_id = v_user_id and m.status = 'joined'
  ) then
    raise exception 'participant_not_in_room';
  end if;

  select * into v_u from users where id = v_user_id;
  return jsonb_strip_nulls(jsonb_build_object(
    'user_id', v_u.id,
    'name', v_u.name,
    'dominant_hand', v_u.dominant_hand,
    'ntrp', coalesce(public.derive_public_ntrp(v_u), v_u.ntrp)
  ));
end;
$$;

revoke all on function public.resolve_room_player(uuid, jsonb) from public, anon, authenticated;

-- ── 2) create_room_lineup — 대진표를 스코어 없는 게임들로 저장한다 ──
--- p_games[i] = { "team1": [player, ...], "team2": [player, ...] }
---   player   = { "user_id": uuid|null, "name": text, "dominant_hand": text|null, "ntrp": numeric|null }
---   단식은 팀마다 1명, 복식은 2명. 방의 match_type이 팀 크기를 정한다.
create or replace function public.create_room_lineup(p_room_id uuid, p_games jsonb)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
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
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select * into v_room from match_rooms where id = p_room_id for update;
  if not found then raise exception 'room_not_found'; end if;
  -- 방장만 — 여러 명이 각자 대진표를 만들면 방이 게임으로 뒤덮인다
  if v_room.host_user_id <> v_uid then raise exception 'not_room_host'; end if;

  if p_games is null or jsonb_typeof(p_games) <> 'array'
     or jsonb_array_length(p_games) < 1 or jsonb_array_length(p_games) > 20 then
    raise exception 'invalid_games';
  end if;

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
       notes, set_scores, court_name, room_id, status, responded_at)
    values
      (v_req_id, (v_requester->>'user_id')::uuid, (v_opponent->>'user_id')::uuid,
       v_room.played_at, coalesce(v_room.played_time, '00:00'::time),
       v_room.match_type, coalesce(v_room.surface, 'other'), null, '[]'::jsonb, v_room.court_name,
       p_room_id, 'accepted', now());

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

  perform public.recompute_match_room_settled(p_room_id);
  return v_count;
end;
$$;

revoke all on function public.create_room_lineup(uuid, jsonb) from public;
revoke execute on function public.create_room_lineup(uuid, jsonb) from anon;
grant execute on function public.create_room_lineup(uuid, jsonb) to authenticated;
