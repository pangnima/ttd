-- 0063 — 로테이션 참여 동의의 대칭 완성: 어느 카드로 수락해도 두 축이 함께 움직인다
--
--- 증상 — 주최자가 초대 수락을 기다리지 않고 결과를 먼저 입력하면, 초대받은 회원의 허브에
--- 같은 세션이 카드 두 장으로 뜬다(「게임 참여 확인」 + 「일정 초대」). 게임 쪽에서 [전체 수락]을
--- 누르면 게임 요청만 수락되고 세션 좌석은 pending으로 남아:
---   ① 일정 초대 카드가 잔존 — "승인했는데 또 승인하라고 한다"
---   ② canEnterRotationResult가 false — 결과 입력 권한을 못 얻는다
---   ③ 다음 게임 finalize마다 rotation_seats_accepted가 그를 미수락으로 보고 v_immediate=false
---      → 게임마다 재수락. 0057 결정 3("게임 입력 시 재수락 없음")이 이 경로에서 무너지고,
---      등록 폼이 한 약속("게임을 입력할 때 다시 수락받지는 않습니다")도 거짓이 된다.
---
--- 「승인 전 결과 입력」 자체는 버그가 아니다 — 0057이 의도적으로 만든 장치다(코트에서 다 치고 났는데
--- 한 명이 앱을 안 켰다고 스코어를 잃게 하지 않는다. 스코어는 proposed_set_scores에 선적립된다).
--- 미수락 좌석이 낀 게임은 personal_matches를 0행 만들므로 0056 불변식도 지켜지고 있다.
--- 고칠 것은 그 순서를 밟았을 때 드러나는 비대칭이다.
---
--- 근본 원인은 두 수락 RPC의 비대칭이다. respond_rotation_plan(0058 §3)은 좌석을 수락하고 그 세션의
--- pending 게임 요청까지 흡수한다 — 0058이 정확히 이 갭을 주석에 적어 두고 한 방향만 고쳤다.
--- 반대편 respond_rotation_participation(0056 §7)은 게임 요청만 응답하고 rotation_sessions를 보지
--- 않는다. 그 함수 주석이 근거를 밝힌다 — "개인 세션 행은 이미 삭제됐다". 그런데 0057 §(d)가
--- "좌석이 있는 세션은 남긴다"로 바꿔 이 전제를 무효화했고, 0056 §7은 갱신되지 않았다.
---
--- 세우는 불변식 하나:
---   로테이션 세션의 참여 동의는 rotation_session_participants 좌석이 유일한 권위이고,
---   게임 파생 요청의 좌석은 그 파생물이다. 어느 경로로 응답해도 두 축이 함께 움직인다.
--- 새 원칙이 아니라 0058이 한 방향만 적용한 규칙의 대칭 완성이다.
---
--- ⚠ 두 RPC는 서로를 호출하지 않는다(교착) — 각자 두 축을 직접 갱신하고, 어느 쪽을 먼저 불러도
--- 최종 상태가 같아야 한다. 이미 응답한 축은 건드리지 않으므로 순서 무관·멱등이다.

-- ════════════════════════════════════════════════════════════════
-- §1 backfill_rotation_perspectives — 뒤늦은 수락자에게 관점 행을 따라 붙인다
-- ════════════════════════════════════════════════════════════════
--- finalize의 폴백 분기(0057 §7c, 상대팀 전원 비회원 → 즉시 확정)는 personal_matches insert가
--- v_immediate 게이트 **바깥**에 있고 관점 복사만 게이트 안에 있다. 그래서 "미수락 회원 파트너 +
--- 상대팀 전원 비회원" 게임은 입력자 기록만 확정으로 생기고, 그 게임은 match_requests를 만들지
--- 않으므로(opponent_user_id가 not null이라 대표 없는 게임은 요청 행을 가질 수 없다) 그 회원이
--- 나중에 수락해도 영영 기록을 못 받는다. 수락 전후로 결과가 갈리는 영구 비대칭이다.
---
--- 수정 방향은 입력 차단이 아니라 따라잡기다 — 수락이 곧 동의이므로 이 시점의 행 생성은
--- 0056 불변식을 위반하지 않는다. 폴백 게임에서 회원일 수 있는 슬롯은 partner 하나뿐이다
--- (opp1·opp2 중 활성 회원이 있으면 v_rep_id가 잡혀 폴백으로 오지 않는다) — 그래서 분기가 없다.
create or replace function public.backfill_rotation_perspectives(p_session_id uuid, p_user_id uuid)
returns int
language plpgsql security definer set search_path = public
as $$
declare
  v_src personal_matches%rowtype;
  v_owner users%rowtype;
  v_me_json jsonb;
  v_opp1 jsonb;
  v_opp2 jsonb;
  v_n int := 0;
begin
  if p_session_id is null or p_user_id is null then return 0; end if;

  for v_src in
    select pm.* from personal_matches pm
    where pm.rotation_session_id = p_session_id
      and pm.is_perspective = false
      -- 요청이 있는 게임은 materialize_accepted_request가 담당한다 — 폴백 게임만 여기 온다
      and pm.source_request_id is null
      and pm.user_id <> p_user_id
      and exists (
        select 1 from personal_match_participants mp
        where mp.match_id = pm.id and mp.role = 'partner' and mp.user_id = p_user_id
      )
      and not exists (
        select 1 from personal_matches x
        where x.rotation_session_id = pm.rotation_session_id
          and x.group_seq = pm.group_seq
          and x.user_id = p_user_id
      )
  loop
    select * into v_owner from users where id = v_src.user_id;
    -- 입력자(원본 행 소유자)가 수락자 관점에서는 파트너가 된다 — finalize의 v_me_json과 같은 구성
    v_me_json := jsonb_strip_nulls(jsonb_build_object(
      'userId', v_owner.id, 'name', v_owner.name, 'hand', v_owner.dominant_hand,
      'ntrp', coalesce(public.derive_public_ntrp(v_owner), v_owner.ntrp)));

    select jsonb_strip_nulls(jsonb_build_object(
             'userId', mp.user_id, 'name', mp.name, 'hand', mp.dominant_hand, 'ntrp', mp.ntrp_snapshot))
      into v_opp1
      from personal_match_participants mp
      where mp.match_id = v_src.id and mp.role = 'opponent';

    select jsonb_strip_nulls(jsonb_build_object(
             'userId', mp.user_id, 'name', mp.name, 'hand', mp.dominant_hand, 'ntrp', mp.ntrp_snapshot))
      into v_opp2
      from personal_match_participants mp
      where mp.match_id = v_src.id and mp.role = 'opponent2';

    -- 파트너 관점 = 나↔파트너 스왑 (0057 §7c의 partner 분기와 같은 규칙)
    perform public.copy_personal_match_perspective(
      v_src.id, p_user_id, public.swap_partner_perspective(v_src.set_scores),
      v_opp1, v_me_json, v_opp2);
    v_n := v_n + 1;
  end loop;

  return v_n;
end;
$$;

revoke all on function public.backfill_rotation_perspectives(uuid, uuid) from public, anon, authenticated;

comment on function public.backfill_rotation_perspectives(uuid, uuid) is
  '로테이션 폴백 게임(상대팀 전원 비회원 → 즉시 확정)의 회원 파트너가 뒤늦게 세션 참여를 수락했을 때 그의 관점 행을 따라 만든다 (0063). 그 게임은 match_requests가 없어 materialize 경로를 타지 못하므로, 수락 RPC 둘이 이 함수를 부르는 것이 유일한 보완 경로다.';


-- ════════════════════════════════════════════════════════════════
-- §2 respond_rotation_participation — 게임 응답이 세션 좌석까지 움직인다 (0056 §7 대체)
-- ════════════════════════════════════════════════════════════════
--- 0056의 "rotation_sessions는 보지 않는다 — 개인 세션 행은 이미 삭제됐다"는 전제가 0057 §(d)에서
--- 무효화됐다. 이제 좌석이 있는 세션은 finalize 후에도 남으므로, 전제는 "항상 거짓"이 아니라
--- "조건부"다 — 좌석 0행이던 순수 개인 세션만 삭제된다. 그래서 세션 조회는 있으면 쓰고 없으면 넘긴다.
create or replace function public.respond_rotation_participation(p_rotation_session_id uuid, p_accept boolean)
returns int
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_touched boolean;
  v_n int := 0;
  v_seat_rows int := 0;
  v_session_exists boolean;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_rotation_session_id is null then raise exception 'session_not_found'; end if;

  -- 세션 행 락 — respond_rotation_plan·finalize·add/remove_rotation_session_player와 같은 락으로
  -- 동시 응답·삭제를 직렬화한다. 세션이 이미 삭제됐으면 좌석 축은 건너뛰고 요청 축만 처리한다.
  perform 1 from rotation_sessions where id = p_rotation_session_id for update;
  v_session_exists := found;

  if v_session_exists then
    update rotation_session_participants
    set participation_status = case when p_accept then 'accepted' else 'rejected' end,
        responded_at = now()
    where session_id = p_rotation_session_id and user_id = v_uid and participation_status = 'pending';
    get diagnostics v_seat_rows = row_count;

    -- 거절하면 풀에서 빠진다 — respond_rotation_plan(0058 §3)과 같은 jsonb 조작이고,
    -- 좌석을 먼저 rejected로 옮겨 두었으므로 sync 트리거가 그 좌석을 남긴다(0057 §4).
    if not p_accept and v_seat_rows > 0 then
      update rotation_sessions
      set players = coalesce((
        select jsonb_agg(e) from jsonb_array_elements(players) e
        where nullif(e->>'userId', '')::uuid is distinct from v_uid
      ), '[]'::jsonb)
      where id = p_rotation_session_id;
    end if;
  end if;

  for v_id in
    select r.id from match_requests r
    where r.rotation_session_id = p_rotation_session_id
      and r.status = 'pending'
      and (
        (r.opponent_user_id = v_uid and r.opponent_accepted_at is null)
        or exists (
          select 1 from match_request_participants p
          where p.request_id = r.id and p.user_id = v_uid and p.participation_status = 'pending'
        )
      )
    order by r.group_seq nulls last, r.created_at
  loop
    v_touched := public.mark_request_opponent_response(v_id, p_accept);
    if public.mark_request_participant_response(v_id, p_accept) then v_touched := true; end if;
    if v_touched then
      v_n := v_n + 1;
      if p_accept then perform public.maybe_materialize_request(v_id); end if;
    end if;
  end loop;

  -- 좌석만 pending이고 게임 요청이 하나도 없을 수 있다(주최자가 아직 입력하지 않은 세션) —
  -- 좌석을 실제로 바꿨으면 성공이다. 둘 다 0이면 응답할 것이 없었다.
  if v_n = 0 and v_seat_rows = 0 then raise exception 'no_pending_requests'; end if;

  if p_accept then
    perform public.backfill_rotation_perspectives(p_rotation_session_id, v_uid);
  end if;

  return v_n;
end;
$$;

revoke all on function public.respond_rotation_participation(uuid, boolean) from public;
revoke execute on function public.respond_rotation_participation(uuid, boolean) from anon;
grant execute on function public.respond_rotation_participation(uuid, boolean) to authenticated;


-- ════════════════════════════════════════════════════════════════
-- §3 respond_rotation_plan — 폴백 관점 따라잡기 호출 추가 (0058 §3 대체)
-- ════════════════════════════════════════════════════════════════
--- 0058의 본문 그대로에 §1 호출만 얹는다. 두 수락 경로가 같은 보완을 하도록 두어,
--- "어느 카드로 수락해도 결과가 같다"가 관점 행까지 성립한다.
create or replace function public.respond_rotation_plan(p_session_id uuid, p_accept boolean)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_rows int;
  v_req_id uuid;
  v_touched boolean;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  -- 세션 행 락 — finalize·join_match_room_as_player와 같은 락으로 동시 응답·삭제를 직렬화한다
  perform 1 from rotation_sessions where id = p_session_id for update;
  if not found then raise exception 'session_not_found'; end if;

  update rotation_session_participants
  set participation_status = case when p_accept then 'accepted' else 'rejected' end,
      responded_at = now()
  where session_id = p_session_id and user_id = v_uid and participation_status = 'pending';
  get diagnostics v_rows = row_count;
  if v_rows = 0 then raise exception 'plan_already_responded'; end if;

  -- 거절하면 풀에서 빠진다(0057 §4 트리거가 'rejected' 좌석은 남긴다)
  if not p_accept then
    update rotation_sessions
    set players = coalesce((
      select jsonb_agg(e) from jsonb_array_elements(players) e
      where nullif(e->>'userId', '')::uuid is distinct from v_uid
    ), '[]'::jsonb)
    where id = p_session_id;
  end if;

  -- 이미 만들어진 이 세션의 게임 요청에도 같은 응답을 흘린다(0058).
  -- 헬퍼 둘은 자격이 없으면 raise가 아니라 false를 돌려주므로, 내가 대표인 게임과
  -- 참가자인 게임을 역할을 미리 모른 채 차례로 시도할 수 있다(0056 §7과 같은 방식).
  for v_req_id in
    select r.id from match_requests r
    where r.rotation_session_id = p_session_id and r.status = 'pending'
    order by r.group_seq nulls last, r.created_at
  loop
    v_touched := public.mark_request_opponent_response(v_req_id, p_accept);
    if public.mark_request_participant_response(v_req_id, p_accept) then v_touched := true; end if;
    if v_touched and p_accept then perform public.maybe_materialize_request(v_req_id); end if;
  end loop;

  if p_accept then
    perform public.backfill_rotation_perspectives(p_session_id, v_uid);
  end if;
end;
$$;

revoke all on function public.respond_rotation_plan(uuid, boolean) from public;
revoke execute on function public.respond_rotation_plan(uuid, boolean) from anon;
grant execute on function public.respond_rotation_plan(uuid, boolean) to authenticated;

comment on function public.respond_rotation_plan(uuid, boolean) is
  '로테이션 일정(세션) 초대에 대한 참여 응답 (0057, 0058·0063 확장). 좌석과 그 세션의 pending 게임 요청을 함께 움직이고, 폴백 게임의 관점 행을 따라잡는다. 게임 파생 요청 쪽에서 들어오는 대칭 경로는 respond_rotation_participation이다 — 어느 쪽을 먼저 불러도 최종 상태가 같다.';
comment on function public.respond_rotation_participation(uuid, boolean) is
  'finalize가 만든 게임 파생 요청들의 세션 단위 일괄 응답 (0056, 0063 확장). 0063부터 세션 좌석도 함께 움직인다 — 종전에는 게임만 수락돼 좌석이 pending으로 남아 일정 초대 카드가 잔존하고 게임마다 재수락을 요구했다. 일정 초대 쪽에서 들어오는 대칭 경로는 respond_rotation_plan이다.';


-- ════════════════════════════════════════════════════════════════
-- §4 create_match_request — 요청 행에 스코어를 실을 수 없게 한다
-- ════════════════════════════════════════════════════════════════
--- 0043의 p_set_scores가 열려 있고 DB CHECK가 없다. 스코어를 넣은 방 밖 pending 요청은 전원 수락
--- 순간 materialize_accepted_request(0056 §3)가 result_status := 'confirmed'로 **아무 좌석의 확인
--- 없이 확정**한다. 0056 §9 주석이 스스로 "함정"이라 부르는 그 구멍이고, 지금은 앱 호출부가
--- setScores를 넘기지 않는다는 규약만으로 닫혀 있다. 스코어는 협상 행에만 살아야 한다.
---
--- 이 RPC는 room_id를 넣지 않으므로 만드는 요청은 언제나 방 밖이다 → 무조건 '[]'.
--- 시그니처는 그대로 둔다(바꾸면 types/supabase.ts와 호출부가 함께 깨진다). 조용히 무시하지 않고
--- raise 하는 쪽을 고른다 — 스코어를 실어 보내는 호출부가 생기면 데이터가 아니라 배포가 깨져야 한다.
create or replace function public.create_match_request(
  p_opponent_user_id uuid,
  p_played_at date,
  p_played_time time,
  p_match_type text,
  p_surface text,
  p_notes text default null,
  p_set_scores jsonb default '[]'::jsonb,
  p_partner jsonb default null,
  p_opponent2 jsonb default null,
  p_court_name text default null
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid := gen_random_uuid();
  v_is_doubles boolean := p_match_type <> 'singles';
  v_partner_user_id uuid;
  v_opp2_user_id uuid;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if v_uid = p_opponent_user_id then raise exception 'cannot_request_self'; end if;
  if not exists (
    select 1 from users u where u.id = p_opponent_user_id and u.is_guest = false and u.deleted_at is null
  ) then
    raise exception 'invalid_opponent';
  end if;

  -- 결과는 수락 후 협상 축에서만 다룬다(0063)
  if p_set_scores is not null and jsonb_typeof(p_set_scores) = 'array'
     and jsonb_array_length(p_set_scores) > 0 then
    raise exception 'set_scores_not_allowed';
  end if;

  if v_is_doubles then
    if p_partner is null or p_opponent2 is null
       or coalesce(p_partner->>'name','') = '' or coalesce(p_opponent2->>'name','') = '' then
      raise exception 'doubles_players_required';
    end if;
    v_partner_user_id := nullif(p_partner->>'user_id','')::uuid;
    v_opp2_user_id := nullif(p_opponent2->>'user_id','')::uuid;
    if v_partner_user_id is not null and v_partner_user_id in (v_uid, p_opponent_user_id) then
      raise exception 'invalid_partner';
    end if;
    if v_opp2_user_id is not null and v_opp2_user_id in (v_uid, p_opponent_user_id) then
      raise exception 'invalid_opponent2';
    end if;
    if v_partner_user_id is not null and v_opp2_user_id is not null and v_partner_user_id = v_opp2_user_id then
      raise exception 'duplicate_players';
    end if;
  end if;

  insert into match_requests (id, requester_id, opponent_user_id, played_at, played_time, match_type, surface, notes, set_scores, court_name)
  values (v_id, v_uid, p_opponent_user_id, p_played_at, p_played_time, p_match_type, p_surface, p_notes, '[]'::jsonb, nullif(btrim(p_court_name), ''));

  if v_is_doubles then
    insert into match_request_participants (request_id, role, user_id, name, dominant_hand, ntrp_snapshot)
    values (v_id, 'partner', v_partner_user_id, p_partner->>'name', nullif(p_partner->>'dominant_hand',''), nullif(p_partner->>'ntrp','')::numeric);
    insert into match_request_participants (request_id, role, user_id, name, dominant_hand, ntrp_snapshot)
    values (v_id, 'opponent2', v_opp2_user_id, p_opponent2->>'name', nullif(p_opponent2->>'dominant_hand',''), nullif(p_opponent2->>'ntrp','')::numeric);
  end if;

  return v_id;
end;
$$;

revoke all on function public.create_match_request(uuid, date, time, text, text, text, jsonb, jsonb, jsonb, text) from public;
revoke execute on function public.create_match_request(uuid, date, time, text, text, text, jsonb, jsonb, jsonb, text) from anon;
grant execute on function public.create_match_request(uuid, date, time, text, text, text, jsonb, jsonb, jsonb, text) to authenticated;

--- 세 서버 쓰기 경로(create_match_request·create_room_game·finalize_rotation_session)가 모두 '[]'를
--- 넣으므로 신규 행은 이 제약을 만족한다. 기존 행에는 0033~0041 시절의 값이 남아 있을 수 있어
--- `not valid`로 걸어 과거 검증은 건너뛰고 신규 INSERT·UPDATE만 막는다.
alter table public.match_requests
  add constraint match_requests_offroom_no_scores
  check (room_id is not null or set_scores = '[]'::jsonb) not valid;

comment on column public.match_requests.set_scores is
  '요청 시점 원본 스코어 — 방 밖 요청은 언제나 빈 배열이다(0063 CHECK match_requests_offroom_no_scores). 스코어는 match_result_negotiations에만 살아야 한다: 요청 행에 실리면 materialize_accepted_request가 전원 수락 순간 아무 좌석의 확인 없이 확정한다.';
