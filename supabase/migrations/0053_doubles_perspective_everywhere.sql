-- 0053_doubles_perspective_everywhere.sql
-- 복식 상호 확인 경기의 회원 참가자 전원에게 관점 행을 만든다 (방 안팎 통일).
--
-- 문제: materialize_accepted_request(0050)의 관점 복사 분기가 `room_id is not null and v_is_doubles`라
--       방 게임 복식만 회원 4명 전원에게 personal_matches 행을 만들었다. 방 밖 복식 확인 요청은
--       요청자·대표 2명만 기록을 갖고, 회원 파트너·상대2의 전적에서는 그 경기가 사라진다
--       (승률·파트너 케미·개인 NTRP·AI 코칭 어디에도 잡히지 않는다).
--
-- 변경 1: 조건을 v_is_doubles만으로 좁힌다. 나머지 본문(swap_partner_perspective, is_active_member
--         게이트, 요청자·대표 제외)은 0049·0050이 방 게임용으로 이미 검증한 규칙 그대로다.
-- 변경 2: confirm_match_result의 파트너·상대2 UPDATE에 행 수 단언을 추가한다. 지금까지는 0행이어도
--         조용히 통과했는데, 관점 행이 방 밖까지 늘어나면 그 침묵이 곧 기록 유실이 된다.
--
-- 권한·RLS 변경 없음: 제안·확인·이의는 여전히 요청 당사자 2명(requester/opponent)만 할 수 있고,
-- 파트너·상대2는 0052대로 협상을 읽기만 한다. 이 마이그레이션은 *기록*만 열고 *권한*은 건드리지 않는다.
--
-- 백필 없음: 적용 시점 원격 DB에 status='accepted' 이면서 room_id is null인 복식 요청이 0건.

create or replace function public.materialize_accepted_request(
  p_request_id uuid,
  p_rotation_session_id uuid default null,
  p_group_seq smallint default null
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_req match_requests%rowtype;
  v_requester users%rowtype;
  v_acceptor users%rowtype;
  v_member users%rowtype;
  v_is_doubles boolean;
  v_inverted_scores jsonb;
  v_requester_ntrp numeric;
  v_acceptor_ntrp numeric;
  v_partner_user_id uuid; v_partner_name text; v_partner_hand text; v_partner_ntrp numeric;
  v_opp2_user_id uuid; v_opp2_name text; v_opp2_hand text; v_opp2_ntrp numeric;
  v_pm_requester uuid := gen_random_uuid();
  v_pm_acceptor uuid := gen_random_uuid();
  v_result_status text;
  v_requester_json jsonb; v_acceptor_json jsonb; v_partner_json jsonb; v_opp2_json jsonb;
begin
  select * into v_req from match_requests where id = p_request_id;
  if not found then raise exception 'request_not_found'; end if;

  select * into v_requester from users where id = v_req.requester_id;
  select * into v_acceptor from users where id = v_req.opponent_user_id;
  v_is_doubles := v_req.match_type <> 'singles';

  if jsonb_array_length(v_req.set_scores) = 0 then
    v_inverted_scores := '[]'::jsonb;
  else
    v_inverted_scores := public.invert_set_scores(v_req.set_scores);
  end if;

  v_requester_ntrp := public.derive_public_ntrp(v_requester);
  v_acceptor_ntrp := public.derive_public_ntrp(v_acceptor);

  if v_is_doubles then
    select user_id, name, dominant_hand, ntrp_snapshot into v_partner_user_id, v_partner_name, v_partner_hand, v_partner_ntrp
    from match_request_participants where request_id = p_request_id and role = 'partner';
    if v_partner_user_id is not null then
      select * into v_member from users where id = v_partner_user_id;
      if found then
        v_partner_name := v_member.name;
        v_partner_ntrp := coalesce(public.derive_public_ntrp(v_member), v_partner_ntrp);
        v_partner_hand := v_member.dominant_hand;
      end if;
    end if;

    select user_id, name, dominant_hand, ntrp_snapshot into v_opp2_user_id, v_opp2_name, v_opp2_hand, v_opp2_ntrp
    from match_request_participants where request_id = p_request_id and role = 'opponent2';
    if v_opp2_user_id is not null then
      select * into v_member from users where id = v_opp2_user_id;
      if found then
        v_opp2_name := v_member.name;
        v_opp2_ntrp := coalesce(public.derive_public_ntrp(v_member), v_opp2_ntrp);
        v_opp2_hand := v_member.dominant_hand;
      end if;
    end if;
  end if;

  -- 요청자 행 (원본 관점, notes·court_name 포함, 방이 있으면 room_id 상속)
  insert into personal_matches
    (id, user_id, source_type, source_request_id, played_at, played_time, match_type, surface,
     set_scores, notes, court_name, room_id, rotation_session_id, group_seq, is_perspective)
  values
    (v_pm_requester, v_req.requester_id, 'confirmation', v_req.id, v_req.played_at, v_req.played_time,
     v_req.match_type, v_req.surface, v_req.set_scores, v_req.notes, v_req.court_name, v_req.room_id,
     p_rotation_session_id, p_group_seq, false);

  insert into personal_match_participants (match_id, role, user_id, name, dominant_hand, ntrp_snapshot)
  values (v_pm_requester, 'opponent', v_acceptor.id, v_acceptor.name, v_acceptor.dominant_hand, v_acceptor_ntrp);
  if v_is_doubles then
    insert into personal_match_participants (match_id, role, user_id, name, dominant_hand, ntrp_snapshot)
    values (v_pm_requester, 'partner', v_partner_user_id, v_partner_name, v_partner_hand, v_partner_ntrp);
    insert into personal_match_participants (match_id, role, user_id, name, dominant_hand, ntrp_snapshot)
    values (v_pm_requester, 'opponent2', v_opp2_user_id, v_opp2_name, v_opp2_hand, v_opp2_ntrp);
  end if;

  -- 대표(수락자) 행 (반전 관점 = 관점 복사본). notes는 요청자 사적 기록이라 제외, court_name·room_id는 공유
  insert into personal_matches
    (id, user_id, source_type, source_request_id, played_at, played_time, match_type, surface,
     set_scores, notes, court_name, room_id, rotation_session_id, group_seq, is_perspective)
  values
    (v_pm_acceptor, v_acceptor.id, 'confirmation', v_req.id, v_req.played_at, v_req.played_time,
     v_req.match_type, v_req.surface, v_inverted_scores, null, v_req.court_name, v_req.room_id,
     p_rotation_session_id, p_group_seq, true);

  insert into personal_match_participants (match_id, role, user_id, name, dominant_hand, ntrp_snapshot)
  values (v_pm_acceptor, 'opponent', v_requester.id, v_requester.name, v_requester.dominant_hand, v_requester_ntrp);
  if v_is_doubles then
    insert into personal_match_participants (match_id, role, user_id, name, dominant_hand, ntrp_snapshot)
    values (v_pm_acceptor, 'partner', v_opp2_user_id, v_opp2_name, v_opp2_hand, v_opp2_ntrp);
    insert into personal_match_participants (match_id, role, user_id, name, dominant_hand, ntrp_snapshot)
    values (v_pm_acceptor, 'opponent2', v_partner_user_id, v_partner_name, v_partner_hand, v_partner_ntrp);
  end if;

  -- 복식이면 파트너·상대2가 회원인 한 그들의 기록에도 관점 행을 남긴다.
  -- 0049는 이 복사를 방 게임(room_id 있음)으로 한정했지만, 그러면 방 밖 복식에서
  -- 회원 파트너의 전적·통계·개인 NTRP에 그 경기가 통째로 빠진다. 방 안팎을 같은 규칙으로 맞춘다.
  if v_is_doubles then
    v_requester_json := jsonb_strip_nulls(jsonb_build_object(
      'userId', v_requester.id, 'name', v_requester.name, 'hand', v_requester.dominant_hand, 'ntrp', v_requester_ntrp));
    v_acceptor_json := jsonb_strip_nulls(jsonb_build_object(
      'userId', v_acceptor.id, 'name', v_acceptor.name, 'hand', v_acceptor.dominant_hand, 'ntrp', v_acceptor_ntrp));
    v_partner_json := jsonb_strip_nulls(jsonb_build_object(
      'userId', v_partner_user_id, 'name', v_partner_name, 'hand', v_partner_hand, 'ntrp', v_partner_ntrp));
    v_opp2_json := jsonb_strip_nulls(jsonb_build_object(
      'userId', v_opp2_user_id, 'name', v_opp2_name, 'hand', v_opp2_hand, 'ntrp', v_opp2_ntrp));

    if public.is_active_member(v_partner_user_id) and v_partner_user_id not in (v_requester.id, v_acceptor.id) then
      perform public.copy_personal_match_perspective(
        v_pm_requester, v_partner_user_id,
        public.swap_partner_perspective(v_req.set_scores),
        v_acceptor_json, v_requester_json, v_opp2_json);
    end if;
    if public.is_active_member(v_opp2_user_id) and v_opp2_user_id not in (v_requester.id, v_acceptor.id) then
      perform public.copy_personal_match_perspective(
        v_pm_requester, v_opp2_user_id,
        public.swap_partner_perspective(v_inverted_scores),
        v_requester_json, v_acceptor_json, v_partner_json);
    end if;
  end if;

  v_result_status := case when jsonb_array_length(v_req.set_scores) = 0 then 'none' else 'confirmed' end;
  insert into match_result_negotiations (request_id, set_scores, result_status)
  values (p_request_id, v_req.set_scores, v_result_status);

  -- 대표 확인자는 수락이 곧 방 참가 (초대 행 없이 바로 joined). 방장 행은 host로 유지한다.
  if v_req.room_id is not null then
    insert into match_room_members (room_id, user_id, role, status, source_role, responded_at)
    values (v_req.room_id, v_acceptor.id, 'player', 'joined', 'opponent', now())
    on conflict (room_id, user_id) do update
      set role = case when match_room_members.role = 'host' then 'host' else 'player' end,
          status = 'joined',
          source_role = 'opponent',
          responded_at = now();
  end if;
end;
$$;

revoke all on function public.materialize_accepted_request(uuid, uuid, smallint) from public, anon, authenticated;

create or replace function public.confirm_match_result(p_request_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_req match_requests%rowtype;
  v_neg match_result_negotiations%rowtype;
  v_uid uuid := auth.uid();
  v_inverted jsonb;
  v_requester_rows int;
  v_opponent_rows int;
  v_partner_user_id uuid;
  v_opp2_user_id uuid;
  v_partner_rows int;
  v_opp2_rows int;
begin
  select * into v_req from match_requests where id = p_request_id for update;
  if not found then raise exception 'request_not_found'; end if;
  if v_req.status <> 'accepted' then raise exception 'request_not_accepted'; end if;
  if v_uid is null or (v_req.requester_id <> v_uid and v_req.opponent_user_id <> v_uid) then
    raise exception 'not_request_party';
  end if;

  select * into v_neg from match_result_negotiations where request_id = p_request_id for update;
  if not found or v_neg.result_status <> 'proposed' then raise exception 'result_not_proposed'; end if;
  if v_neg.proposed_by = v_uid then raise exception 'cannot_confirm_own_proposal'; end if;

  if not public.validate_set_scores(v_neg.proposed_set_scores) then raise exception 'invalid_set_scores'; end if;
  v_inverted := public.invert_set_scores(v_neg.proposed_set_scores);

  update personal_matches
  set set_scores = v_neg.proposed_set_scores
  where source_request_id = p_request_id and user_id = v_req.requester_id;
  get diagnostics v_requester_rows = row_count;

  update personal_matches
  set set_scores = v_inverted
  where source_request_id = p_request_id and user_id = v_req.opponent_user_id;
  get diagnostics v_opponent_rows = row_count;

  if v_requester_rows <> 1 or v_opponent_rows <> 1 then
    raise exception 'personal_matches_missing';
  end if;

  -- 복식이면 파트너·상대2 관점 행도 같은 결과로 확정한다(0053: 방 안팎 공통).
  -- materialize_accepted_request가 행을 만드는 조건과 **정확히 같은 술어**로 단언한다 —
  -- 행이 있어야 하는데 없으면 "협상은 confirmed인데 그 사람 기록만 빈 세트"가 되어
  -- 개인 결과에도 확인 요청 허브에도 뜨지 않는 유령 경기가 남는다.
  select user_id into v_partner_user_id from match_request_participants
  where request_id = p_request_id and role = 'partner';
  select user_id into v_opp2_user_id from match_request_participants
  where request_id = p_request_id and role = 'opponent2';

  if v_partner_user_id is not null then
    update personal_matches
    set set_scores = public.swap_partner_perspective(v_neg.proposed_set_scores)
    where source_request_id = p_request_id and user_id = v_partner_user_id;
    get diagnostics v_partner_rows = row_count;
    if public.is_active_member(v_partner_user_id)
       and v_partner_user_id not in (v_req.requester_id, v_req.opponent_user_id)
       and v_partner_rows <> 1 then
      raise exception 'perspective_row_missing';
    end if;
  end if;
  if v_opp2_user_id is not null then
    update personal_matches
    set set_scores = public.swap_partner_perspective(v_inverted)
    where source_request_id = p_request_id and user_id = v_opp2_user_id;
    get diagnostics v_opp2_rows = row_count;
    if public.is_active_member(v_opp2_user_id)
       and v_opp2_user_id not in (v_req.requester_id, v_req.opponent_user_id)
       and v_opp2_rows <> 1 then
      raise exception 'perspective_row_missing';
    end if;
  end if;

  update match_result_negotiations
  set set_scores = proposed_set_scores,
      result_status = 'confirmed',
      dispute_reason = null
  where request_id = p_request_id;
end;
$$;

revoke all on function public.confirm_match_result(uuid) from public;
revoke execute on function public.confirm_match_result(uuid) from anon;
grant execute on function public.confirm_match_result(uuid) to authenticated;
