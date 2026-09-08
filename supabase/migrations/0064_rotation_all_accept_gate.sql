-- 0064 — 로테이션 결과 입력의 「전원 수락」 게이트 + 세션 게임 목록 공유 + 중복 등록 선점
--
-- ## 무엇이 바뀌는가
--
-- (1) **전원 수락 후에만 결과를 입력한다.** 0057이 만든 '선입력'(주최자는 수락을 기다리지 않고
--     스코어를 먼저 넣어 두고, 그 값이 전원 수락 시점에 되살아난다)을 철회한다.
--
--     0063은 이 장치를 "코트에서 다 치고 났는데 한 명이 앱을 안 켰다고 스코어를 잃게 하지 않는다"는
--     의도적 설계라고 판정했고, 그 판단 자체는 데이터 정합 관점에서 옳았다(미수락 좌석이 낀 게임은
--     personal_matches 0행 + 협상 행 proposed 선적립이라 0056 불변식을 지킨다).
--     그럼에도 철회하는 이유는 **사용자가 본 화면**이다 — 미수락 상태에서 입력하면 상대에게
--     「일정 초대」와 「게임 참여 확인」이 잇따라 도착해 같은 경기를 두 번 승인하는 것처럼 보인다.
--     0063은 그 중복을 허브 상류에서 걷어내 증상을 덮었지만, 두 축이 동시에 존재한다는 사실 자체는
--     남아 있었다. 여기서는 그 상태가 아예 만들어지지 않게 한다.
--
--     대가는 "한 명이 응답하지 않으면 그날 경기를 기록할 수 없다"이고, 그 탈출구는 **주최자가
--     명단에서 빼고 게스트로 기록하는 것**이다(remove_rotation_session_player, 0058). 비회원은
--     언제나 동의한 것으로 보므로(0056 트리거) 경기는 기록되고 그 회원의 전적에는 남지 않는다.
--
--     부수 효과로 단식·페어 고정 복식(pending에서 입력이 완전 차단, request_not_accepted)과
--     **세 모드의 규칙이 처음으로 같아진다.**
--
-- (2) **세션의 게임 목록을 좌석 보유자 전원이 본다.** personal_matches RLS가 '본인만'이라
--     참가자 A가 넣은 게임을 참가자 B는 볼 수 없었다. 그래서 빌더의 '이미 입력한 게임'이
--     `requester_id = 나`로만 좁혀져 있었고, 같은 물리 게임을 둘이 각자 넣으면 group_seq만 다른
--     중복 게임 2건이 생겼다(로테이션 파생 요청은 pending 중복 방지 유니크 인덱스에서 제외돼 있고 —
--     0056 §2 — (rotation_session_id, group_seq) 유니크도 없다). get_match_room_detail과 같은
--     SECURITY DEFINER 관용구로 목록을 공유한다.
--
-- (3) **낙관적 선점.** 빌더가 화면에 이미 띄우는 "새 게임은 N번부터"의 N을 저장 시 함께 보내고,
--     서버의 max+1과 다르면 거부한다. 세션 행 락(아래 for update)이 이미 채번을 직렬화하므로
--     새 컬럼도 인덱스도 필요 없다. p_expected_seq를 넘기지 않으면(null) 검사하지 않는다 —
--     시그니처만 바뀌고 기존 2인자 호출은 기본값으로 그대로 동작한다.

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- §1. finalize_rotation_session — 진입 가드 강화 + 선점 검사
--
-- 2인자 버전을 drop하고 3번째 인자를 default null로 추가한다. default를 둔 채 옛 시그니처를
-- 남기면 2인자 호출이 ambiguous가 되므로 drop이 필수다(0043 create_match_request 9인자 선례).
--
-- 본문은 0057 §7 원본을 **그대로** 옮기고 표시한 세 곳(시그니처·진입 가드·선점 검사)만 바꾼다.
-- 특히 allowlist 위조 방어(participant_not_in_room)와 에러 코드는 손대지 않는다.
-- ─────────────────────────────────────────────────────────────────────────────

drop function if exists public.finalize_rotation_session(uuid, jsonb);

create or replace function public.finalize_rotation_session(
  p_session_id uuid,
  p_games jsonb,
  p_expected_seq int default null
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_s rotation_sessions%rowtype;
  v_me users%rowtype;
  v_me_json jsonb;
  v_allowed uuid[];
  v_notes text;
  v_is_room boolean;
  v_my_seat text;
  v_immediate boolean;
  g jsonb;
  v_sets jsonb;
  v_seq int;
  v_match_id uuid;
  v_req_id uuid;
  v_partner jsonb; v_opp1 jsonb; v_opp2 jsonb;
  v_partner_id uuid; v_opp1_id uuid; v_opp2_id uuid;
  v_rep_id uuid; v_other jsonb;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select * into v_s from rotation_sessions where id = p_session_id for update;
  if not found then raise exception 'session_not_found'; end if;

  -- (a) 방 밖 세션도 참여를 수락한 좌석 보유자가 입력할 수 있다(0057). 좌석이 아예 없으면
  --     세션의 존재를 알 자격도 없으므로 종전처럼 session_not_found로 숨긴다.
  if v_s.room_id is null then
    if v_s.user_id <> v_uid then
      select participation_status into v_my_seat from rotation_session_participants
      where session_id = p_session_id and user_id = v_uid;
      if v_my_seat is null then raise exception 'session_not_found'; end if;
      if v_my_seat <> 'accepted' then raise exception 'not_session_participant'; end if;
    end if;
    -- 0064 — 초대한 회원이 **전원 응답**해야 결과를 입력할 수 있다.
    --   신원 검사가 먼저인 것이 중요하다: pending 검사를 앞에 두면 좌석 없는 사람이
    --   session_seats_pending을 받아 세션의 존재를 알게 된다(session_not_found로 숨기던 것이 샌다).
    -- ⚠ 소유자도 이 검사를 통과해야 한다 — 예외로 두면 정작 초대를 **보낸** 사람만 규칙 밖에 남는다.
    if exists (
      select 1 from rotation_session_participants
      where session_id = p_session_id and participation_status = 'pending'
    ) then
      raise exception 'session_seats_pending';
    end if;
  elsif v_s.user_id <> v_uid and not public.is_room_participant(v_s.room_id) then
    raise exception 'not_session_participant';
  end if;
  v_is_room := v_s.room_id is not null;

  if p_games is null or jsonb_typeof(p_games) <> 'array'
     or jsonb_array_length(p_games) < 1 or jsonb_array_length(p_games) > 20 then
    raise exception 'invalid_games';
  end if;

  select * into v_me from users where id = v_uid;
  v_me_json := jsonb_strip_nulls(jsonb_build_object(
    'userId', v_me.id, 'name', v_me.name, 'hand', v_me.dominant_hand,
    'ntrp', coalesce(public.derive_public_ntrp(v_me), v_me.ntrp)));

  -- 메모는 세션 소유자의 사적 기록 — 다른 참가자가 입력할 때는 옮기지 않는다
  v_notes := case when v_s.user_id = v_uid then v_s.notes else null end;

  -- 위조 방어 allowlist: 세션 풀 ∪ 방 참가자(joined) ∪ 세션 소유자 − 세션 거절자(0057)
  select coalesce(array_agg(distinct t.uid), '{}'::uuid[]) into v_allowed
  from (
    select nullif(e->>'userId', '')::uuid as uid from jsonb_array_elements(v_s.players) e
    union
    select m.user_id from match_room_members m
      where v_s.room_id is not null and m.room_id = v_s.room_id and m.status = 'joined'
    union
    select v_s.user_id
  ) t
  where t.uid is not null
    and not exists (
      select 1 from rotation_session_participants rp
      where rp.session_id = p_session_id and rp.user_id = t.uid
        and rp.participation_status = 'rejected');

  -- 다른 참가자가 이미 저장한 게임이 있으면 이어붙인다(세션 행 락이 동시 저장을 직렬화한다).
  -- 요청 쪽도 함께 본다(0057): 미수락 회원이 낀 게임은 personal_matches를 만들지 않으므로
  -- personal_matches만 세면 그 다음 게임이 같은 번호를 다시 쓴다. 0056까지는 방 밖 세션이
  -- 첫 finalize에 삭제돼 두 번째 호출 자체가 없었지만, 이제는 세션이 남는다.
  select coalesce(greatest(
    (select max(group_seq) from personal_matches where rotation_session_id = p_session_id),
    (select max(group_seq) from match_requests where rotation_session_id = p_session_id)
  ), 0) into v_seq;

  -- 0064 — 낙관적 선점. 빌더가 "새 게임은 N번부터"로 이미 보여 준 값과 서버의 다음 번호가 어긋났다면
  -- 그 사이에 다른 참가자가 등록한 것이다. 사용자가 보던 목록이 낡았으므로 조용히 이어붙이지 않는다 —
  -- 그러지 않으면 같은 물리 게임이 두 번 들어간다. null이면 검사하지 않는다(옛 2인자 호출 호환).
  if p_expected_seq is not null and p_expected_seq <> v_seq + 1 then
    raise exception 'session_games_changed';
  end if;

  for g in select value from jsonb_array_elements(p_games) loop
    if coalesce(g->'partner'->>'name', '') = ''
       or coalesce(g->'opp1'->>'name', '') = ''
       or coalesce(g->'opp2'->>'name', '') = '' then
      raise exception 'invalid_games';
    end if;
    -- 게임 1건 = 스코어 1줄
    if jsonb_typeof(g->'sets') <> 'array' or jsonb_array_length(g->'sets') <> 1
       or not public.validate_set_scores(g->'sets') then
      raise exception 'invalid_set_scores';
    end if;

    v_partner := public.resolve_rotation_player(g->'partner');
    v_opp1 := public.resolve_rotation_player(g->'opp1');
    v_opp2 := public.resolve_rotation_player(g->'opp2');
    v_partner_id := nullif(v_partner->>'userId', '')::uuid;
    v_opp1_id := nullif(v_opp1->>'userId', '')::uuid;
    v_opp2_id := nullif(v_opp2->>'userId', '')::uuid;

    if (v_partner_id is not null and not (v_partner_id = any(v_allowed)))
       or (v_opp1_id is not null and not (v_opp1_id = any(v_allowed)))
       or (v_opp2_id is not null and not (v_opp2_id = any(v_allowed))) then
      raise exception 'participant_not_in_room';
    end if;
    -- 호출자는 앵커라 슬롯에 올 수 없고, 세 슬롯은 서로 달라야 한다
    if v_partner_id = v_uid or v_opp1_id = v_uid or v_opp2_id = v_uid then
      raise exception 'invalid_games';
    end if;
    if (v_partner_id is not null and v_partner_id in (v_opp1_id, v_opp2_id))
       or (v_opp1_id is not null and v_opp1_id = v_opp2_id) then
      raise exception 'duplicate_players';
    end if;

    v_sets := public.normalize_set_scores(g->'sets', true);
    v_seq := v_seq + 1;

    -- (c) 이 게임의 회원 좌석이 전부 세션 참여를 수락했으면 방 게임과 동일하게 처리한다(0057).
    --     세션 수락이 게임 참여 동의를 대신하므로 게임별 재수락을 받지 않는다.
    v_immediate := v_is_room
      or public.rotation_seats_accepted(p_session_id, array[v_partner_id, v_opp1_id, v_opp2_id]);

    -- 대표 결정 — 상대1 → 상대2 (클라이언트 resolveConfirmRep와 같은 규칙).
    -- 상대2가 대표면 슬롯을 스왑하므로 상대팀 애드도 함께 교차한다.
    -- 방 안팎을 가리지 않는다(0056) — 방 밖 세션이 즉시 확정으로 떨어지던 원인이 여기 있었다.
    v_rep_id := null;
    if public.is_active_member(v_opp1_id) then
      v_rep_id := v_opp1_id; v_other := v_opp2;
    elsif public.is_active_member(v_opp2_id) then
      v_rep_id := v_opp2_id; v_other := v_opp1;
      v_sets := public.swap_opponent_perspective(v_sets);
    end if;

    if v_rep_id is not null then
      v_req_id := gen_random_uuid();
      insert into match_requests
        (id, requester_id, opponent_user_id, played_at, played_time, match_type, surface,
         notes, set_scores, court_name, room_id, rotation_session_id, group_seq,
         status, responded_at, opponent_accepted_at)
      values
        (v_req_id, v_uid, v_rep_id, v_s.played_at, v_s.played_time, v_s.match_type, v_s.surface,
         v_notes, '[]'::jsonb, v_s.court_name, v_s.room_id, p_session_id, v_seq::smallint,
         case when v_immediate then 'accepted' else 'pending' end,
         case when v_immediate then now() else null end,
         case when v_immediate then now() else null end);

      -- 참여 상태는 0056 §1 트리거가 요청 상태에서 파생한다(선인가·비회원 = accepted, 그 외 = pending)
      insert into match_request_participants (request_id, role, user_id, name, dominant_hand, ntrp_snapshot)
      values (v_req_id, 'partner', v_partner_id, v_partner->>'name',
              nullif(v_partner->>'hand', ''), nullif(v_partner->>'ntrp', '')::numeric);
      insert into match_request_participants (request_id, role, user_id, name, dominant_hand, ntrp_snapshot)
      values (v_req_id, 'opponent2', nullif(v_other->>'userId', '')::uuid, v_other->>'name',
              nullif(v_other->>'hand', ''), nullif(v_other->>'ntrp', '')::numeric);

      if v_immediate then
        -- 참여 동의가 이미 끝났다(방 입장 또는 세션 수락) — 곧바로 기록을 만들고 세트는 제안으로 올린다
        perform public.materialize_accepted_request(v_req_id, p_session_id, v_seq::smallint);
        perform public.propose_match_result(v_req_id, v_sets);
      else
        -- 미수락 회원이 남았다: 전원이 참여를 수락해야 기록이 생긴다. 입력자가 넣은 스코어를 잃지 않도록
        -- 협상 행을 미리 'proposed'로 심는다(propose_match_result는 accepted를 요구해 여기서는 못 쓴다).
        -- v_sets는 이미 요청자(=입력자) 관점이라 propose가 저장했을 값과 같다.
        insert into match_result_negotiations
          (request_id, set_scores, result_status, proposed_set_scores, proposed_by, proposed_at)
        values (v_req_id, '[]'::jsonb, 'proposed', v_sets, v_uid, now());
      end if;
    else
      -- 폴백: 상대팀 전원 비회원 → 즉시 확정
      v_match_id := gen_random_uuid();

      insert into personal_matches
        (id, user_id, source_type, played_at, played_time, match_type, surface, set_scores, notes, court_name,
         rotation_session_id, group_seq, room_id, is_perspective)
      values
        (v_match_id, v_uid, 'rotation', v_s.played_at, v_s.played_time, v_s.match_type, v_s.surface, v_sets,
         v_notes, v_s.court_name, p_session_id, v_seq, v_s.room_id, false);

      insert into personal_match_participants (match_id, role, user_id, name, dominant_hand, ntrp_snapshot)
      select v_match_id, r.role, nullif(r.p->>'userId', '')::uuid, r.p->>'name',
             nullif(r.p->>'hand', ''), nullif(r.p->>'ntrp', '')::numeric
      from (values ('opponent', v_opp1), ('partner', v_partner), ('opponent2', v_opp2)) as r(role, p);

      -- (c) 상대가 전원 비회원이어도 회원 파트너가 세션을 수락했다면 그의 기록에도 남긴다
      if v_immediate then
        if public.is_active_member(v_partner_id) then
          perform public.copy_personal_match_perspective(
            v_match_id, v_partner_id, public.swap_partner_perspective(v_sets),
            v_opp1, v_me_json, v_opp2);
        end if;
        if public.is_active_member(v_opp1_id) then
          perform public.copy_personal_match_perspective(
            v_match_id, v_opp1_id, public.invert_set_scores(v_sets),
            v_me_json, v_opp2, v_partner);
        end if;
        if public.is_active_member(v_opp2_id) then
          perform public.copy_personal_match_perspective(
            v_match_id, v_opp2_id, public.swap_partner_perspective(public.invert_set_scores(v_sets)),
            v_me_json, v_opp1, v_partner);
        end if;
      end if;
    end if;
  end loop;

  -- (d) 좌석이 있는 세션은 남긴다 — 수락자 여럿이 각자 자기 기준으로 입력하기 때문이다.
  --     종료는 소유자의 세션 삭제(deleteRotationSessionAction)가 담당한다.
  if v_s.room_id is null then
    if not exists (select 1 from rotation_session_participants where session_id = p_session_id) then
      delete from rotation_sessions where id = p_session_id;
    end if;
  else
    perform public.recompute_match_room_settled(v_s.room_id);
  end if;
end;
$$;

revoke all on function public.finalize_rotation_session(uuid, jsonb, int) from public;
revoke execute on function public.finalize_rotation_session(uuid, jsonb, int) from anon;
grant execute on function public.finalize_rotation_session(uuid, jsonb, int) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- §2. get_rotation_session_games — 세션에 등록된 게임 목록 (좌석 보유자 전원 공유)
--
-- 왜 RPC인가: personal_matches RLS는 '본인만'이라 참가자 A가 넣은 게임을 B는 읽을 수 없다.
-- 앱 필터를 푸는 것으로는 해결되지 않는다(정책이 막는다). get_match_room_detail과 같은
-- SECURITY DEFINER + 자격 게이트 관용구로 세션 단위 목록을 공유한다.
--
-- 두 출처를 합친다 — finalize가 게임마다 **한쪽만** 만들기 때문이다:
--   · personal_matches(is_perspective = false)  ... 기록이 생긴 게임(정상 경로)
--   · match_requests(status = 'pending')        ... 0064 이전에 선적립된 게임(스코어는 협상 제안값)
-- 그래서 같은 group_seq가 양쪽에 동시에 있을 수 없다.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.get_rotation_session_games(p_session_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_s rotation_sessions%rowtype;
  v_out jsonb;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select * into v_s from rotation_sessions where id = p_session_id;
  if not found then raise exception 'session_not_found'; end if;

  -- 자격 = 소유자 ∪ 좌석 보유자 ∪ 방 참가자. finalize 진입 가드보다 넓다 —
  -- 아직 수락하지 않은 사람도 "이 일정에 무엇이 등록됐는지"는 볼 수 있어야 중복 입력을 피한다.
  if v_s.user_id <> v_uid
     and not exists (
       select 1 from rotation_session_participants
       where session_id = p_session_id and user_id = v_uid)
     and not (v_s.room_id is not null and public.is_room_participant(v_s.room_id)) then
    raise exception 'not_session_participant';
  end if;

  select coalesce(jsonb_agg(x order by x->>'groupSeq'), '[]'::jsonb) into v_out
  from (
    -- 출처 1 — 기록이 생긴 게임
    select jsonb_build_object(
      'groupSeq', pm.group_seq,
      'matchType', pm.match_type,
      'enteredByUserId', pm.user_id,
      'enteredByName', coalesce(u.name, ''),
      'enteredByMe', pm.user_id = v_uid,
      'partnerName', coalesce((select p.name from personal_match_participants p
                               where p.match_id = pm.id and p.role = 'partner'), ''),
      'opponentName', coalesce((select p.name from personal_match_participants p
                                where p.match_id = pm.id and p.role = 'opponent'), ''),
      'opponent2Name', coalesce((select p.name from personal_match_participants p
                                 where p.match_id = pm.id and p.role = 'opponent2'), ''),
      'sets', coalesce(pm.set_scores, '[]'::jsonb),
      'awaitingConsent', false
    ) as x
    from personal_matches pm
    left join users u on u.id = pm.user_id
    where pm.rotation_session_id = p_session_id and pm.is_perspective = false

    union all

    -- 출처 2 — 참여 동의를 기다리며 선적립된 게임(0064 이전 데이터). 스코어는 협상 제안값에 있다.
    select jsonb_build_object(
      'groupSeq', mr.group_seq,
      'matchType', mr.match_type,
      'enteredByUserId', mr.requester_id,
      'enteredByName', coalesce(u.name, ''),
      'enteredByMe', mr.requester_id = v_uid,
      'partnerName', coalesce((select p.name from match_request_participants p
                               where p.request_id = mr.id and p.role = 'partner'), ''),
      'opponentName', coalesce(o.name, ''),
      'opponent2Name', coalesce((select p.name from match_request_participants p
                                 where p.request_id = mr.id and p.role = 'opponent2'), ''),
      'sets', coalesce(n.proposed_set_scores, '[]'::jsonb),
      'awaitingConsent', true
    ) as x
    from match_requests mr
    left join users u on u.id = mr.requester_id
    left join users o on o.id = mr.opponent_user_id
    left join match_result_negotiations n on n.request_id = mr.id
    where mr.rotation_session_id = p_session_id and mr.status = 'pending'
  ) rows;

  return v_out;
end;
$$;

revoke all on function public.get_rotation_session_games(uuid) from public;
revoke execute on function public.get_rotation_session_games(uuid) from anon;
grant execute on function public.get_rotation_session_games(uuid) to authenticated;

comment on function public.get_rotation_session_games(uuid) is
  '세션에 등록된 대표 게임 전량(좌석 보유자 공유, 0064). 빌더가 "이미 등록된 게임"을 그려 중복 입력을 막는다.';

comment on function public.finalize_rotation_session(uuid, jsonb, int) is
  '로테이션 세션 → 게임별 기록 분해. 방 밖 세션은 좌석 전원이 응답해야 진입할 수 있고(0064 session_seats_pending), p_expected_seq로 다른 참가자의 선점을 감지한다(session_games_changed).';

commit;
