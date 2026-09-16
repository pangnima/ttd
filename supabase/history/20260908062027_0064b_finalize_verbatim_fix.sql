-- 20260908062027 0064b_finalize_verbatim_fix
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
-- 0064 §1 재적용 — 첫 적용본이 0057 원문을 옮기는 과정에서 allowlist 위조 방어
-- (participant_not_in_room)와 resolve_rotation_player 시그니처를 잘못 옮겼다. 원문 정본으로 교체한다.

drop function if exists public.finalize_rotation_session(uuid, jsonb);
drop function if exists public.finalize_rotation_session(uuid, jsonb, int);

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
  select coalesce(greatest(
    (select max(group_seq) from personal_matches where rotation_session_id = p_session_id),
    (select max(group_seq) from match_requests where rotation_session_id = p_session_id)
  ), 0) into v_seq;

  -- 0064 — 낙관적 선점. 빌더가 "새 게임은 N번부터"로 이미 보여 준 값과 서버의 다음 번호가 어긋났다면
  -- 그 사이에 다른 참가자가 등록한 것이다. null이면 검사하지 않는다(옛 2인자 호출 호환).
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
    --     0064 이후 방 밖에서도 항상 true다(진입 가드가 pending을 막는다). false 갈래는
    --     0064 이전에 선적립된 pending 요청을 위한 최후 방어선으로 남긴다.
    v_immediate := v_is_room
      or public.rotation_seats_accepted(p_session_id, array[v_partner_id, v_opp1_id, v_opp2_id]);

    -- 대표 결정 — 상대1 → 상대2 (클라이언트 resolveConfirmRep와 같은 규칙).
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

      insert into match_request_participants (request_id, role, user_id, name, dominant_hand, ntrp_snapshot)
      values (v_req_id, 'partner', v_partner_id, v_partner->>'name',
              nullif(v_partner->>'hand', ''), nullif(v_partner->>'ntrp', '')::numeric);
      insert into match_request_participants (request_id, role, user_id, name, dominant_hand, ntrp_snapshot)
      values (v_req_id, 'opponent2', nullif(v_other->>'userId', '')::uuid, v_other->>'name',
              nullif(v_other->>'hand', ''), nullif(v_other->>'ntrp', '')::numeric);

      if v_immediate then
        perform public.materialize_accepted_request(v_req_id, p_session_id, v_seq::smallint);
        perform public.propose_match_result(v_req_id, v_sets);
      else
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

comment on function public.finalize_rotation_session(uuid, jsonb, int) is
  '로테이션 세션 → 게임별 기록 분해. 방 밖 세션은 좌석 전원이 응답해야 진입할 수 있고(0064 session_seats_pending), p_expected_seq로 다른 참가자의 선점을 감지한다(session_games_changed).';
