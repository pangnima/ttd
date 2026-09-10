-- 0072_room_lineup_rotation_fix.sql — 자동 대진표를 로테이션 방에 돌려준다 (Week 42)
--
-- 0071이 `create_room_lineup`·`replace_room_lineup`에 넣은 가드 한 줄을 되돌린다.
--
--   if exists (select 1 from rotation_sessions where room_id = p_room_id) then raise exception 'room_not_ready'; end if;
--
-- 근거로 삼은 것은 create_room_game(0049:327)이 같은 조건을 막는다는 대칭성이었는데, **두 함수는
-- 목적이 다르다.**
--   · create_room_game    — 참가자가 자기가 친 게임을 **사후 기록**한다. 로테이션 방에서는 빌더
--                           (finalize_rotation_session)가 그 역할을 하므로 중복 경로를 막는 게 옳다.
--   · create_room_lineup  — 방장이 경기 **전에 대진을 짠다**. 0066 머리말이 이 기능의 동기를
--                           "참가자가 5명 이상인 방에서는 대진을 짠 사람도 언젠가 쉬므로 '내가 안 뛰는
--                           게임'을 저장할 방법이 없다"고 적었는데, 그게 바로 로테이션 방의 상황이다.
--                           **로테이션 방이야말로 자동 대진표의 주 무대다.**
--
-- 파급도 컸다. sourceKindOf(create-match.ts)는 `format === 'doubles' ? 'rotation' : 'direct'`라
-- 다른 분기가 없다 — **복식으로 만든 방은 예외 없이 로테이션 방**이므로, 저 한 줄이 복식 방 전체에서
-- 자동 대진표를 봉쇄했다. 게다가 버튼 노출 조건(room-games-section)은 방식을 보지 않아 화면에는
-- 버튼도 미리보기도 그대로 나왔다. "눌러도 아무 일이 없다"가 그래서 생겼다.
--
-- ⚠ 다음에 이 가드를 다시 넣고 싶어지면 위 두 문단을 먼저 읽을 것. 로테이션 방을 막으면 기능이 죽는다.
--
-- 같은 커밋에서 앱도 고친다 — 남기기로 한 `room_already_closed`는 화면이 그 상태에서 버튼을 감춰
-- (canCreateRoomLineup) 서버 가드와 노출 조건이 어긋나지 않게 한다. 이번 사고의 구조가 그 어긋남이었다.

-- ── create_room_lineup — 방장 ∧ 정산 전이면 방식과 무관하게 대진을 짤 수 있다 ──
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

-- ── replace_room_lineup — 같은 이유로 방식 검사를 걷는다. 잠금 판정(lineup_locked)은 그대로 ──
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
