-- 0033_match_requests.sql
--- 회원 간 상호 확인 대진(단식). 요청자가 결과(스코어)까지 등록해 상대에게 확인을 요청하고,
--- 상대가 수락하면 양측 personal_matches에 각자 관점의 레코드가 동시에 생성된다.
--- 관점 반전(me/opp 스왑, winner 플립)은 SECURITY DEFINER RPC 내부에서 수행해
--- PostgREST 직접 호출로 조작된 payload를 주입할 수 없게 한다.
--- 확정(source_request_id 보유) 경기는 RESTRICTIVE 정책으로 수정/삭제를 잠근다
--- (0014의 기존 permissive 정책과 AND 결합 — DDL 원문이 리포에 없어 재생성 대신 추가 방식).

create table public.match_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.users(id) on delete cascade,
  opponent_user_id uuid not null references public.users(id) on delete cascade,
  played_at date not null,
  played_time time not null,
  match_type text not null default 'singles' check (match_type = 'singles'),  -- 복식 확장 시 check만 완화
  surface text not null check (surface in ('hard', 'clay', 'grass', 'other')),
  set_scores jsonb not null
    check (jsonb_typeof(set_scores) = 'array' and jsonb_array_length(set_scores) >= 1),  -- 요청자 관점
  notes text,                        -- 요청자 개인 메모 (수락 시 요청자 행에만 복사)
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'canceled')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> opponent_user_id)  -- 자기 자신 지정 방지
);

create index match_requests_opponent_idx on public.match_requests(opponent_user_id, status);
create index match_requests_requester_idx on public.match_requests(requester_id);
-- 동일 상대·동일 일시의 pending 중복 요청 방지 (거절/취소 후 재요청은 허용)
create unique index match_requests_pending_dedup_uidx
  on public.match_requests(requester_id, opponent_user_id, played_at, played_time)
  where status = 'pending';

alter table public.match_requests enable row level security;

-- 당사자 둘만 조회
create policy match_requests_select on public.match_requests
  for select using (requester_id = auth.uid() or opponent_user_id = auth.uid());

-- 요청 생성: 본인 명의 + 상대는 게스트/탈퇴가 아닌 실제 회원
create policy match_requests_insert on public.match_requests
  for insert with check (
    requester_id = auth.uid()
    and exists (
      select 1 from public.users u
      where u.id = opponent_user_id and u.is_guest = false and u.deleted_at is null
    )
  );

-- 취소: 요청자 본인, pending에서만 → canceled로만
create policy match_requests_cancel on public.match_requests
  for update using (requester_id = auth.uid() and status = 'pending')
  with check (requester_id = auth.uid() and status = 'canceled');

-- 거절: 상대 본인, pending에서만 → rejected로만
create policy match_requests_reject on public.match_requests
  for update using (opponent_user_id = auth.uid() and status = 'pending')
  with check (opponent_user_id = auth.uid() and status = 'rejected');

-- accepted는 어떤 정책의 with check도 통과하지 못함 → 수락은 아래 RPC 전용 경로.
-- DELETE 정책 없음 — 요청 이력 보존.

-- ── personal_matches: 상호 확인 경기 표식 + 수정/삭제 잠금 ──

alter table public.personal_matches
  add column source_request_id uuid references public.match_requests(id) on delete set null;

create index personal_matches_source_request_idx on public.personal_matches(source_request_id);

-- 상호 확인으로 확정된 경기는 어느 쪽도 수정/삭제 불가 (기존 permissive 정책과 AND 결합)
create policy personal_matches_lock_update on public.personal_matches
  as restrictive for update using (source_request_id is null);
create policy personal_matches_lock_delete on public.personal_matches
  as restrictive for delete using (source_request_id is null);

-- ── 수락 RPC: 검증 → 양측 관점 레코드 2행 INSERT → 상태 전이 (한 트랜잭션) ──

create or replace function public.accept_match_request(p_request_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_req public.match_requests%rowtype;
  v_requester public.users%rowtype;
  v_acceptor public.users%rowtype;
  v_me_sets int;
  v_opp_sets int;
  v_winner text;
  v_inverted_scores jsonb;
  v_requester_ntrp numeric;
  v_acceptor_ntrp numeric;
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

  -- winner 재계산 (요청자 관점, 저장값을 신뢰하지 않음)
  select
    count(*) filter (where (e->>'me')::int > (e->>'opp')::int),
    count(*) filter (where (e->>'opp')::int > (e->>'me')::int)
  into v_me_sets, v_opp_sets
  from jsonb_array_elements(v_req.set_scores) e;
  v_winner := case
    when v_me_sets > v_opp_sets then 'me'
    when v_opp_sets > v_me_sets then 'opponent'
    else 'draw'
  end;

  -- 수락자 관점 스코어 반전 (me ↔ opp, 세트 순서 보존)
  select jsonb_agg(jsonb_build_object('me', e->'opp', 'opp', e->'me') order by ord)
  into v_inverted_scores
  from jsonb_array_elements(v_req.set_scores) with ordinality t(e, ord);

  -- 상대 NTRP 파생: 통계 비공개(stats_hidden) 유저는 동적 personal_ntrp를 노출하지 않고
  -- 자가선언 ntrp만 사용. personal_matches의 1.0~7.0 check 밖이면 null.
  v_requester_ntrp := case
    when v_requester.stats_hidden then v_requester.ntrp
    else coalesce(v_requester.personal_ntrp, v_requester.ntrp)
  end;
  if v_requester_ntrp is not null and (v_requester_ntrp < 1 or v_requester_ntrp > 7) then
    v_requester_ntrp := null;
  end if;
  v_acceptor_ntrp := case
    when v_acceptor.stats_hidden then v_acceptor.ntrp
    else coalesce(v_acceptor.personal_ntrp, v_acceptor.ntrp)
  end;
  if v_acceptor_ntrp is not null and (v_acceptor_ntrp < 1 or v_acceptor_ntrp > 7) then
    v_acceptor_ntrp := null;
  end if;

  -- 요청자 행 (원본 관점, notes 포함)
  insert into public.personal_matches
    (user_id, opponent_name, opponent_user_id, opponent_ntrp,
     played_at, played_time, match_type, surface, set_scores, winner, notes, source_request_id)
  values
    (v_req.requester_id, v_acceptor.name, v_acceptor.id, v_acceptor_ntrp,
     v_req.played_at, v_req.played_time, v_req.match_type, v_req.surface,
     v_req.set_scores, v_winner, v_req.notes, v_req.id);

  -- 수락자 행 (반전 관점)
  insert into public.personal_matches
    (user_id, opponent_name, opponent_user_id, opponent_ntrp,
     played_at, played_time, match_type, surface, set_scores, winner, notes, source_request_id)
  values
    (v_acceptor.id, v_requester.name, v_requester.id, v_requester_ntrp,
     v_req.played_at, v_req.played_time, v_req.match_type, v_req.surface,
     v_inverted_scores,
     case v_winner when 'me' then 'opponent' when 'opponent' then 'me' else 'draw' end,
     null, v_req.id);

  update public.match_requests
  set status = 'accepted', responded_at = now()
  where id = p_request_id;
end;
$$;

revoke all on function public.accept_match_request(uuid) from public;
grant execute on function public.accept_match_request(uuid) to authenticated;
