-- 20260908051034 0063_rotation_consent_symmetry
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
-- 0063 — 로테이션 참여 동의의 대칭 완성: 어느 카드로 수락해도 두 축이 함께 움직인다

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

  perform 1 from rotation_sessions where id = p_rotation_session_id for update;
  v_session_exists := found;

  if v_session_exists then
    update rotation_session_participants
    set participation_status = case when p_accept then 'accepted' else 'rejected' end,
        responded_at = now()
    where session_id = p_rotation_session_id and user_id = v_uid and participation_status = 'pending';
    get diagnostics v_seat_rows = row_count;

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

  perform 1 from rotation_sessions where id = p_session_id for update;
  if not found then raise exception 'session_not_found'; end if;

  update rotation_session_participants
  set participation_status = case when p_accept then 'accepted' else 'rejected' end,
      responded_at = now()
  where session_id = p_session_id and user_id = v_uid and participation_status = 'pending';
  get diagnostics v_rows = row_count;
  if v_rows = 0 then raise exception 'plan_already_responded'; end if;

  if not p_accept then
    update rotation_sessions
    set players = coalesce((
      select jsonb_agg(e) from jsonb_array_elements(players) e
      where nullif(e->>'userId', '')::uuid is distinct from v_uid
    ), '[]'::jsonb)
    where id = p_session_id;
  end if;

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

alter table public.match_requests
  add constraint match_requests_offroom_no_scores
  check (room_id is not null or set_scores = '[]'::jsonb) not valid;

comment on column public.match_requests.set_scores is
  '요청 시점 원본 스코어 — 방 밖 요청은 언제나 빈 배열이다(0063 CHECK match_requests_offroom_no_scores). 스코어는 match_result_negotiations에만 살아야 한다: 요청 행에 실리면 materialize_accepted_request가 전원 수락 순간 아무 좌석의 확인 없이 확정한다.';
