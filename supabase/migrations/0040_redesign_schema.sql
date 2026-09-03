-- 0040_redesign_schema.sql
--- DB 재설계 2단계: docs/redesign/erd.md에 따른 신규 스키마.
--- 핵심 변경: (1) match_game_matches/personal_matches/match_requests의 다형성 컬럼을
---   참가자 테이블(match_game_participants/personal_match_participants/match_request_participants)로 정규화
---   (2) match_requests의 2축 상태머신 중 결과협상 축을 match_result_negotiations로 분리
---   (3) 요청 생성은 참가자 원자적 삽입을 위해 신규 RPC create_match_request로 일원화(직접 INSERT 정책 폐지)
--- 순수 jsonb 함수(personal_match_winner/invert_set_scores/validate_set_scores/normalize_set_scores/
--- derive_public_ntrp)는 0033/0037/0038에서 정의된 것을 그대로 사용한다(본 마이그레이션에서 재정의하지 않음).

-- ════════════════════════════════════════════════════════════════
-- 1) match_game_matches + match_game_participants
-- ════════════════════════════════════════════════════════════════

create table public.match_game_matches (
  id uuid primary key default gen_random_uuid(),
  match_game_id uuid not null references public.match_games(id) on delete cascade,
  round_id uuid not null references public.match_game_rounds(id) on delete cascade,
  court_id uuid not null references public.match_game_courts(id) on delete cascade,
  time_slot_id uuid not null references public.match_game_time_slots(id) on delete cascade,
  match_type text not null check (match_type in ('singles','men_doubles','women_doubles','mixed_doubles')),
  status text not null default 'scheduled' check (status in ('scheduled','finished')),
  result_sets jsonb,
  winner_id text check (winner_id in ('team1','team2','draw')),
  "order" integer not null default 0
);

create index match_game_matches_match_game_idx on public.match_game_matches(match_game_id);

create table public.match_game_participants (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.match_game_matches(id) on delete cascade,
  user_id uuid not null references public.users(id),
  side text not null check (side in ('team1','team2')),
  is_ad boolean not null default false,
  unique (match_id, user_id)
);

create index match_game_participants_match_idx on public.match_game_participants(match_id);
create index match_game_participants_user_idx on public.match_game_participants(user_id);

-- club_rating_history.match_id FK는 0039 DROP TABLE CASCADE로 제거됐으므로 재생성.
alter table public.club_rating_history
  add constraint club_rating_history_match_id_fkey
  foreign key (match_id) references public.match_game_matches(id) on delete set null;

alter table public.match_game_matches enable row level security;
alter table public.match_game_participants enable row level security;

create policy match_game_matches_select on public.match_game_matches
  for select to authenticated using (
    is_club_approved_member((select mg.club_id from match_games mg where mg.id = match_game_matches.match_game_id), auth.uid())
  );
create policy match_game_matches_insert on public.match_game_matches
  for insert to authenticated with check (
    is_club_approved_member((select mg.club_id from match_games mg where mg.id = match_game_matches.match_game_id), auth.uid())
  );
create policy match_game_matches_update on public.match_game_matches
  for update to authenticated using (
    is_club_approved_member((select mg.club_id from match_games mg where mg.id = match_game_matches.match_game_id), auth.uid())
  );
create policy match_game_matches_delete on public.match_game_matches
  for delete to authenticated using (
    is_club_owner((select mg.club_id from match_games mg where mg.id = match_game_matches.match_game_id), auth.uid())
  );

create policy match_game_participants_select on public.match_game_participants
  for select to authenticated using (
    is_club_approved_member((select mg.club_id from match_game_matches m join match_games mg on mg.id = m.match_game_id where m.id = match_game_participants.match_id), auth.uid())
  );
create policy match_game_participants_insert on public.match_game_participants
  for insert to authenticated with check (
    is_club_approved_member((select mg.club_id from match_game_matches m join match_games mg on mg.id = m.match_game_id where m.id = match_game_participants.match_id), auth.uid())
  );
create policy match_game_participants_update on public.match_game_participants
  for update to authenticated using (
    is_club_approved_member((select mg.club_id from match_game_matches m join match_games mg on mg.id = m.match_game_id where m.id = match_game_participants.match_id), auth.uid())
  );
create policy match_game_participants_delete on public.match_game_participants
  for delete to authenticated using (
    is_club_owner((select mg.club_id from match_game_matches m join match_games mg on mg.id = m.match_game_id where m.id = match_game_participants.match_id), auth.uid())
  );

-- ════════════════════════════════════════════════════════════════
-- 2) match_requests + match_request_participants + match_result_negotiations
-- ════════════════════════════════════════════════════════════════

create table public.match_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.users(id) on delete cascade,
  opponent_user_id uuid not null references public.users(id) on delete cascade,  -- 대표 확인자(복식 포함)
  played_at date not null,
  played_time time not null,
  match_type text not null default 'singles' check (match_type in ('singles','men_doubles','women_doubles','mixed_doubles')),
  surface text not null check (surface in ('hard','clay','grass','other')),
  notes text,
  status text not null default 'pending' check (status in ('pending','accepted','rejected','canceled')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> opponent_user_id)
);

create index match_requests_opponent_idx on public.match_requests(opponent_user_id, status);
create index match_requests_requester_idx on public.match_requests(requester_id);
create unique index match_requests_pending_dedup_uidx
  on public.match_requests(requester_id, opponent_user_id, played_at, played_time)
  where status = 'pending';

create table public.match_request_participants (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.match_requests(id) on delete cascade,
  role text not null check (role in ('partner','opponent2')),
  user_id uuid references public.users(id) on delete set null,
  name text not null,
  dominant_hand text check (dominant_hand in ('right','left')),
  ntrp_snapshot numeric check (ntrp_snapshot is null or (ntrp_snapshot >= 1.0 and ntrp_snapshot <= 7.0)),
  unique (request_id, role)
);

create table public.match_result_negotiations (
  request_id uuid primary key references public.match_requests(id) on delete cascade,
  set_scores jsonb not null default '[]'::jsonb check (jsonb_typeof(set_scores) = 'array'),
  result_status text not null default 'none' check (result_status in ('none','proposed','confirmed','disputed')),
  proposed_set_scores jsonb not null default '[]'::jsonb check (jsonb_typeof(proposed_set_scores) = 'array'),
  proposed_by uuid references public.users(id) on delete set null,
  proposed_at timestamptz,
  dispute_reason text check (dispute_reason is null or char_length(dispute_reason) <= 200)
);

-- 결과 확인 대기 배지 카운트용 부분 인덱스 (0037과 동일 목적)
create index match_result_negotiations_proposed_idx
  on public.match_result_negotiations(request_id) where result_status = 'proposed';

alter table public.match_requests enable row level security;
alter table public.match_request_participants enable row level security;
alter table public.match_result_negotiations enable row level security;

-- 당사자 둘만 조회
create policy match_requests_select on public.match_requests
  for select using (requester_id = auth.uid() or opponent_user_id = auth.uid());

-- 생성: create_match_request RPC 전용 (직접 INSERT 정책 없음 — 참가자 원자성 보장을 위해 0038까지의
-- 직접 INSERT 방식을 폐지). RPC는 SECURITY DEFINER로 RLS를 우회해 기록한다.

-- 취소: 요청자 본인, pending에서만 → canceled로만
create policy match_requests_cancel on public.match_requests
  for update using (requester_id = auth.uid() and status = 'pending')
  with check (requester_id = auth.uid() and status = 'canceled');

-- 거절: 상대 본인, pending에서만 → rejected로만
create policy match_requests_reject on public.match_requests
  for update using (opponent_user_id = auth.uid() and status = 'pending')
  with check (opponent_user_id = auth.uid() and status = 'rejected');

-- accepted 전이와 결과 협상은 RPC 전용 경로. DELETE 정책 없음(이력 보존).

create policy match_request_participants_select on public.match_request_participants
  for select using (
    exists (
      select 1 from match_requests r
      where r.id = match_request_participants.request_id
        and (r.requester_id = auth.uid() or r.opponent_user_id = auth.uid())
    )
  );
-- 쓰기는 create_match_request RPC 전용 (직접 INSERT/UPDATE/DELETE 정책 없음).

create policy match_result_negotiations_select on public.match_result_negotiations
  for select using (
    exists (
      select 1 from match_requests r
      where r.id = match_result_negotiations.request_id
        and (r.requester_id = auth.uid() or r.opponent_user_id = auth.uid())
    )
  );
-- 쓰기는 accept_match_request/propose_match_result/confirm_match_result/dispute_match_result RPC 전용.

-- ════════════════════════════════════════════════════════════════
-- 3) personal_matches + personal_match_participants
-- ════════════════════════════════════════════════════════════════

create table public.personal_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  source_type text not null default 'direct' check (source_type in ('direct','confirmation','rotation')),
  source_request_id uuid references public.match_requests(id) on delete set null,
  played_at date not null,
  played_time time,
  match_type text not null check (match_type in ('singles','men_doubles','women_doubles','mixed_doubles')),
  surface text check (surface in ('hard','clay','grass','other')),
  set_scores jsonb not null default '[]'::jsonb,
  winner text check (winner in ('me','opponent','draw')),
  notes text,
  created_at timestamptz not null default now()
);

create index personal_matches_user_idx on public.personal_matches(user_id, played_at desc);
create index personal_matches_source_request_idx on public.personal_matches(source_request_id);

create table public.personal_match_participants (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.personal_matches(id) on delete cascade,
  role text not null check (role in ('opponent','partner','opponent2')),
  user_id uuid references public.users(id) on delete set null,
  name text not null,
  dominant_hand text check (dominant_hand in ('right','left')),
  ntrp_snapshot numeric check (ntrp_snapshot is null or (ntrp_snapshot >= 1.0 and ntrp_snapshot <= 7.0)),
  unique (match_id, role)
);

create index personal_match_participants_match_idx on public.personal_match_participants(match_id);
create index personal_match_participants_user_idx on public.personal_match_participants(user_id);

alter table public.personal_matches enable row level security;
alter table public.personal_match_participants enable row level security;

create policy personal_matches_select on public.personal_matches
  for select using (user_id = auth.uid());
create policy personal_matches_insert on public.personal_matches
  for insert with check (user_id = auth.uid());
create policy personal_matches_update on public.personal_matches
  for update using (user_id = auth.uid());
create policy personal_matches_delete on public.personal_matches
  for delete using (user_id = auth.uid());

-- 상호확인(confirmation) 출처 경기는 당사자도 수정/삭제 불가 (0033과 동일 취지, source_type 기준으로 명시화)
create policy personal_matches_lock_update on public.personal_matches
  as restrictive for update using (source_type <> 'confirmation');
create policy personal_matches_lock_delete on public.personal_matches
  as restrictive for delete using (source_type <> 'confirmation');

create policy personal_match_participants_select on public.personal_match_participants
  for select using (
    exists (select 1 from personal_matches pm where pm.id = personal_match_participants.match_id and pm.user_id = auth.uid())
  );
create policy personal_match_participants_insert on public.personal_match_participants
  for insert with check (
    exists (select 1 from personal_matches pm where pm.id = personal_match_participants.match_id and pm.user_id = auth.uid())
  );
create policy personal_match_participants_update on public.personal_match_participants
  for update using (
    exists (select 1 from personal_matches pm where pm.id = personal_match_participants.match_id and pm.user_id = auth.uid())
  );
create policy personal_match_participants_delete on public.personal_match_participants
  for delete using (
    exists (select 1 from personal_matches pm where pm.id = personal_match_participants.match_id and pm.user_id = auth.uid())
  );
create policy personal_match_participants_lock_update on public.personal_match_participants
  as restrictive for update using (
    exists (select 1 from personal_matches pm where pm.id = personal_match_participants.match_id and pm.source_type <> 'confirmation')
  );
create policy personal_match_participants_lock_delete on public.personal_match_participants
  as restrictive for delete using (
    exists (select 1 from personal_matches pm where pm.id = personal_match_participants.match_id and pm.source_type <> 'confirmation')
  );

-- ════════════════════════════════════════════════════════════════
-- 4) user_match_participations 뷰 재생성 (참가자 테이블 기반, 4-way UNION 불필요)
-- ════════════════════════════════════════════════════════════════

create view public.user_match_participations
with (security_invoker = on) as
select
  m.id as match_id,
  m.match_type,
  p.user_id,
  case
    when m.winner_id = p.side then 'win'
    when m.winner_id = 'draw' then 'draw'
    when m.winner_id is not null then 'loss'
    else null
  end as result,
  g.club_id
from public.match_game_matches m
join public.match_games g on g.id = m.match_game_id
join public.match_game_participants p on p.match_id = m.id
where m.status = 'finished' and g.is_fixed = true;

-- ════════════════════════════════════════════════════════════════
-- 5) RPC 재작성 — 대진표
-- ════════════════════════════════════════════════════════════════

-- p_matches 원소 shape 변경: player1_id/player2_id/team1/team2 → participants:[{user_id,side,is_ad}]
create or replace function public.create_match_game(p_club_id uuid, p_name text, p_date date, p_courts jsonb, p_rounds jsonb, p_matches jsonb)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
    v_mg_id     uuid := gen_random_uuid();
    v_court     jsonb;
    v_round     jsonb;
    v_ts        jsonb;
    v_match     jsonb;
    v_participant jsonb;
    v_ord       int;
    v_court_id  uuid;
    v_round_id  uuid;
    v_ts_id     uuid;
    v_match_id  uuid;
    v_court_map jsonb := '{}'::jsonb;
    v_round_map jsonb := '{}'::jsonb;
    v_ts_map    jsonb := '{}'::jsonb;
begin
    if not is_club_approved_member(p_club_id, auth.uid()) then
        raise exception 'permission denied: not a club member';
    end if;

    insert into match_games (id, club_id, name, date)
    values (v_mg_id, p_club_id, p_name, p_date);

    for v_court in select value from jsonb_array_elements(p_courts) loop
        v_court_id := gen_random_uuid();
        insert into match_game_courts (id, match_game_id, label, "order", surface)
        values (v_court_id, v_mg_id, v_court->>'label', (v_court->>'order')::int, nullif(v_court->>'surface', ''));
        v_court_map := v_court_map || jsonb_build_object(v_court->>'temp_id', v_court_id::text);
    end loop;

    for v_round in select value from jsonb_array_elements(p_rounds) loop
        v_round_id := gen_random_uuid();
        insert into match_game_rounds (id, match_game_id, label, "order")
        values (v_round_id, v_mg_id, v_round->>'label', (v_round->>'order')::int);
        v_round_map := v_round_map || jsonb_build_object(v_round->>'temp_id', v_round_id::text);

        for v_ts in select value from jsonb_array_elements(v_round->'time_slots') loop
            v_ts_id := gen_random_uuid();
            insert into match_game_time_slots (id, round_id, start_at, end_at)
            values (v_ts_id, v_round_id, v_ts->>'start_at', v_ts->>'end_at');
            v_ts_map := v_ts_map || jsonb_build_object(v_ts->>'temp_id', v_ts_id::text);
        end loop;
    end loop;

    for v_match, v_ord in
        select value, ordinality from jsonb_array_elements(p_matches) with ordinality
    loop
        v_match_id := gen_random_uuid();
        insert into match_game_matches (id, match_game_id, round_id, court_id, time_slot_id, match_type, "order")
        values (
            v_match_id, v_mg_id,
            (v_round_map->>(v_match->>'round_temp_id'))::uuid,
            (v_court_map->>(v_match->>'court_temp_id'))::uuid,
            (v_ts_map->>(v_match->>'time_slot_temp_id'))::uuid,
            v_match->>'match_type',
            v_ord
        );

        for v_participant in select value from jsonb_array_elements(coalesce(v_match->'participants', '[]'::jsonb)) loop
            insert into match_game_participants (match_id, user_id, side, is_ad)
            values (
                v_match_id,
                (v_participant->>'user_id')::uuid,
                v_participant->>'side',
                coalesce((v_participant->>'is_ad')::boolean, false)
            );
        end loop;
    end loop;

    return v_mg_id;
end;
$$;

create or replace function public.update_match_game(p_match_game_id uuid, p_name text, p_date date, p_courts jsonb, p_rounds jsonb, p_matches jsonb)
returns uuid
language plpgsql security definer set search_path = public
as $$
DECLARE
    v_club_id       uuid;
    v_caller        uuid := auth.uid();
    v_court         jsonb;
    v_round         jsonb;
    v_ts            jsonb;
    v_match         jsonb;
    v_participant   jsonb;
    v_ord           int;
    v_court_id      uuid;
    v_round_id      uuid;
    v_ts_id         uuid;
    v_new_match_id  uuid;
    v_court_map     jsonb := '{}'::jsonb;
    v_round_map     jsonb := '{}'::jsonb;
    v_ts_map        jsonb := '{}'::jsonb;
    v_old_map       jsonb := '{}'::jsonb;
    v_old           jsonb;
    v_new_participants jsonb;
BEGIN
    SELECT club_id INTO v_club_id FROM match_games WHERE id = p_match_game_id;
    IF v_club_id IS NULL THEN RAISE EXCEPTION 'match_game_not_found'; END IF;

    IF NOT is_club_approved_member(v_club_id, v_caller) THEN RAISE EXCEPTION 'not_member'; END IF;
    IF EXISTS (SELECT 1 FROM match_games WHERE id = p_match_game_id AND is_fixed = true)
       AND NOT is_club_owner(v_club_id, v_caller) THEN
        RAISE EXCEPTION 'match_game_fixed';
    END IF;

    -- 기존 매치별 상태/결과 + 참가자 집합(side,user_id 정렬) 스냅샷 — 동일 참가자 구성이면 결과 보존
    SELECT COALESCE(jsonb_object_agg(m.id::text, jsonb_build_object(
        'match_type',   m.match_type,
        'status',       m.status,
        'result_sets',  m.result_sets,
        'winner_id',    m.winner_id,
        'participants', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object('user_id', p.user_id, 'side', p.side) ORDER BY p.side, p.user_id), '[]'::jsonb)
            FROM match_game_participants p WHERE p.match_id = m.id
        )
    )), '{}'::jsonb)
    INTO v_old_map
    FROM match_game_matches m
    WHERE m.match_game_id = p_match_game_id AND m.status <> 'scheduled';

    DELETE FROM match_game_matches WHERE match_game_id = p_match_game_id;
    DELETE FROM match_game_time_slots WHERE round_id IN (
        SELECT id FROM match_game_rounds WHERE match_game_id = p_match_game_id
    );
    DELETE FROM match_game_rounds WHERE match_game_id = p_match_game_id;
    DELETE FROM match_game_courts WHERE match_game_id = p_match_game_id;

    UPDATE match_games SET name = p_name, date = p_date WHERE id = p_match_game_id;

    FOR v_court IN SELECT value FROM jsonb_array_elements(p_courts) LOOP
        v_court_id := gen_random_uuid();
        INSERT INTO match_game_courts (id, match_game_id, label, "order", surface)
        VALUES (v_court_id, p_match_game_id, v_court->>'label', (v_court->>'order')::int, NULLIF(v_court->>'surface', ''));
        v_court_map := v_court_map || jsonb_build_object(v_court->>'temp_id', v_court_id::text);
    END LOOP;

    FOR v_round IN SELECT value FROM jsonb_array_elements(p_rounds) LOOP
        v_round_id := gen_random_uuid();
        INSERT INTO match_game_rounds (id, match_game_id, label, "order")
        VALUES (v_round_id, p_match_game_id, v_round->>'label', (v_round->>'order')::int);
        v_round_map := v_round_map || jsonb_build_object(v_round->>'temp_id', v_round_id::text);

        FOR v_ts IN SELECT value FROM jsonb_array_elements(v_round->'time_slots') LOOP
            v_ts_id := gen_random_uuid();
            INSERT INTO match_game_time_slots (id, round_id, start_at, end_at)
            VALUES (v_ts_id, v_round_id, v_ts->>'start_at', v_ts->>'end_at');
            v_ts_map := v_ts_map || jsonb_build_object(v_ts->>'temp_id', v_ts_id::text);
        END LOOP;
    END LOOP;

    FOR v_match, v_ord IN
        SELECT value, ordinality FROM jsonb_array_elements(p_matches) WITH ORDINALITY
    LOOP
        v_new_match_id := gen_random_uuid();
        INSERT INTO match_game_matches (id, match_game_id, round_id, court_id, time_slot_id, match_type, "order")
        VALUES (
            v_new_match_id, p_match_game_id,
            (v_round_map->>(v_match->>'round_temp_id'))::uuid,
            (v_court_map->>(v_match->>'court_temp_id'))::uuid,
            (v_ts_map->>(v_match->>'time_slot_temp_id'))::uuid,
            v_match->>'match_type',
            v_ord
        );

        FOR v_participant IN SELECT value FROM jsonb_array_elements(coalesce(v_match->'participants', '[]'::jsonb)) LOOP
            INSERT INTO match_game_participants (match_id, user_id, side, is_ad)
            VALUES (
                v_new_match_id,
                (v_participant->>'user_id')::uuid,
                v_participant->>'side',
                coalesce((v_participant->>'is_ad')::boolean, false)
            );
        END LOOP;

        v_old := v_old_map -> (v_match->>'prev_match_id');
        IF v_old IS NOT NULL THEN
            SELECT COALESCE(jsonb_agg(jsonb_build_object('user_id', (p->>'user_id')::uuid, 'side', p->>'side') ORDER BY p->>'side', p->>'user_id'), '[]'::jsonb)
            INTO v_new_participants
            FROM jsonb_array_elements(coalesce(v_match->'participants', '[]'::jsonb)) p;

            IF v_old->>'match_type' = v_match->>'match_type'
               AND v_old->'participants' = v_new_participants THEN
                UPDATE match_game_matches SET
                    status      = v_old->>'status',
                    result_sets = v_old->'result_sets',
                    winner_id   = v_old->>'winner_id'
                WHERE id = v_new_match_id;
            END IF;
        END IF;
    END LOOP;

    RETURN p_match_game_id;
END;
$$;

-- ════════════════════════════════════════════════════════════════
-- 6) RPC 재작성 — 통계/랭킹 (참가자 테이블 기반, 선택적 p_club_id 기본값으로 오버로드 통합)
-- ════════════════════════════════════════════════════════════════

create or replace function public.get_user_head_to_head(p_user_id uuid, p_club_id uuid default null)
returns table(opponent_id uuid, matches integer, wins integer, losses integer, draws integer)
language sql stable
as $$
  with me as (
    select match_id, result from user_match_participations
    where user_id = p_user_id and match_type = 'singles'
      and (p_club_id is null or club_id = p_club_id)
  ),
  opp as (
    select p.match_id, p.user_id as opponent_id
    from user_match_participations p
    join me on me.match_id = p.match_id
    where p.user_id <> p_user_id and p.match_type = 'singles'
  )
  select opp.opponent_id,
    count(*)::int as matches,
    count(*) filter (where me.result = 'win')::int as wins,
    count(*) filter (where me.result = 'loss')::int as losses,
    count(*) filter (where me.result = 'draw')::int as draws
  from opp join me using (match_id)
  group by opp.opponent_id
  order by matches desc;
$$;

create or replace function public.get_user_match_stats_v2(p_user_id uuid, p_club_id uuid default null)
returns json
language sql stable
as $$
with base as (
  select m.match_type, p.side as my_side, m.winner_id, m.result_sets
  from match_game_matches m
  join match_games g on g.id = m.match_game_id
  join match_game_participants p on p.match_id = m.id and p.user_id = p_user_id
  where g.is_fixed = true and m.status = 'finished'
    and (p_club_id is null or g.club_id = p_club_id)
),
sets_per_match as (
  select match_type, my_side, winner_id,
    coalesce((select sum(case when my_side = 'team1' then (s->>'team1')::int else (s->>'team2')::int end)
              from jsonb_array_elements(coalesce(result_sets, '[]'::jsonb)) s), 0) as sets_won,
    coalesce((select sum(case when my_side = 'team1' then (s->>'team2')::int else (s->>'team1')::int end)
              from jsonb_array_elements(coalesce(result_sets, '[]'::jsonb)) s), 0) as sets_lost
  from base
),
agg as (
  select match_type,
    count(*)::int as matches,
    count(*) filter (where winner_id = my_side)::int as wins,
    count(*) filter (where winner_id is not null and winner_id <> 'draw' and winner_id <> my_side)::int as losses,
    count(*) filter (where winner_id = 'draw')::int as draws,
    coalesce(sum(sets_won),0)::int as sets_won,
    coalesce(sum(sets_lost),0)::int as sets_lost
  from sets_per_match group by match_type
),
empty_stat as (select json_build_object('matches',0,'wins',0,'losses',0,'draws',0,'sets_won',0,'sets_lost',0) as val)
select json_build_object(
  'singles',       coalesce((select row_to_json(a) from agg a where a.match_type='singles'),       (select val from empty_stat)),
  'men_doubles',   coalesce((select row_to_json(a) from agg a where a.match_type='men_doubles'),   (select val from empty_stat)),
  'women_doubles', coalesce((select row_to_json(a) from agg a where a.match_type='women_doubles'), (select val from empty_stat)),
  'mixed_doubles', coalesce((select row_to_json(a) from agg a where a.match_type='mixed_doubles'), (select val from empty_stat))
);
$$;

create or replace function public.get_user_doubles_court_stats(p_user_id uuid, p_club_id uuid default null)
returns json
language sql stable
as $$
with base as (
  select p.side as my_side, p.is_ad, m.winner_id
  from match_game_matches m
  join match_games g on g.id = m.match_game_id
  join match_game_participants p on p.match_id = m.id and p.user_id = p_user_id
  where g.is_fixed = true and m.status = 'finished'
    and m.match_type in ('men_doubles','women_doubles','mixed_doubles')
    and (p_club_id is null or g.club_id = p_club_id)
),
agg as (
  select (case when is_ad then 'ad' else 'deuce' end) as court,
    count(*)::int as matches,
    count(*) filter (where winner_id = my_side)::int as wins,
    count(*) filter (where winner_id is not null and winner_id <> 'draw' and winner_id <> my_side)::int as losses,
    count(*) filter (where winner_id = 'draw')::int as draws
  from base group by (case when is_ad then 'ad' else 'deuce' end)
),
empty_stat as (select json_build_object('matches',0,'wins',0,'losses',0,'draws',0) as val)
select json_build_object(
  'ad',    coalesce((select row_to_json(a) from agg a where a.court='ad'),    (select val from empty_stat)),
  'deuce', coalesce((select row_to_json(a) from agg a where a.court='deuce'), (select val from empty_stat))
);
$$;

create or replace function public.get_user_partner_stats(p_user_id uuid, p_club_id uuid default null)
returns table(partner_id uuid, matches integer, wins integer, losses integer, draws integer)
language sql stable
as $$
with base as (
  select m.id as match_id, p.side as my_side, m.winner_id
  from match_game_matches m
  join match_games g on g.id = m.match_game_id
  join match_game_participants p on p.match_id = m.id and p.user_id = p_user_id
  where g.is_fixed = true and m.status = 'finished'
    and m.match_type in ('men_doubles','women_doubles','mixed_doubles')
    and (p_club_id is null or g.club_id = p_club_id)
),
partners as (
  select b.match_id, b.my_side, b.winner_id, p2.user_id as partner_id
  from base b
  join match_game_participants p2 on p2.match_id = b.match_id and p2.side = b.my_side and p2.user_id <> p_user_id
)
select partner_id,
  count(*)::int as matches,
  count(*) filter (where winner_id = my_side)::int as wins,
  count(*) filter (where winner_id is not null and winner_id <> 'draw' and winner_id <> my_side)::int as losses,
  count(*) filter (where winner_id = 'draw')::int as draws
from partners
group by partner_id
order by matches desc;
$$;

create or replace function public.get_club_activity_ranking(p_club_id uuid, p_since timestamptz default (now() - interval '30 days'))
returns table(user_id uuid, match_count bigint, win_count bigint)
language sql stable security definer set search_path = public
as $$
  select p.user_id,
    count(*) as match_count,
    sum(case when m.winner_id = p.side then 1 else 0 end) as win_count
  from match_game_matches m
  join match_games g on g.id = m.match_game_id
  join match_game_participants p on p.match_id = m.id
  where g.club_id = p_club_id and g.is_fixed = true and g.date::timestamptz >= p_since and m.status = 'finished'
  group by p.user_id
  order by match_count desc, win_count desc
  limit 20;
$$;

create or replace function public.get_club_win_rate_ranking(p_club_id uuid, p_min_matches integer default 3)
returns table(match_type_group text, user_id uuid, match_count bigint, win_count bigint, loss_count bigint, win_rate numeric)
language sql stable security definer set search_path = public
as $$
with club_matches as (
  select m.id, m.match_type, m.winner_id
  from match_game_matches m
  join match_games g on g.id = m.match_game_id
  where g.club_id = p_club_id and g.is_fixed = true and m.status = 'finished'
),
participants as (
  select cm.match_type as match_type_group, p.user_id as uid,
    case when cm.winner_id = p.side then 1 else 0 end as win,
    case when cm.winner_id is not null and cm.winner_id <> 'draw' and cm.winner_id <> p.side then 1 else 0 end as loss
  from club_matches cm
  join match_game_participants p on p.match_id = cm.id
),
all_stats as (
  select match_type_group, uid as user_id, count(*) as match_count, sum(win) as win_count, sum(loss) as loss_count
  from participants group by match_type_group, uid
  having count(*) >= p_min_matches
),
ranked as (
  select s.match_type_group, s.user_id, s.match_count, s.win_count, s.loss_count,
    case when s.win_count + s.loss_count = 0 then 0 else round(s.win_count * 100.0 / (s.win_count + s.loss_count), 1) end as win_rate,
    rank() over (partition by s.match_type_group order by
      case when s.win_count + s.loss_count = 0 then 0 else s.win_count * 100.0 / (s.win_count + s.loss_count) end desc,
      s.match_count desc) as rnk
  from all_stats s
)
select match_type_group, user_id, match_count, win_count, loss_count, win_rate
from ranked where rnk <= 3
order by match_type_group, win_rate desc, match_count desc;
$$;

-- ════════════════════════════════════════════════════════════════
-- 7) RPC 재작성 — 상호확인 요청/결과 협상/로테이션
-- ════════════════════════════════════════════════════════════════

-- 신규: 요청 생성(참가자 원자적 삽입을 위해 도입, 직접 INSERT 정책 폐지)
create or replace function public.create_match_request(
  p_opponent_user_id uuid,
  p_played_at date,
  p_played_time time,
  p_match_type text,
  p_surface text,
  p_notes text default null,
  p_partner jsonb default null,
  p_opponent2 jsonb default null
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

  insert into match_requests (id, requester_id, opponent_user_id, played_at, played_time, match_type, surface, notes)
  values (v_id, v_uid, p_opponent_user_id, p_played_at, p_played_time, p_match_type, p_surface, p_notes);

  if v_is_doubles then
    insert into match_request_participants (request_id, role, user_id, name, dominant_hand, ntrp_snapshot)
    values (v_id, 'partner', v_partner_user_id, p_partner->>'name', nullif(p_partner->>'dominant_hand',''), nullif(p_partner->>'ntrp','')::numeric);
    insert into match_request_participants (request_id, role, user_id, name, dominant_hand, ntrp_snapshot)
    values (v_id, 'opponent2', v_opp2_user_id, p_opponent2->>'name', nullif(p_opponent2->>'dominant_hand',''), nullif(p_opponent2->>'ntrp','')::numeric);
  end if;

  return v_id;
end;
$$;

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

  -- 요청자 행 (원본 관점, notes 포함)
  insert into personal_matches
    (id, user_id, source_type, source_request_id, played_at, played_time, match_type, surface, set_scores, winner, notes)
  values
    (v_pm_requester, v_req.requester_id, 'confirmation', v_req.id, v_req.played_at, v_req.played_time, v_req.match_type, v_req.surface, v_req.set_scores, v_winner, v_req.notes);

  insert into personal_match_participants (match_id, role, user_id, name, dominant_hand, ntrp_snapshot)
  values (v_pm_requester, 'opponent', v_acceptor.id, v_acceptor.name, v_acceptor.dominant_hand, v_acceptor_ntrp);
  if v_is_doubles then
    insert into personal_match_participants (match_id, role, user_id, name, dominant_hand, ntrp_snapshot)
    values (v_pm_requester, 'partner', v_partner_user_id, v_partner_name, v_partner_hand, v_partner_ntrp);
    insert into personal_match_participants (match_id, role, user_id, name, dominant_hand, ntrp_snapshot)
    values (v_pm_requester, 'opponent2', v_opp2_user_id, v_opp2_name, v_opp2_hand, v_opp2_ntrp);
  end if;

  -- 수락자 행 (반전 관점: 내 파트너=상대2, 상대=요청자, 상대2=요청자 파트너)
  insert into personal_matches
    (id, user_id, source_type, source_request_id, played_at, played_time, match_type, surface, set_scores, winner, notes)
  values
    (v_pm_acceptor, v_acceptor.id, 'confirmation', v_req.id, v_req.played_at, v_req.played_time, v_req.match_type, v_req.surface,
     v_inverted_scores,
     case v_winner when 'me' then 'opponent' when 'opponent' then 'me' when 'draw' then 'draw' else null end,
     null);

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

create or replace function public.propose_match_result(p_request_id uuid, p_set_scores jsonb)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_req match_requests%rowtype;
  v_neg match_result_negotiations%rowtype;
  v_uid uuid := auth.uid();
  v_counterpart_id uuid;
  v_counterpart_deleted timestamptz;
  v_sets jsonb;
begin
  select * into v_req from match_requests where id = p_request_id for update;
  if not found then raise exception 'request_not_found'; end if;
  if v_req.status <> 'accepted' then raise exception 'request_not_accepted'; end if;
  if v_uid is null or (v_req.requester_id <> v_uid and v_req.opponent_user_id <> v_uid) then
    raise exception 'not_request_party';
  end if;

  select * into v_neg from match_result_negotiations where request_id = p_request_id for update;
  if not found then raise exception 'negotiation_not_found'; end if;
  if v_neg.result_status = 'confirmed' then raise exception 'result_already_confirmed'; end if;
  if v_neg.result_status = 'proposed' and v_neg.proposed_by is distinct from v_uid then
    raise exception 'result_already_proposed';
  end if;

  v_counterpart_id := case when v_req.requester_id = v_uid then v_req.opponent_user_id else v_req.requester_id end;
  select deleted_at into v_counterpart_deleted from users where id = v_counterpart_id;
  if v_counterpart_deleted is not null then raise exception 'counterpart_deleted'; end if;

  if not public.validate_set_scores(p_set_scores) then raise exception 'invalid_set_scores'; end if;

  v_sets := public.normalize_set_scores(p_set_scores, v_req.match_type <> 'singles');
  if v_req.opponent_user_id = v_uid then
    v_sets := public.invert_set_scores(v_sets);
  end if;

  update match_result_negotiations
  set result_status = 'proposed',
      proposed_set_scores = v_sets,
      proposed_by = v_uid,
      proposed_at = now(),
      dispute_reason = null
  where request_id = p_request_id;
end;
$$;

create or replace function public.confirm_match_result(p_request_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_req match_requests%rowtype;
  v_neg match_result_negotiations%rowtype;
  v_uid uuid := auth.uid();
  v_winner text;
  v_inverted jsonb;
  v_requester_rows int;
  v_opponent_rows int;
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
  v_winner := public.personal_match_winner(v_neg.proposed_set_scores);
  v_inverted := public.invert_set_scores(v_neg.proposed_set_scores);

  update personal_matches
  set set_scores = v_neg.proposed_set_scores, winner = v_winner
  where source_request_id = p_request_id and user_id = v_req.requester_id;
  get diagnostics v_requester_rows = row_count;

  update personal_matches
  set set_scores = v_inverted,
      winner = case v_winner when 'me' then 'opponent' when 'opponent' then 'me' else 'draw' end
  where source_request_id = p_request_id and user_id = v_req.opponent_user_id;
  get diagnostics v_opponent_rows = row_count;

  if v_requester_rows <> 1 or v_opponent_rows <> 1 then
    raise exception 'personal_matches_missing';
  end if;

  update match_result_negotiations
  set set_scores = proposed_set_scores,
      result_status = 'confirmed',
      dispute_reason = null
  where request_id = p_request_id;
end;
$$;

create or replace function public.dispute_match_result(p_request_id uuid, p_reason text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_req match_requests%rowtype;
  v_neg match_result_negotiations%rowtype;
  v_uid uuid := auth.uid();
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  select * into v_req from match_requests where id = p_request_id for update;
  if not found then raise exception 'request_not_found'; end if;
  if v_req.status <> 'accepted' then raise exception 'request_not_accepted'; end if;
  if v_uid is null or (v_req.requester_id <> v_uid and v_req.opponent_user_id <> v_uid) then
    raise exception 'not_request_party';
  end if;

  select * into v_neg from match_result_negotiations where request_id = p_request_id for update;
  if not found or v_neg.result_status <> 'proposed' then raise exception 'result_not_proposed'; end if;
  if v_neg.proposed_by = v_uid then raise exception 'cannot_dispute_own_proposal'; end if;
  if v_reason is not null and char_length(v_reason) > 200 then raise exception 'dispute_reason_too_long'; end if;

  update match_result_negotiations
  set result_status = 'disputed', dispute_reason = v_reason
  where request_id = p_request_id;
end;
$$;

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
  select * into v_s from rotation_sessions where id = p_session_id and user_id = auth.uid() for update;
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

    insert into personal_matches (id, user_id, source_type, played_at, played_time, match_type, surface, set_scores, winner, notes)
    values (v_match_id, v_s.user_id, 'rotation', v_s.played_at, v_s.played_time, v_s.match_type, v_s.surface, v_sets, public.personal_match_winner(v_sets), v_s.notes);

    insert into personal_match_participants (match_id, role, user_id, name, dominant_hand, ntrp_snapshot)
    values (v_match_id, 'opponent', nullif(g->'opp1'->>'userId', '')::uuid, g->'opp1'->>'name', nullif(g->'opp1'->>'hand', ''), nullif(g->'opp1'->>'ntrp', '')::numeric);
    insert into personal_match_participants (match_id, role, user_id, name, dominant_hand, ntrp_snapshot)
    values (v_match_id, 'partner', nullif(g->'partner'->>'userId', '')::uuid, g->'partner'->>'name', nullif(g->'partner'->>'hand', ''), nullif(g->'partner'->>'ntrp', '')::numeric);
    insert into personal_match_participants (match_id, role, user_id, name, dominant_hand, ntrp_snapshot)
    values (v_match_id, 'opponent2', nullif(g->'opp2'->>'userId', '')::uuid, g->'opp2'->>'name', nullif(g->'opp2'->>'hand', ''), nullif(g->'opp2'->>'ntrp', '')::numeric);
  end loop;

  delete from rotation_sessions where id = p_session_id;
end;
$$;

revoke all on function public.create_match_request(uuid, date, time, text, text, text, jsonb, jsonb) from public;
grant execute on function public.create_match_request(uuid, date, time, text, text, text, jsonb, jsonb) to authenticated;
revoke all on function public.accept_match_request(uuid) from public;
grant execute on function public.accept_match_request(uuid) to authenticated;
revoke all on function public.propose_match_result(uuid, jsonb) from public;
grant execute on function public.propose_match_result(uuid, jsonb) to authenticated;
revoke all on function public.confirm_match_result(uuid) from public;
grant execute on function public.confirm_match_result(uuid) to authenticated;
revoke all on function public.dispute_match_result(uuid, text) from public;
grant execute on function public.dispute_match_result(uuid, text) to authenticated;
revoke all on function public.finalize_rotation_session(uuid, jsonb) from public;
grant execute on function public.finalize_rotation_session(uuid, jsonb) to authenticated;
