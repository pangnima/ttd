-- 20260910091502 0075_room_lineup_order
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
-- 0075: 자동 대진표의 저장 순서를 보존한다
--
-- 룸의 라운드·코트는 저장되지 않고 **게임 목록의 순서에서 파생**한다(court-slots.ts, Week 44).
-- 그런데 create_room_lineup이 넣는 게임은 전부 같은 created_at을 가졌다 — now()가 트랜잭션 시각이라
-- 한 번에 넣은 8게임이 같은 값이 되고, 상세 RPC의 order by가 그 안에서는 아무 순서나 돌려준다.
-- 그래서 방장이 라운드 중복 없이 뽑아 저장해도 화면에서는 "같은 라운드에 두 번" 이 나왔다.
--
-- clock_timestamp()는 문장마다 흐르므로 게임마다 다른 값이 되고, 기존 정렬이 그대로 대진 순서가 된다.
-- 스키마 변경은 없다 — created_at이 원래 뜻하던 값(실제 삽입 시각)을 쓰게 만드는 것뿐이다.
-- 0075 이전에 저장된 대진은 여전히 같은 값을 공유하므로 순서가 임의다(다시 뽑아 저장하면 정리된다).

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
    -- created_at은 now()가 아니라 clock_timestamp()다. now()는 트랜잭션 시각이라 한 번에 넣은
    -- 게임들이 **전부 같은 값**을 갖고, 그러면 목록 정렬(group_seq nulls first, created_at)이
    -- 대진 순서를 보존하지 못한다 — 라운드·코트를 순서에서 파생하는 화면이 곧바로 어긋난다.
    v_req_id := gen_random_uuid();
    v_stamp := clock_timestamp();
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
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.insert_room_lineup_games(uuid, jsonb) from public, anon, authenticated;

-- create_room_lineup은 건드리지 않는다. 0071의 정의를 그대로 다시 넣으면 0072가 되돌린
-- room_not_ready 가드가 되살아나 복식 방(= 로테이션 방) 전체에서 자동 대진표가 다시 막힌다.
-- 저장 루프만 교체하면 create_room_lineup·replace_room_lineup 두 경로가 함께 고쳐진다.
