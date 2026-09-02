-- 0038_doubles_confirm_and_rotation_sessions.sql
--- 복식 개인 경기를 단식과 동일한 플로우로 확장.
---   1) rotation_sessions — 로테이션(파트너 교체) 복식은 등록 시 선수 풀만 저장하고,
---      게임(팀 구성+세트)은 카드 '결과 입력'에서 나중에 입력 → finalize RPC가 게임별 personal_matches 행으로 분해한다.
---      personal_matches 밖에 두는 이유: opponent_name NOT NULL·"만나본 사람" 자동완성·통계 소비처를 placeholder 행으로 오염시키지 않기 위해.
---   2) match_requests — 페어 고정 복식 상호 확인. 상대팀 회원 1명(opponent_user_id)이 대표로 확인하고,
---      수락 시 요청자 행/수락자 행 2행만 생성한다(파트너·상대2가 회원이어도 그들 기록에는 생성하지 않음).
---   3) 애드/듀스(myAd/oppAd) 관점 교차 반전 — 요청자 관점 myAd 'me'→상대 관점 oppAd 'opponent', 'partner'→'opponent2' (역방향 동일).
---      invert_set_scores / validate_set_scores / propose_match_result / accept_match_request가 모두 애드 키를 보존한다.

-- ── 1) rotation_sessions ──
create table public.rotation_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  played_at date not null,
  played_time time not null,
  match_type text not null check (match_type in ('men_doubles', 'women_doubles', 'mixed_doubles')),
  surface text not null check (surface in ('hard', 'clay', 'grass', 'other')),
  notes text,
  -- 선수 풀(나 제외): [{userId?, name, hand?, ntrp?}] 3명 이상
  players jsonb not null
    check (jsonb_typeof(players) = 'array' and jsonb_array_length(players) >= 3),
  created_at timestamptz not null default now()
);

create index rotation_sessions_user_idx on public.rotation_sessions(user_id, played_at desc);

alter table public.rotation_sessions enable row level security;

create policy rotation_sessions_select on public.rotation_sessions
  for select using (user_id = auth.uid());
create policy rotation_sessions_insert on public.rotation_sessions
  for insert with check (user_id = auth.uid());
create policy rotation_sessions_delete on public.rotation_sessions
  for delete using (user_id = auth.uid());
-- UPDATE 정책 없음 — 세션은 삭제 후 재등록(finalize는 RPC가 delete)

-- ── 2) match_requests: 복식 허용 + 파트너/상대2 ──
alter table public.match_requests drop constraint match_requests_match_type_check;
alter table public.match_requests
  add constraint match_requests_match_type_check
  check (match_type in ('singles', 'men_doubles', 'women_doubles', 'mixed_doubles'));

alter table public.match_requests
  add column partner_user_id uuid references public.users(id) on delete set null,
  add column partner_name text,
  add column partner_dominant_hand text check (partner_dominant_hand in ('right', 'left')),
  add column partner_ntrp numeric check (partner_ntrp is null or (partner_ntrp >= 1.0 and partner_ntrp <= 7.0)),
  add column opponent2_user_id uuid references public.users(id) on delete set null,
  add column opponent2_name text,
  add column opponent2_dominant_hand text check (opponent2_dominant_hand in ('right', 'left')),
  add column opponent2_ntrp numeric check (opponent2_ntrp is null or (opponent2_ntrp >= 1.0 and opponent2_ntrp <= 7.0));

-- 복식이면 파트너·상대2가 (회원 id 또는 이름) 필수
alter table public.match_requests
  add constraint match_requests_doubles_players_check check (
    match_type = 'singles'
    or (
      (partner_user_id is not null or partner_name is not null)
      and (opponent2_user_id is not null or opponent2_name is not null)
    )
  );

-- 회원 참가자는 서로·요청자·대표와 겹칠 수 없음
alter table public.match_requests
  add constraint match_requests_distinct_players_check check (
    (partner_user_id is null or (partner_user_id <> requester_id and partner_user_id <> opponent_user_id))
    and (opponent2_user_id is null or (opponent2_user_id <> requester_id and opponent2_user_id <> opponent_user_id))
    and (partner_user_id is null or opponent2_user_id is null or partner_user_id <> opponent2_user_id)
  );

-- ── 3) helper ──

-- 회원의 공개 NTRP 파생 (0034 accept의 인라인 규칙 추출):
-- 통계 비공개(stats_hidden) 유저는 자가선언 ntrp만, 아니면 동적 personal_ntrp 우선. personal_matches 1.0~7.0 check 밖이면 null.
create or replace function public.derive_public_ntrp(p_user public.users)
returns numeric
language sql stable
as $$
  select case when t.v is null or t.v < 1 or t.v > 7 then null else t.v end
  from (
    select case
      when p_user.stats_hidden then p_user.ntrp
      else coalesce(p_user.personal_ntrp, p_user.ntrp)
    end as v
  ) t;
$$;

-- me ↔ opp 반전 + 애드/듀스 관점 교차 (키가 있을 때만 보존). 세트 순서 보존.
create or replace function public.invert_set_scores(p_sets jsonb)
returns jsonb
language sql immutable
as $$
  select coalesce(
    jsonb_agg(
      jsonb_strip_nulls(jsonb_build_object(
        'me', e->'opp',
        'opp', e->'me',
        'myAd', case e->>'oppAd'
                  when 'opponent' then to_jsonb('me'::text)
                  when 'opponent2' then to_jsonb('partner'::text)
                  else null end,
        'oppAd', case e->>'myAd'
                   when 'me' then to_jsonb('opponent'::text)
                   when 'partner' then to_jsonb('opponent2'::text)
                   else null end
      ))
      order by ord
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(coalesce(p_sets, '[]'::jsonb)) with ordinality t(e, ord);
$$;

-- 세트 검증: 배열 1~5개, me/opp 0~99 정수, 0-0 금지, 애드 키는 있으면 enum.
create or replace function public.validate_set_scores(p_sets jsonb)
returns boolean
language plpgsql immutable
as $$
declare
  e jsonb;
  v_me numeric;
  v_opp numeric;
begin
  if p_sets is null or jsonb_typeof(p_sets) <> 'array' then
    return false;
  end if;
  if jsonb_array_length(p_sets) < 1 or jsonb_array_length(p_sets) > 5 then
    return false;
  end if;
  for e in select value from jsonb_array_elements(p_sets) loop
    if coalesce(jsonb_typeof(e->'me'), '') <> 'number'
       or coalesce(jsonb_typeof(e->'opp'), '') <> 'number' then
      return false;
    end if;
    v_me := (e->>'me')::numeric;
    v_opp := (e->>'opp')::numeric;
    if v_me <> floor(v_me) or v_opp <> floor(v_opp) then
      return false;
    end if;
    if v_me < 0 or v_me > 99 or v_opp < 0 or v_opp > 99 then
      return false;
    end if;
    if v_me = 0 and v_opp = 0 then
      return false;
    end if;
    if (e ? 'myAd') and jsonb_typeof(e->'myAd') <> 'null' and (e->>'myAd') not in ('me', 'partner') then
      return false;
    end if;
    if (e ? 'oppAd') and jsonb_typeof(e->'oppAd') <> 'null' and (e->>'oppAd') not in ('opponent', 'opponent2') then
      return false;
    end if;
  end loop;
  return true;
end;
$$;

-- 세트 정규화: me/opp 정수 + (복식이면) 애드 키 보존. 단식은 애드 키 제거.
create or replace function public.normalize_set_scores(p_sets jsonb, p_keep_ad boolean)
returns jsonb
language sql immutable
as $$
  select coalesce(
    jsonb_agg(
      jsonb_strip_nulls(jsonb_build_object(
        'me', (e->>'me')::int,
        'opp', (e->>'opp')::int,
        'myAd', case when p_keep_ad then e->'myAd' else null end,
        'oppAd', case when p_keep_ad then e->'oppAd' else null end
      ))
      order by ord
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(coalesce(p_sets, '[]'::jsonb)) with ordinality t(e, ord);
$$;

-- ── 4) 결과 제안 RPC: 애드 보존 ──
create or replace function public.propose_match_result(p_request_id uuid, p_set_scores jsonb)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_req public.match_requests%rowtype;
  v_uid uuid := auth.uid();
  v_counterpart_id uuid;
  v_counterpart_deleted timestamptz;
  v_sets jsonb;
begin
  select * into v_req from public.match_requests where id = p_request_id for update;
  if not found then
    raise exception 'request_not_found';
  end if;
  if v_req.status <> 'accepted' then
    raise exception 'request_not_accepted';
  end if;
  if v_uid is null or (v_req.requester_id <> v_uid and v_req.opponent_user_id <> v_uid) then
    raise exception 'not_request_party';
  end if;
  if v_req.result_status = 'confirmed' then
    raise exception 'result_already_confirmed';
  end if;
  if v_req.result_status = 'proposed' and v_req.proposed_by is distinct from v_uid then
    raise exception 'result_already_proposed';
  end if;

  v_counterpart_id := case when v_req.requester_id = v_uid then v_req.opponent_user_id else v_req.requester_id end;
  select deleted_at into v_counterpart_deleted from public.users where id = v_counterpart_id;
  if v_counterpart_deleted is not null then
    raise exception 'counterpart_deleted';
  end if;

  if not public.validate_set_scores(p_set_scores) then
    raise exception 'invalid_set_scores';
  end if;

  -- 호출자 관점 정규화 (복식이면 애드 키 보존) → 요청자 관점으로 저장 (호출자가 상대면 반전)
  v_sets := public.normalize_set_scores(p_set_scores, v_req.match_type <> 'singles');
  if v_req.opponent_user_id = v_uid then
    v_sets := public.invert_set_scores(v_sets);
  end if;

  update public.match_requests
  set result_status = 'proposed',
      proposed_set_scores = v_sets,
      proposed_by = v_uid,
      proposed_at = now(),
      dispute_reason = null
  where id = p_request_id;
end;
$$;

-- ── 5) 수락 RPC: 복식 분기 (0034판 기반) ──
--- 요청자 행: partner=요청 파트너, opponent=수락자(대표), opponent2=요청 상대2
--- 수락자 행: partner=요청 상대2(수락자의 파트너), opponent=요청자, opponent2=요청 파트너
--- 파트너/상대2 NTRP: 회원이면 derive_public_ntrp, 아니면 요청 저장값. 이름은 회원이면 users.name.
create or replace function public.accept_match_request(p_request_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_req public.match_requests%rowtype;
  v_requester public.users%rowtype;
  v_acceptor public.users%rowtype;
  v_member public.users%rowtype;
  v_is_doubles boolean;
  v_winner text;
  v_inverted_scores jsonb;
  v_requester_ntrp numeric;
  v_acceptor_ntrp numeric;
  v_partner_name text;
  v_partner_ntrp numeric;
  v_opp2_name text;
  v_opp2_ntrp numeric;
begin
  select * into v_req from public.match_requests where id = p_request_id for update;
  if not found then
    raise exception 'request_not_found';
  end if;
  if v_req.status <> 'pending' then
    raise exception 'request_not_pending';
  end if;
  if v_req.opponent_user_id <> auth.uid() then
    raise exception 'not_request_opponent';
  end if;

  select * into v_requester from public.users where id = v_req.requester_id;
  if not found or v_requester.deleted_at is not null then
    raise exception 'requester_deleted';
  end if;
  select * into v_acceptor from public.users where id = v_req.opponent_user_id;

  v_is_doubles := v_req.match_type <> 'singles';

  if jsonb_array_length(v_req.set_scores) = 0 then
    -- 세트 없음 = 결과 미확정. 양측 모두 winner NULL, 빈 세트로 기록한다.
    v_winner := null;
    v_inverted_scores := '[]'::jsonb;
  else
    v_winner := public.personal_match_winner(v_req.set_scores);
    v_inverted_scores := public.invert_set_scores(v_req.set_scores);
  end if;

  v_requester_ntrp := public.derive_public_ntrp(v_requester);
  v_acceptor_ntrp := public.derive_public_ntrp(v_acceptor);

  -- 복식: 파트너/상대2 이름·NTRP (회원이면 users 파생, 아니면 요청 저장값)
  if v_is_doubles then
    v_partner_name := v_req.partner_name;
    v_partner_ntrp := v_req.partner_ntrp;
    if v_req.partner_user_id is not null then
      select * into v_member from public.users where id = v_req.partner_user_id;
      if found then
        v_partner_name := v_member.name;
        v_partner_ntrp := coalesce(public.derive_public_ntrp(v_member), v_req.partner_ntrp);
      end if;
    end if;
    v_opp2_name := v_req.opponent2_name;
    v_opp2_ntrp := v_req.opponent2_ntrp;
    if v_req.opponent2_user_id is not null then
      select * into v_member from public.users where id = v_req.opponent2_user_id;
      if found then
        v_opp2_name := v_member.name;
        v_opp2_ntrp := coalesce(public.derive_public_ntrp(v_member), v_req.opponent2_ntrp);
      end if;
    end if;
  end if;

  -- 요청자 행 (원본 관점, notes 포함)
  insert into public.personal_matches
    (user_id, opponent_name, opponent_user_id, opponent_ntrp,
     partner_name, partner_user_id, partner_dominant_hand, partner_ntrp,
     opponent2_name, opponent2_user_id, opponent2_dominant_hand, opponent2_ntrp,
     played_at, played_time, match_type, surface, set_scores, winner, notes, source_request_id)
  values
    (v_req.requester_id, v_acceptor.name, v_acceptor.id, v_acceptor_ntrp,
     case when v_is_doubles then v_partner_name end,
     case when v_is_doubles then v_req.partner_user_id end,
     case when v_is_doubles then v_req.partner_dominant_hand end,
     case when v_is_doubles then v_partner_ntrp end,
     case when v_is_doubles then v_opp2_name end,
     case when v_is_doubles then v_req.opponent2_user_id end,
     case when v_is_doubles then v_req.opponent2_dominant_hand end,
     case when v_is_doubles then v_opp2_ntrp end,
     v_req.played_at, v_req.played_time, v_req.match_type, v_req.surface,
     v_req.set_scores, v_winner, v_req.notes, v_req.id);

  -- 수락자 행 (반전 관점: 내 파트너=상대2, 상대=요청자, 상대2=요청자 파트너)
  insert into public.personal_matches
    (user_id, opponent_name, opponent_user_id, opponent_ntrp,
     partner_name, partner_user_id, partner_dominant_hand, partner_ntrp,
     opponent2_name, opponent2_user_id, opponent2_dominant_hand, opponent2_ntrp,
     played_at, played_time, match_type, surface, set_scores, winner, notes, source_request_id)
  values
    (v_acceptor.id, v_requester.name, v_requester.id, v_requester_ntrp,
     case when v_is_doubles then v_opp2_name end,
     case when v_is_doubles then v_req.opponent2_user_id end,
     case when v_is_doubles then v_req.opponent2_dominant_hand end,
     case when v_is_doubles then v_opp2_ntrp end,
     case when v_is_doubles then v_partner_name end,
     case when v_is_doubles then v_req.partner_user_id end,
     case when v_is_doubles then v_req.partner_dominant_hand end,
     case when v_is_doubles then v_partner_ntrp end,
     v_req.played_at, v_req.played_time, v_req.match_type, v_req.surface,
     v_inverted_scores,
     case v_winner when 'me' then 'opponent' when 'opponent' then 'me' when 'draw' then 'draw' else null end,
     null, v_req.id);

  update public.match_requests
  set status = 'accepted', responded_at = now()
  where id = p_request_id;
end;
$$;

-- ── 6) 로테이션 세션 확정 RPC (security invoker — RLS가 소유를 강제, 함수는 원자성만 제공) ──
--- p_games: [{partner:{userId?,name,hand?,ntrp?}, opp1:{...}, opp2:{...}, sets:[{me,opp,myAd?,oppAd?}]}]
--- 게임별 personal_matches 행 insert(세션 메타 주입) → 세션 delete. 하나라도 실패하면 전체 롤백.
create or replace function public.finalize_rotation_session(p_session_id uuid, p_games jsonb)
returns void
language plpgsql
as $$
declare
  v_s public.rotation_sessions%rowtype;
  g jsonb;
  v_sets jsonb;
begin
  select * into v_s from public.rotation_sessions
  where id = p_session_id and user_id = auth.uid() for update;
  if not found then
    raise exception 'session_not_found';
  end if;
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

    insert into public.personal_matches
      (user_id,
       opponent_name, opponent_user_id, opponent_dominant_hand, opponent_ntrp,
       partner_name, partner_user_id, partner_dominant_hand, partner_ntrp,
       opponent2_name, opponent2_user_id, opponent2_dominant_hand, opponent2_ntrp,
       played_at, played_time, match_type, surface, set_scores, winner, notes)
    values
      (v_s.user_id,
       g->'opp1'->>'name', nullif(g->'opp1'->>'userId', '')::uuid, nullif(g->'opp1'->>'hand', ''), nullif(g->'opp1'->>'ntrp', '')::numeric,
       g->'partner'->>'name', nullif(g->'partner'->>'userId', '')::uuid, nullif(g->'partner'->>'hand', ''), nullif(g->'partner'->>'ntrp', '')::numeric,
       g->'opp2'->>'name', nullif(g->'opp2'->>'userId', '')::uuid, nullif(g->'opp2'->>'hand', ''), nullif(g->'opp2'->>'ntrp', '')::numeric,
       v_s.played_at, v_s.played_time, v_s.match_type, v_s.surface,
       v_sets, public.personal_match_winner(v_sets), v_s.notes);
  end loop;

  delete from public.rotation_sessions where id = p_session_id;
end;
$$;

revoke all on function public.finalize_rotation_session(uuid, jsonb) from public;
grant execute on function public.finalize_rotation_session(uuid, jsonb) to authenticated;
revoke all on function public.propose_match_result(uuid, jsonb) from public;
grant execute on function public.propose_match_result(uuid, jsonb) to authenticated;
revoke all on function public.accept_match_request(uuid) from public;
grant execute on function public.accept_match_request(uuid) to authenticated;
