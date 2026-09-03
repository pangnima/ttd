-- 0043_personal_match_court_name.sql
--- 개인 경기 등록 폼에 코트명(선택) 입력을 추가한다. 코트명은 개인 경기가 만들어지는 세 경로
--- (자유 기록 personal_matches / 로테이션 세션 rotation_sessions → finalize / 확인 요청 match_requests → accept)
--- 모두에서 최종 personal_matches 행까지 흘러야 하므로 3테이블에 같은 컬럼을 두고 RPC 3종을 재정의한다.
--- 대진표의 코트(match_game_courts.label)와 혼동을 피하려 컬럼명은 court_name.
---
--- 관점 규칙: notes는 사적 기록이라 accept_match_request가 요청자 행에만 남기지만, 코트명은 양측이 같은
--- 장소에서 친 객관 사실이므로 요청자·수락자 행 모두에 복사한다. finalize_rotation_session은 notes와 같이
--- 세션 값을 모든 게임 행에 상속한다.
---
--- create_match_request는 인자가 추가되므로 0041의 9인자 버전을 drop한다 (PostgREST 오버로드 모호성 방지).

-- ── 1) 컬럼 추가 ──
alter table public.personal_matches
  add column court_name text check (char_length(court_name) <= 40);
alter table public.rotation_sessions
  add column court_name text check (char_length(court_name) <= 40);
alter table public.match_requests
  add column court_name text check (char_length(court_name) <= 40);

-- ── 2) create_match_request — p_court_name 추가 ──
drop function if exists public.create_match_request(uuid, date, time, text, text, text, jsonb, jsonb, jsonb);

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
  v_sets jsonb;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if v_uid = p_opponent_user_id then raise exception 'cannot_request_self'; end if;
  if not exists (
    select 1 from users u where u.id = p_opponent_user_id and u.is_guest = false and u.deleted_at is null
  ) then
    raise exception 'invalid_opponent';
  end if;

  if p_set_scores is not null and jsonb_typeof(p_set_scores) = 'array' and jsonb_array_length(p_set_scores) > 0 then
    if not public.validate_set_scores(p_set_scores) then
      raise exception 'invalid_set_scores';
    end if;
    v_sets := public.normalize_set_scores(p_set_scores, v_is_doubles);
  else
    v_sets := '[]'::jsonb;
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
  values (v_id, v_uid, p_opponent_user_id, p_played_at, p_played_time, p_match_type, p_surface, p_notes, v_sets, nullif(btrim(p_court_name), ''));

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
grant execute on function public.create_match_request(uuid, date, time, text, text, text, jsonb, jsonb, jsonb, text) to authenticated;

-- ── 3) accept_match_request — 요청자·수락자 양행에 court_name 복사 (그 외 0040과 동일) ──
create or replace function public.accept_match_request(p_request_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_req match_requests%rowtype;
  v_requester users%rowtype;
  v_acceptor users%rowtype;
  v_member users%rowtype;
  v_is_doubles boolean;
  v_winner text;
  v_inverted_scores jsonb;
  v_requester_ntrp numeric;
  v_acceptor_ntrp numeric;
  v_partner_user_id uuid; v_partner_name text; v_partner_hand text; v_partner_ntrp numeric;
  v_opp2_user_id uuid; v_opp2_name text; v_opp2_hand text; v_opp2_ntrp numeric;
  v_pm_requester uuid := gen_random_uuid();
  v_pm_acceptor uuid := gen_random_uuid();
  v_result_status text;
begin
  select * into v_req from match_requests where id = p_request_id for update;
  if not found then raise exception 'request_not_found'; end if;
  if v_req.status <> 'pending' then raise exception 'request_not_pending'; end if;
  if v_req.opponent_user_id <> auth.uid() then raise exception 'not_request_opponent'; end if;

  select * into v_requester from users where id = v_req.requester_id;
  if not found or v_requester.deleted_at is not null then raise exception 'requester_deleted'; end if;
  select * into v_acceptor from users where id = v_req.opponent_user_id;

  v_is_doubles := v_req.match_type <> 'singles';

  if jsonb_array_length(v_req.set_scores) = 0 then
    v_winner := null;
    v_inverted_scores := '[]'::jsonb;
  else
    v_winner := public.personal_match_winner(v_req.set_scores);
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

  -- 요청자 행 (원본 관점, notes·court_name 포함)
  insert into personal_matches
    (id, user_id, source_type, source_request_id, played_at, played_time, match_type, surface, set_scores, winner, notes, court_name)
  values
    (v_pm_requester, v_req.requester_id, 'confirmation', v_req.id, v_req.played_at, v_req.played_time, v_req.match_type, v_req.surface, v_req.set_scores, v_winner, v_req.notes, v_req.court_name);

  insert into personal_match_participants (match_id, role, user_id, name, dominant_hand, ntrp_snapshot)
  values (v_pm_requester, 'opponent', v_acceptor.id, v_acceptor.name, v_acceptor.dominant_hand, v_acceptor_ntrp);
  if v_is_doubles then
    insert into personal_match_participants (match_id, role, user_id, name, dominant_hand, ntrp_snapshot)
    values (v_pm_requester, 'partner', v_partner_user_id, v_partner_name, v_partner_hand, v_partner_ntrp);
    insert into personal_match_participants (match_id, role, user_id, name, dominant_hand, ntrp_snapshot)
    values (v_pm_requester, 'opponent2', v_opp2_user_id, v_opp2_name, v_opp2_hand, v_opp2_ntrp);
  end if;

  -- 수락자 행 (반전 관점: 내 파트너=상대2, 상대=요청자, 상대2=요청자 파트너). notes는 요청자 사적 기록이라 제외, court_name은 공유
  insert into personal_matches
    (id, user_id, source_type, source_request_id, played_at, played_time, match_type, surface, set_scores, winner, notes, court_name)
  values
    (v_pm_acceptor, v_acceptor.id, 'confirmation', v_req.id, v_req.played_at, v_req.played_time, v_req.match_type, v_req.surface,
     v_inverted_scores,
     case v_winner when 'me' then 'opponent' when 'opponent' then 'me' when 'draw' then 'draw' else null end,
     null, v_req.court_name);

  insert into personal_match_participants (match_id, role, user_id, name, dominant_hand, ntrp_snapshot)
  values (v_pm_acceptor, 'opponent', v_requester.id, v_requester.name, v_requester.dominant_hand, v_requester_ntrp);
  if v_is_doubles then
    insert into personal_match_participants (match_id, role, user_id, name, dominant_hand, ntrp_snapshot)
    values (v_pm_acceptor, 'partner', v_opp2_user_id, v_opp2_name, v_opp2_hand, v_opp2_ntrp);
    insert into personal_match_participants (match_id, role, user_id, name, dominant_hand, ntrp_snapshot)
    values (v_pm_acceptor, 'opponent2', v_partner_user_id, v_partner_name, v_partner_hand, v_partner_ntrp);
  end if;

  v_result_status := case when jsonb_array_length(v_req.set_scores) = 0 then 'none' else 'confirmed' end;
  insert into match_result_negotiations (request_id, set_scores, result_status)
  values (p_request_id, v_req.set_scores, v_result_status);

  update match_requests set status = 'accepted', responded_at = now() where id = p_request_id;
end;
$$;

revoke all on function public.accept_match_request(uuid) from public;
grant execute on function public.accept_match_request(uuid) to authenticated;

-- ── 4) finalize_rotation_session — 세션 court_name을 게임 행에 상속 (그 외 0042와 동일) ──
create or replace function public.finalize_rotation_session(p_session_id uuid, p_games jsonb)
returns void
language plpgsql
as $$
declare
  v_s rotation_sessions%rowtype;
  g jsonb;
  v_sets jsonb;
  v_match_id uuid;
begin
  delete from rotation_sessions
  where id = p_session_id and user_id = auth.uid()
  returning * into v_s;
  if not found then raise exception 'session_not_found'; end if;

  if p_games is null or jsonb_typeof(p_games) <> 'array'
     or jsonb_array_length(p_games) < 1 or jsonb_array_length(p_games) > 20 then
    raise exception 'invalid_games';
  end if;

  for g in select value from jsonb_array_elements(p_games) loop
    if coalesce(g->'partner'->>'name', '') = ''
       or coalesce(g->'opp1'->>'name', '') = ''
       or coalesce(g->'opp2'->>'name', '') = '' then
      raise exception 'invalid_games';
    end if;
    if not public.validate_set_scores(g->'sets') then
      raise exception 'invalid_set_scores';
    end if;
    v_sets := public.normalize_set_scores(g->'sets', true);
    v_match_id := gen_random_uuid();

    insert into personal_matches (id, user_id, source_type, played_at, played_time, match_type, surface, set_scores, winner, notes, court_name)
    values (v_match_id, v_s.user_id, 'rotation', v_s.played_at, v_s.played_time, v_s.match_type, v_s.surface, v_sets, public.personal_match_winner(v_sets), v_s.notes, v_s.court_name);

    insert into personal_match_participants (match_id, role, user_id, name, dominant_hand, ntrp_snapshot)
    values (v_match_id, 'opponent', nullif(g->'opp1'->>'userId', '')::uuid, g->'opp1'->>'name', nullif(g->'opp1'->>'hand', ''), nullif(g->'opp1'->>'ntrp', '')::numeric);
    insert into personal_match_participants (match_id, role, user_id, name, dominant_hand, ntrp_snapshot)
    values (v_match_id, 'partner', nullif(g->'partner'->>'userId', '')::uuid, g->'partner'->>'name', nullif(g->'partner'->>'hand', ''), nullif(g->'partner'->>'ntrp', '')::numeric);
    insert into personal_match_participants (match_id, role, user_id, name, dominant_hand, ntrp_snapshot)
    values (v_match_id, 'opponent2', nullif(g->'opp2'->>'userId', '')::uuid, g->'opp2'->>'name', nullif(g->'opp2'->>'hand', ''), nullif(g->'opp2'->>'ntrp', '')::numeric);
  end loop;
end;
$$;

revoke all on function public.finalize_rotation_session(uuid, jsonb) from public;
grant execute on function public.finalize_rotation_session(uuid, jsonb) to authenticated;
