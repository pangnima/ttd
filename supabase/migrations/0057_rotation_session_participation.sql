-- ════════════════════════════════════════════════════════════════════════════
-- 0057 — 로테이션 세션의 참여 동의 축 (일정 초대)
-- ════════════════════════════════════════════════════════════════════════════
--- 문제: 복식 신규 등록의 기본은 로테이션이고, 로테이션 등록은 rotation_sessions 1행만 만든다.
---       풀에 넣은 회원은 players jsonb 안의 스냅샷일 뿐 그들 계정으로는 어떤 행도 생기지 않고,
---       RLS(0050)가 소유자·방 참가자만 열어 두어 그들은 세션의 존재조차 볼 수 없었다.
---       상대가 처음 아는 시점은 finalize(결과 입력) 이후 — 경기가 끝난 뒤다.
---       그래서 같은 시간에 함께 치는 회원들이 서로 모른 채 같은 일정을 중복 생성한다.
---
--- 해결: 0056이 match_request_participants에 세운 '참여 축'을 세션 레벨에 복제한다.
---       세션 = 일정(경기 전) / 요청 = 기록(경기 후). 두 축은 이름부터 갈라 둔다
---       (respond_rotation_plan  vs  respond_rotation_participation).
---
--- 설계 결정
---  1) 거절은 그 사람만 풀에서 뺀다. 세션은 유지된다 — 5명 풀에서 1명이 못 와도 나머지는 친다.
---     복식 요청(한 명의 거절 = 요청 전체 종료)과 정반대이고, 그 비대칭이 일정과 기록 1건의 차이다.
---  2) 수락자는 열람 + 결과 입력까지 한다(0050이 방 세션에 준 권한을 방 밖에 대칭 적용).
---  3) 세션 참여 수락이 그 세션 게임의 참여 동의를 대신한다 — finalize 후 게임별 재수락이 없다.
---     ('비밀번호 입장 = 참여 동의'와 같은 원리. 결과 스코어 확정은 종전대로 상대 대표가 확인한다.)


-- ════════════════════════════════════════════════════════════════
-- §1 테이블 — 명부의 복제본이 아니라 '참여 축 인덱스'
-- ════════════════════════════════════════════════════════════════
--- 이름·손잡이·NTRP 스냅샷 컬럼을 두지 않는다. match_request_participants가 그 값을 갖는 이유는
--- match_requests에 명부 jsonb가 없기 때문이다. 여기서는 rotation_sessions.players가 이미 명부이고
--- §3이 여는 RLS 덕에 좌석 회원도 그것을 읽는다 — 컬럼이 없으면 동기화할 값도 없다.
--- role 컬럼도 없다: 세션에는 좌석이 아니라 풀만 있다(게임별 역할은 finalize가 요청 참가자로 만든다).
--- 소유자 행은 만들지 않는다(match_requests.requester_id를 참가자 행 없이 accepted로 합성하는 규약).
create table if not exists public.rotation_session_participants (
  session_id uuid not null references public.rotation_sessions(id) on delete cascade,
  user_id    uuid not null references public.users(id) on delete cascade,
  participation_status text not null default 'pending'
    check (participation_status in ('pending', 'accepted', 'rejected')),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (session_id, user_id)
);

create index if not exists rotation_session_participants_user_idx
  on public.rotation_session_participants(user_id);

alter table public.rotation_session_participants enable row level security;

comment on table public.rotation_session_participants is
  '로테이션 세션(일정)의 회원 참여 동의 (0057). 쓰기는 트리거·RPC 전용 — 정책은 SELECT만 있다.';


-- ════════════════════════════════════════════════════════════════
-- §2 자격 헬퍼 — 정책 상호 재귀 회피 (0052 is_request_party 선례)
-- ════════════════════════════════════════════════════════════════
--- rotation_sessions_select가 참가자 테이블을, 참가자 정책이 세션을 참조하면 상호 재귀에 빠진다.
--- 정의자 함수가 상대 테이블의 RLS를 우회해 그 고리를 끊는다.
---
--- ⚠ 두 헬퍼를 나눈 이유 — `is_rotation_session_party`는 rotation_sessions를 **되읽는다**.
--- 그런 함수를 rotation_sessions의 SELECT 정책에 쓰면 `INSERT ... RETURNING`이 깨진다:
--- RETURNING은 반환 행에 SELECT 정책을 적용하는데, STABLE 함수는 문장 시작 시점 스냅샷을 쓰므로
--- **그 문장이 방금 삽입한 행을 자기 눈으로 보지 못한다**(42501). 앱의 세션 저장이 정확히 이 경로다.
--- 그래서 세션 정책(§3)은 소유자·방을 컬럼 비교로 두고 좌석 분기만 `is_rotation_session_seat`
--- (참가자 테이블만 읽는다)를 쓰고, `is_rotation_session_party`는 참가자 테이블 정책 전용으로 남긴다
--- (참가자 행은 트리거·RPC가 만들 뿐 RETURNING으로 만들어지지 않는다).
create or replace function public.is_rotation_session_seat(p_session_id uuid)
returns boolean
language sql security definer stable set search_path = public
as $$
  select exists (
    select 1 from rotation_session_participants p
    where p.session_id = p_session_id and p.user_id = auth.uid()
  );
$$;

revoke all on function public.is_rotation_session_seat(uuid) from public, anon;
grant execute on function public.is_rotation_session_seat(uuid) to authenticated;

create or replace function public.is_rotation_session_party(p_session_id uuid)
returns boolean
language sql security definer stable set search_path = public
as $$
  select exists (
    select 1 from rotation_sessions s
    where s.id = p_session_id
      and (s.user_id = auth.uid()
           or (s.room_id is not null and public.is_room_participant(s.room_id)))
  ) or exists (
    select 1 from rotation_session_participants p
    where p.session_id = p_session_id and p.user_id = auth.uid()
  );
$$;

revoke all on function public.is_rotation_session_party(uuid) from public, anon;
grant execute on function public.is_rotation_session_party(uuid) to authenticated;


-- ════════════════════════════════════════════════════════════════
-- §3 RLS — 좌석 회원에게 세션을 연다
-- ════════════════════════════════════════════════════════════════
--- 쓰기 정책은 두지 않는다(0050 주석과 같은 이유 — 열면 클라이언트가 남의 풀을 직접 조작한다).
--- FK on delete cascade의 참조 액션은 자식 RLS를 우회하므로 별도 정리 코드가 필요 없다.
-- 소유자·방 분기는 반환 행의 컬럼을 그대로 비교한다(§2의 ⚠ — 자기 테이블을 되읽으면 RETURNING이 깨진다).
-- 세 번째 항만 0057의 새 조항이고, 앞 두 항은 0050의 정책식 그대로다.
drop policy if exists rotation_sessions_select on public.rotation_sessions;
create policy rotation_sessions_select on public.rotation_sessions
  for select using (
    user_id = auth.uid()
    or (room_id is not null and public.is_room_participant(room_id))
    or public.is_rotation_session_seat(id)
  );

drop policy if exists rotation_session_participants_select on public.rotation_session_participants;
create policy rotation_session_participants_select on public.rotation_session_participants
  for select using (public.is_rotation_session_party(session_id));


-- ════════════════════════════════════════════════════════════════
-- §4 좌석 생성 — RPC가 아니라 트리거 (0056 §1과 같은 논리)
-- ════════════════════════════════════════════════════════════════
--- create_match_request가 RPC 전용이 된 이유는 클라이언트가 보낸 좌석별 페이로드를 검증해야 했기
--- 때문이다. 여기 좌석은 이미 검증을 통과한 players에서 파생될 뿐이고, players의 서버측 쓰기 경로가
--- 이미 셋이다(앱 INSERT · join_match_room_as_player · respond_rotation_plan). 트리거로 두면
--- 앞으로 생길 경로도 자동으로 규칙을 따르고, createRotationSessionAction은 한 글자도 안 바뀐다.
create or replace function public.sync_rotation_session_participants()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_ids uuid[];
begin
  select coalesce(array_agg(distinct t.uid), '{}'::uuid[]) into v_ids
  from (select nullif(e->>'userId', '')::uuid as uid
        from jsonb_array_elements(new.players) e) t
  where public.is_active_member(t.uid) and t.uid <> new.user_id;

  -- 풀에서 빠진 사람의 좌석은 지운다(풀이 명부의 권위). 단 'rejected'는 남긴다 —
  -- 거절은 곧 풀에서 빠지는 것이라(§5), 함께 지우면 주최자가 누가 거절했는지 볼 수 없다.
  delete from rotation_session_participants
  where session_id = new.id
    and not (user_id = any(v_ids))
    and participation_status <> 'rejected';

  -- 방 세션이면 '입장 = 참여 동의'(0048~0049)라 accepted로 시작한다.
  -- 거절했던 사람을 주최자가 풀에 다시 넣으면 재요청이므로 pending으로 되돌린다.
  insert into rotation_session_participants (session_id, user_id, participation_status, responded_at)
  select new.id, uid,
         case when new.room_id is not null then 'accepted' else 'pending' end,
         case when new.room_id is not null then now() else null end
  from unnest(v_ids) uid
  on conflict (session_id, user_id) do update
    set participation_status = excluded.participation_status,
        responded_at = excluded.responded_at
    where rotation_session_participants.participation_status = 'rejected';

  -- 리스트에 노출되는 순간(create_match_room이 room_id를 사후 UPDATE한다) 남은 pending을 승격시킨다.
  -- 이 조항이 없으면 같은 사람에게 세션 초대 카드와 RoomInviteCard가 동시에 뜬다.
  if new.room_id is not null and (tg_op = 'INSERT' or old.room_id is null) then
    update rotation_session_participants
    set participation_status = 'accepted', responded_at = now()
    where session_id = new.id and participation_status = 'pending';
  end if;

  return null;
end;
$$;

revoke all on function public.sync_rotation_session_participants() from public, anon, authenticated;

drop trigger if exists rotation_sessions_sync_participants on public.rotation_sessions;
create trigger rotation_sessions_sync_participants
  after insert or update of players, room_id on public.rotation_sessions
  for each row execute function public.sync_rotation_session_participants();


-- ════════════════════════════════════════════════════════════════
-- §5 respond_rotation_plan — 일정(경기 전) 초대에 대한 응답
-- ════════════════════════════════════════════════════════════════
--- ⚠ 0056의 respond_rotation_participation과 혼동 금지. 그쪽은 finalize가 만든 '게임 파생 요청들'에
---   대한 세션 단위 일괄 응답이다. 이쪽은 아직 게임이 하나도 없는 '일정'에 대한 응답이다.
--- 거절은 세션을 죽이지 않는다 — mark_request_participant_response가 "복식은 네 자리가 다 있어야
--- 성립한다"며 요청 전체를 끝내는 것과 정반대다. 이 비대칭이 일정과 기록 1건의 본질적 차이다.
create or replace function public.respond_rotation_plan(p_session_id uuid, p_accept boolean)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_rows int;
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
end;
$$;

revoke all on function public.respond_rotation_plan(uuid, boolean) from public;
revoke execute on function public.respond_rotation_plan(uuid, boolean) from anon;
grant execute on function public.respond_rotation_plan(uuid, boolean) to authenticated;

comment on function public.respond_rotation_plan(uuid, boolean) is
  '로테이션 일정(세션) 초대에 대한 참여 응답 (0057). 게임 파생 요청의 일괄 응답은 respond_rotation_participation(0056)이다.';
comment on function public.respond_rotation_participation(uuid, boolean) is
  'finalize가 만든 게임 파생 요청들의 세션 단위 일괄 응답 (0056). 게임 전 일정 초대는 respond_rotation_plan(0057)이다.';


-- ════════════════════════════════════════════════════════════════
-- §6 rotation_seats_accepted — 게임의 회원 좌석이 전부 세션 수락자인가
-- ════════════════════════════════════════════════════════════════
--- 설계 결정 3의 술어. null·비회원은 건너뛴다(수락 대상이 아니다).
--- 세션 소유자는 좌석 행이 없다(§1) — 세션을 만든 것이 곧 동의이므로 수락자로 센다.
--- 이 조항이 없으면 참가자가 소유자를 넣은 게임이 언제나 미수락으로 떨어진다.
create or replace function public.rotation_seats_accepted(p_session_id uuid, p_uids uuid[])
returns boolean
language sql stable security definer set search_path = public
as $$
  select not exists (
    select 1 from unnest(p_uids) u(uid)
    where public.is_active_member(u.uid)
      and not exists (
        select 1 from rotation_sessions s
        where s.id = p_session_id and s.user_id = u.uid)
      and not exists (
        select 1 from rotation_session_participants p
        where p.session_id = p_session_id and p.user_id = u.uid
          and p.participation_status = 'accepted')
  );
$$;

revoke all on function public.rotation_seats_accepted(uuid, uuid[]) from public, anon, authenticated;


-- ════════════════════════════════════════════════════════════════
-- §7 finalize_rotation_session — 수락자도 입력하고, 수락은 재확인을 면제한다 (0056 §9 대체)
-- ════════════════════════════════════════════════════════════════
--- 0056 대비 변경 넷:
---  (a) 진입 가드 — 방 밖 세션도 '수락한 좌석 보유자'가 입력할 수 있다(결정 2).
---  (b) allowlist — 거절자를 뺀다(방어. 정상 경로에서는 이미 풀에서 빠져 있다).
---  (c) v_is_room → v_immediate — 게임의 회원 좌석이 전부 세션 수락자면 방 안 경로를 탄다(결정 3).
---      치환 지점 다섯: 요청 status/responded_at/opponent_accepted_at 3개 case 식,
---      materialize+propose 분기, 그리고 폴백 분기의 관점 복사 게이트.
---      마지막 게이트를 빠뜨리면 세션을 수락한 회원 파트너가 관점 행을 못 받는다.
---  (d) 세션 삭제 — 좌석이 하나라도 있으면 남긴다. 수락자 여럿이 각자 입력하므로
---      첫 finalize가 지우면 나머지가 입력할 수 없다(0050이 방 세션에 대해 이미 내린 결론).
---      좌석 0행(풀 전원 비회원)은 종전대로 삭제 — 기존 동작 회귀 없음. 종료는 소유자의 '삭제'.
--- 함정(0056에서 승계): 방 밖 pending 요청의 set_scores는 반드시 '[]'다. materialize가 이 값으로
---       personal_matches를 만들기 때문에, 스코어를 넣으면 전원 수락 순간 대표 확인 없이 확정된다.
create or replace function public.finalize_rotation_session(p_session_id uuid, p_games jsonb)
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

revoke all on function public.finalize_rotation_session(uuid, jsonb) from public;
revoke execute on function public.finalize_rotation_session(uuid, jsonb) from anon;
grant execute on function public.finalize_rotation_session(uuid, jsonb) to authenticated;


-- ════════════════════════════════════════════════════════════════
-- §8 백필 — 기존 세션의 풀 회원은 전부 accepted
-- ════════════════════════════════════════════════════════════════
--- 0056의 백필 doctrine과 같다: 물어본 적 없는 동의를 기다리며 영구 정지하지 않는다.
--- 기능 이전에 만들어진 세션의 풀 회원에게 지금 수락 카드를 띄우는 것은 매복이다.
--- 백필을 생략하면 옛 세션 배지가 0/0이었다가, 이후 방 입장으로 풀이 append되는 순간
--- '1/1 수락' 같은 거짓 진행도가 뜬다. 대상은 미확정 세션뿐이라 건수가 극소다.
insert into public.rotation_session_participants (session_id, user_id, participation_status, responded_at)
select s.id, t.uid, 'accepted', s.created_at
from public.rotation_sessions s,
     lateral (select distinct nullif(e->>'userId', '')::uuid as uid
              from jsonb_array_elements(s.players) e) t
where public.is_active_member(t.uid) and t.uid <> s.user_id
on conflict (session_id, user_id) do nothing;
