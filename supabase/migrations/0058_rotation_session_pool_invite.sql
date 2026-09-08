-- ════════════════════════════════════════════════════════════════════════════
-- 0058 — 로테이션 세션의 참가자 초대·제거 (등록 이후 풀 변경)
-- ════════════════════════════════════════════════════════════════════════════
--- 증상: 세션에 회원 3명을 초대 → 1명이 실수로 거절 → 결과 입력 팝업의 '참가자 추가·편집'에서
---       그 사람을 다시 등록 → 저장 시 participant_not_in_room.
---
--- 원인: 등록 이후 rotation_sessions.players를 바꿀 경로가 앱에도 DB에도 없었다.
---       빌더의 참가자 편집은 순수 클라이언트 로컬 state이고, finalize의 위조 방어 allowlist는
---       players에서 파생되므로 로컬로 고른 회원은 언제나 걸린다(비회원은 널 체크로 통과한다 —
---       그래서 이 결함이 회원 추가에서만 드러났다).
---
--- 0057이 남긴 도달 불가능한 코드: §4 트리거 sync_rotation_session_participants는 이미
--- "풀에 다시 넣으면 rejected → pending 복귀"를 구현해 뒀다. 넣을 경로가 없어 한 번도 실행되지
--- 않았을 뿐이다. 그래서 **이 마이그레이션은 append/remove 경로만 연다** —
--- 좌석 생성·재초대 복귀도, finalize allowlist의 거절자 배제 해제도 전부 그 트리거가 대신한다.
---
--- 설계 결정
---  · 추가 = 소유자 ∨ 참여를 **수락한** 참가자 / 제거 = 소유자만(본인은 '거절'로 스스로 빠진다)
---  · 재초대는 즉시 복귀가 아니라 pending — 남이 내 동의를 대신 바꾸지 못한다(0056·0057 원칙)
---  · **매칭 룸 세션은 대상이 아니다.** 방은 '비밀번호 공유 = 초대'(0048)이고 방 세션의 좌석은
---    accepted로 시작한다(입장이 곧 동의). 방 세션 풀에 임의의 회원을 넣으면 입장한 적 없는
---    사람이 accepted 좌석을 갖는 동의 구멍이 생긴다.


-- ════════════════════════════════════════════════════════════════
-- §1 add_rotation_session_player — 풀에 회원 1명 추가(= 초대)
-- ════════════════════════════════════════════════════════════════
--- join_match_room_as_player(0056 §10)의 append 블록이 그대로 본이다.
--- 차이는 대상이 '나'가 아니라 '남'이라는 것과, 실패를 조용히 넘기지 않는다는 점이다 —
--- 방 입장은 부수효과라 NTRP가 없으면 풀 append만 건너뛰었지만, 초대는 명시적 행위라 알려야 한다.
create or replace function public.add_rotation_session_player(p_session_id uuid, p_user_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_s rotation_sessions%rowtype;
  v_u users%rowtype;
  v_ntrp numeric;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  -- 세션 행 락 — 동시 초대·거절·finalize를 직렬화한다(respond_rotation_plan·finalize와 같은 락)
  select * into v_s from rotation_sessions where id = p_session_id for update;
  if not found then raise exception 'session_not_found'; end if;

  if v_s.room_id is not null then raise exception 'room_session_invite_unsupported'; end if;

  -- 자격: 소유자 ∨ 수락한 좌석 보유자.
  -- is_rotation_session_seat는 pending 좌석도 참이라 여기 쓸 수 없다 — accepted만 본다.
  if v_s.user_id <> v_uid and not exists (
    select 1 from rotation_session_participants p
    where p.session_id = p_session_id and p.user_id = v_uid
      and p.participation_status = 'accepted'
  ) then
    raise exception 'not_session_participant';
  end if;

  -- 소유자는 풀에 들어가지 않는다(players는 '나 제외' 명부다)
  if p_user_id = v_s.user_id then raise exception 'already_in_pool'; end if;
  if not public.is_active_member(p_user_id) then raise exception 'invalid_player'; end if;
  if exists (
    select 1 from jsonb_array_elements(v_s.players) e
    where nullif(e->>'userId', '')::uuid = p_user_id
  ) then raise exception 'already_in_pool'; end if;

  select * into v_u from users where id = p_user_id;
  v_ntrp := coalesce(public.derive_public_ntrp(v_u), v_u.ntrp);
  if v_ntrp is null then raise exception 'ntrp_missing'; end if;

  update rotation_sessions
  set players = players || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
    'userId', v_u.id, 'name', v_u.name, 'hand', v_u.dominant_hand, 'ntrp', v_ntrp
  )))
  where id = p_session_id;
  -- 좌석은 건드리지 않는다 — 0057 트리거가 pending 생성과 rejected → pending 복귀를 대신한다
end;
$$;

revoke all on function public.add_rotation_session_player(uuid, uuid) from public;
revoke execute on function public.add_rotation_session_player(uuid, uuid) from anon;
grant execute on function public.add_rotation_session_player(uuid, uuid) to authenticated;

comment on function public.add_rotation_session_player(uuid, uuid) is
  '로테이션 일정(방 밖 세션)의 선수 풀에 회원을 초대 (0058). 좌석 생성·재초대 복귀는 0057 트리거가 한다.';


-- ════════════════════════════════════════════════════════════════
-- §2 remove_rotation_session_player — 풀에서 회원 1명 제거
-- ════════════════════════════════════════════════════════════════
--- leave_match_room(0054)·respond_rotation_plan(0057)의 제거 블록과 같은 jsonb 조작이다.
--- 추가는 참가자 누구나 할 수 있지만 제거는 소유자만 — 제3자가 남의 수락을 지우지 못하게 한다.
--- 본인이 빠지는 길은 종전대로 '거절'(respond_rotation_plan)이다.
create or replace function public.remove_rotation_session_player(p_session_id uuid, p_user_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_s rotation_sessions%rowtype;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select * into v_s from rotation_sessions where id = p_session_id for update;
  if not found then raise exception 'session_not_found'; end if;

  if v_s.room_id is not null then raise exception 'room_session_invite_unsupported'; end if;
  if v_s.user_id <> v_uid then raise exception 'not_session_owner'; end if;

  if not exists (
    select 1 from jsonb_array_elements(v_s.players) e
    where nullif(e->>'userId', '')::uuid = p_user_id
  ) then raise exception 'not_in_pool'; end if;

  update rotation_sessions
  set players = coalesce((
    select jsonb_agg(e) from jsonb_array_elements(players) e
    where nullif(e->>'userId', '')::uuid is distinct from p_user_id
  ), '[]'::jsonb)
  where id = p_session_id;
  -- 좌석 삭제도 0057 트리거가 한다(rejected 좌석은 보존된다)
end;
$$;

revoke all on function public.remove_rotation_session_player(uuid, uuid) from public;
revoke execute on function public.remove_rotation_session_player(uuid, uuid) from anon;
grant execute on function public.remove_rotation_session_player(uuid, uuid) to authenticated;

comment on function public.remove_rotation_session_player(uuid, uuid) is
  '로테이션 일정(방 밖 세션)의 선수 풀에서 회원 제거 — 소유자만 (0058). 본인이 빠지는 길은 respond_rotation_plan(거절)이다.';


-- ════════════════════════════════════════════════════════════════
-- §3 respond_rotation_plan — 일정 응답이 그 세션의 게임 요청까지 흡수한다 (0057 §5 대체)
-- ════════════════════════════════════════════════════════════════
--- 0057 결정 3은 "세션 참여 수락이 그 세션 게임의 참여 동의를 대신한다"였지만, 그 구현은
--- finalize 시점에만 있었다(rotation_seats_accepted). 그래서 이런 순서가 되면 갭이 생긴다:
---   C가 미응답인 채로 게임이 만들어짐(pending 요청) → C가 뒤늦게 일정을 수락
---   → 게임 요청은 여전히 별도 응답을 기다린다 → 허브에 같은 세션이 두 장(일정 초대 + 게임 묶음).
--- 0058이 재초대를 열면서 이 순서가 흔해진다 — 거절 → 재초대 → 수락이 바로 그 경로다.
---
--- 그래서 응답을 두 축에 한 번에 흘린다. 방 입장이 그 방 요청의 참여 수락을 겸하는 것과
--- 같은 처리다(join_match_room_as_player, 0056 §10). 거절도 대칭으로 흘린다 —
--- 일정을 거절한 사람에게 그 일정의 게임을 따로 묻는 화면이 남으면 안 된다.
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

  -- 거절하면 풀에서 빠진다(§4 트리거가 'rejected' 좌석은 남긴다)
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
end;
$$;

revoke all on function public.respond_rotation_plan(uuid, boolean) from public;
revoke execute on function public.respond_rotation_plan(uuid, boolean) from anon;
grant execute on function public.respond_rotation_plan(uuid, boolean) to authenticated;


-- ════════════════════════════════════════════════════════════════
-- §4 좌석 기본값도 일정 수락에서 파생시킨다 (0056 §1 대체)
-- ════════════════════════════════════════════════════════════════
--- §3이 "수락이 나중에 오는 경우"를 흘려보냈다면 이건 "수락이 먼저 와 있는 경우"다.
--- 0057은 '세션 수락 = 게임 참여 동의'를 finalize의 v_immediate(게임 전체가 전원 수락)로만 구현해,
--- 한 명이라도 미응답이면 **이미 일정을 수락해 둔 사람의 좌석까지** pending으로 태어나 다시 물었다.
create or replace function public.default_participation_status()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.participation_status = 'pending'
     and (
       -- 비회원·게스트·탈퇴자는 수락 대상이 아니다
       not public.is_active_member(new.user_id)
       -- 방 안 경로: 요청이 이미 accepted로 태어난다(입장이 곧 동의)
       or exists (select 1 from match_requests r
                  where r.id = new.request_id and r.status <> 'pending')
       -- 로테이션 일정을 이미 수락한 사람 (0058) — 세션 수락이 게임 참여 동의를 대신한다
       or exists (select 1 from match_requests r
                  join rotation_session_participants p
                    on p.session_id = r.rotation_session_id and p.user_id = new.user_id
                  where r.id = new.request_id and p.participation_status = 'accepted')
     )
  then
    new.participation_status := 'accepted';
    new.responded_at := now();
  end if;
  return new;
end;
$$;

revoke all on function public.default_participation_status() from public, anon, authenticated;


-- ════════════════════════════════════════════════════════════════
-- §5 대표 축에도 같은 규칙 — 요청 INSERT 트리거
-- ════════════════════════════════════════════════════════════════
--- §4가 참가자 좌석이라면 이쪽은 대표(opponent_user_id)다. 대표가 이미 일정을 수락해 뒀는데
--- 다른 좌석 때문에 게임이 pending으로 태어나면 대표에게 참여를 다시 묻는 화면이 생긴다.
--- finalize를 고치지 않고 트리거로 두는 이유는 두 축의 규칙을 한자리에 모으기 위해서다 —
--- 앞으로 요청 쓰기 경로가 늘어도 규칙이 따라온다(0056 §1이 택한 논리와 같다).
create or replace function public.default_request_opponent_response()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.status = 'pending'
     and new.opponent_accepted_at is null
     and new.rotation_session_id is not null
     -- 세션 소유자는 좌석 행이 없어도 수락자로 센다(0057 §6)
     and public.rotation_seats_accepted(new.rotation_session_id, array[new.opponent_user_id])
  then
    new.opponent_accepted_at := now();
  end if;
  return new;
end;
$$;

revoke all on function public.default_request_opponent_response() from public, anon, authenticated;

drop trigger if exists match_requests_default_opponent_response on public.match_requests;
create trigger match_requests_default_opponent_response
  before insert on public.match_requests
  for each row execute function public.default_request_opponent_response();
