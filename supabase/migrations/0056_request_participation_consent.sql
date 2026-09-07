-- 0056_request_participation_consent.sql
-- 방 밖 확인 요청은 회원 참가자 **전원**이 참여를 수락해야 기록이 생긴다.
--
-- 문제 1 (방 밖 로테이션): finalize_rotation_session(0050 §8)의 대표 결정이
--   `if v_s.room_id is not null then` 안에 갇혀 있어, 방 밖(개인) 세션은 상대가 전원 회원이어도
--   v_rep_id가 항상 null → 즉시 확정 폴백으로 떨어졌다. 결과: 내 기록에만 확정으로 꽂히고
--   상대·파트너의 personal_matches는 0행 — 그들은 경기의 존재조차 모른다.
--   0053이 페어 고정 복식에서 제거한 room_id 게이팅과 같은 종류의 잔재다.
--
-- 문제 2 (동의 모델): 방 밖 복식은 상대팀 대표 1명의 수락이 회원 4명분 동의를 대리했다.
--   파트너·상대2는 자기 전적에 남을 경기를 통보받지도 못한 채 기록을 받는다.
--
-- 설계 (참여 축과 결과 축은 끝까지 직교한다):
--   · 참여 = match_request_participants.participation_status + match_requests.opponent_accepted_at
--   · 결과 = match_result_negotiations (제안 → 대표 확인). **결과 확정 권한은 종전 그대로**
--     요청 당사자 2명(requester/opponent)뿐이며 이 마이그레이션은 건드리지 않는다.
--   · 방 안(create_room_game·방 로테이션)은 '비밀번호 입장 = 참여 동의'라 현행 유지.
--     요청을 status='accepted'로 만들고 materialize를 직접 부르는 경로는 게이트를 통과하지 않는다.
--
-- 기본값 방향: participation_status는 'pending'이 기본이다. 'accepted'가 기본이면 새 쓰기 경로를
--   빠뜨렸을 때 동의 없이 남의 기록이 생긴다(조용한 실패). 'pending'이면 요청이 멈춘다(시끄러운 실패).
--   방 안 경로와 비회원은 §1의 BEFORE INSERT 트리거가 상태를 파생해 'accepted'로 시작시킨다 —
--   create_room_game·create_match_request를 재정의하지 않고도 규칙이 한 곳에 모인다.
--
-- 소급 변환 없음: 이미 확정된 방 밖 로테이션 기록은 그대로 둔다. 되돌리면 상대가 동의한 적 없는
--   기록이 남의 전적에 생긴다.

-- ════════════════════════════════════════════════════════════════
-- §1 스키마 — 참여 상태 · 로테이션 그룹 키 · 인덱스
-- ════════════════════════════════════════════════════════════════

alter table public.match_request_participants
  add column if not exists participation_status text not null default 'pending'
    check (participation_status in ('pending', 'accepted', 'rejected')),
  add column if not exists responded_at timestamptz;

comment on column public.match_request_participants.participation_status is
  '참여 수락 상태. 회원 참가자만 의미가 있다(비회원·탈퇴자는 트리거가 accepted로 시작시킨다). 요청이 pending일 때만 대기 판정에 쓰인다.';

alter table public.match_requests
  -- 대표의 참여 수락 시각. status는 나머지 참가자를 기다리느라 아직 pending일 수 있다.
  add column if not exists opponent_accepted_at timestamptz,
  -- 로테이션 파생 요청의 세션 키. FK 없음 — 개인 세션 행은 finalize가 지우는 tombstone id다(0044 규약).
  add column if not exists rotation_session_id uuid,
  add column if not exists group_seq smallint;

comment on column public.match_requests.rotation_session_id is
  '로테이션 세션 tombstone id (FK 없음). 세션 단위 일괄 수락(respond_rotation_participation)과 목록 묶음의 키.';

-- 중복 요청 방지 인덱스에서 로테이션 파생 요청을 제외한다.
-- 한 세션의 게임들은 (requester, opponent, played_at, played_time)이 전부 같아서,
-- 같은 대표와 두 번 붙은 게임(로테이션에서 흔하다)이 23505로 finalize 전체를 롤백시킨다.
-- 사람이 같은 상대에게 같은 일시로 중복 요청하는 것은 종전대로 계속 막는다.
drop index if exists public.match_requests_pending_dedup_uidx;
create unique index match_requests_pending_dedup_uidx
  on public.match_requests(requester_id, opponent_user_id, played_at, played_time)
  where status = 'pending' and rotation_session_id is null;

create index if not exists match_requests_rotation_idx
  on public.match_requests(rotation_session_id) where rotation_session_id is not null;

-- 참가자 자격으로 내 요청을 찾는 조회(fetchMyMatchRequests 1단계)가 seq scan이었다.
create index if not exists match_request_participants_user_idx
  on public.match_request_participants(user_id) where user_id is not null;

-- ── 백필 ──
-- 기존 참가자 행은 전부 "대표 수락 = 전원 수락" 계약 아래 만들어졌다.
-- in-flight pending 요청까지 accepted로 채워야, 물어본 적 없는 동의를 기다리며 영구 정지하지 않는다.
update public.match_request_participants set participation_status = 'accepted'
where participation_status = 'pending';

update public.match_requests set opponent_accepted_at = coalesce(responded_at, created_at)
where status = 'accepted' and opponent_accepted_at is null;

-- 기존 방 로테이션 파생 요청에 세션 키를 소급 부여한다(원본 행에서 역참조). 상태 변환이 아니라 키 채움이다.
update public.match_requests r
set rotation_session_id = pm.rotation_session_id, group_seq = pm.group_seq
from public.personal_matches pm
where pm.source_request_id = r.id and not pm.is_perspective
  and pm.rotation_session_id is not null and r.rotation_session_id is null;

-- ── 참여 상태 기본값 파생 트리거 ──
-- 방 안 경로(요청이 이미 accepted)와 비회원 슬롯은 수락 대상이 아니다.
-- 여기서 한 번에 정규화하면 create_room_game·create_match_request·finalize를 각각 고칠 필요가 없고,
-- 앞으로 생길 쓰기 경로도 자동으로 규칙을 따른다.
create or replace function public.default_participation_status()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.participation_status = 'pending'
     and (not public.is_active_member(new.user_id)
          or exists (select 1 from match_requests r
                     where r.id = new.request_id and r.status <> 'pending'))
  then
    new.participation_status := 'accepted';
  end if;
  return new;
end;
$$;

revoke all on function public.default_participation_status() from public, anon, authenticated;

drop trigger if exists match_request_participants_default_status on public.match_request_participants;
create trigger match_request_participants_default_status
  before insert on public.match_request_participants
  for each row execute function public.default_participation_status();

-- ════════════════════════════════════════════════════════════════
-- §2 maybe_materialize_request — 전원 수락 게이트 (단일 초크포인트)
-- ════════════════════════════════════════════════════════════════
--- 모든 방 밖 수락 경로가 이 함수를 통과한다. 요청 행 락이 동시 수락을 직렬화하고,
--- 통과하는 즉시 status를 accepted로 옮기므로 두 번 통과할 수 없다.
--- 호출부는 반드시 이 함수를 부르기 전에 자기 응답을 기록해야 한다(같은 트랜잭션).
create or replace function public.maybe_materialize_request(p_request_id uuid)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_req match_requests%rowtype;
  v_requester users%rowtype;
begin
  select * into v_req from match_requests where id = p_request_id for update;
  if not found then raise exception 'request_not_found'; end if;

  -- 이미 처리된 요청(방 안 경로 포함)은 여기서 아무 일도 하지 않는다
  if v_req.status <> 'pending' then return false; end if;
  if v_req.opponent_accepted_at is null then return false; end if;

  -- 미수락 활성 회원이 한 명이라도 있으면 대기.
  -- 비회원·탈퇴자는 is_active_member가 걸러 요청을 영구 정지시키지 않는다
  -- (materialize의 관점 행 생성·confirm의 perspective_row_missing 단언과 같은 술어다).
  if exists (
    select 1 from match_request_participants p
    where p.request_id = p_request_id
      and p.participation_status <> 'accepted'
      and public.is_active_member(p.user_id)
  ) then
    return false;
  end if;

  select * into v_requester from users where id = v_req.requester_id;
  if not found or v_requester.deleted_at is not null then raise exception 'requester_deleted'; end if;

  perform public.materialize_accepted_request(p_request_id, v_req.rotation_session_id, v_req.group_seq);
  update match_requests set status = 'accepted', responded_at = now() where id = p_request_id;
  return true;
end;
$$;

revoke all on function public.maybe_materialize_request(uuid) from public, anon, authenticated;

-- ════════════════════════════════════════════════════════════════
-- §3 materialize_accepted_request — 협상 행 보존 + 이중 실행 방어 (0053 §1 대체)
-- ════════════════════════════════════════════════════════════════
--- 본문은 0053 그대로이고 두 곳만 바뀐다.
---  (1) 진입부 이중 실행 가드: 종전에는 아래 negotiations INSERT의 PK 충돌이 *우연히* 이 역할을 했는데,
---      (2)에서 on conflict do nothing으로 바꾸면 그 방어막이 사라져 기록이 조용히 두 벌 생긴다.
---  (2) negotiations INSERT를 do nothing으로 — 방 밖 로테이션이 미리 심어 둔 'proposed' 행을 보존한다.
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

  -- (1) 이중 실행 방어
  if exists (select 1 from personal_matches where source_request_id = p_request_id) then
    raise exception 'request_already_materialized';
  end if;

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

  v_requester_json := jsonb_strip_nulls(jsonb_build_object(
    'userId', v_requester.id, 'name', v_requester.name,
    'hand', v_requester.dominant_hand, 'ntrp', v_requester_ntrp));
  v_acceptor_json := jsonb_strip_nulls(jsonb_build_object(
    'userId', v_acceptor.id, 'name', v_acceptor.name,
    'hand', v_acceptor.dominant_hand, 'ntrp', v_acceptor_ntrp));
  v_partner_json := jsonb_strip_nulls(jsonb_build_object(
    'userId', v_partner_user_id, 'name', v_partner_name, 'hand', v_partner_hand, 'ntrp', v_partner_ntrp));
  v_opp2_json := jsonb_strip_nulls(jsonb_build_object(
    'userId', v_opp2_user_id, 'name', v_opp2_name, 'hand', v_opp2_hand, 'ntrp', v_opp2_ntrp));

  -- 요청자 관점 (원본)
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
    values (v_pm_requester, 'partner', v_partner_user_id, v_partner_name, v_partner_hand, v_partner_ntrp),
           (v_pm_requester, 'opponent2', v_opp2_user_id, v_opp2_name, v_opp2_hand, v_opp2_ntrp);
  end if;

  -- 대표(수락자) 관점 — 팀을 가로지르는 반전
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
    values (v_pm_acceptor, 'partner', v_opp2_user_id, v_opp2_name, v_opp2_hand, v_opp2_ntrp),
           (v_pm_acceptor, 'opponent2', v_partner_user_id, v_partner_name, v_partner_hand, v_partner_ntrp);
  end if;

  -- 회원 파트너·상대2 관점 (0053 — 방 안팎 통일)
  if v_is_doubles then
    if public.is_active_member(v_partner_user_id)
       and v_partner_user_id <> v_requester.id and v_partner_user_id <> v_acceptor.id then
      perform public.copy_personal_match_perspective(
        v_pm_requester, v_partner_user_id,
        public.swap_partner_perspective(v_req.set_scores),
        v_acceptor_json, v_requester_json, v_opp2_json);
    end if;
    if public.is_active_member(v_opp2_user_id)
       and v_opp2_user_id <> v_requester.id and v_opp2_user_id <> v_acceptor.id then
      perform public.copy_personal_match_perspective(
        v_pm_requester, v_opp2_user_id,
        public.swap_partner_perspective(v_inverted_scores),
        v_requester_json, v_acceptor_json, v_partner_json);
    end if;
  end if;

  -- (2) 방 밖 로테이션은 요청 생성 시점에 협상 행을 'proposed'로 심어 둔다 — 그 행을 덮지 않는다
  v_result_status := case when jsonb_array_length(v_req.set_scores) = 0 then 'none' else 'confirmed' end;
  insert into match_result_negotiations (request_id, set_scores, result_status)
  values (p_request_id, v_req.set_scores, v_result_status)
  on conflict (request_id) do nothing;

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

-- ════════════════════════════════════════════════════════════════
-- §4 accept_match_request — 대표 수락은 이제 '내 응답'일 뿐이다 (0050 §4 대체)
-- ════════════════════════════════════════════════════════════════
--- 시그니처·에러코드 불변(앱의 ACCEPT_ERROR_MESSAGES 4종 그대로 유효).
--- 단식·참가자 전원 비회원 복식은 게이트가 곧바로 통과시키므로 종전과 동작이 같다.
create or replace function public.accept_match_request(p_request_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_req match_requests%rowtype;
begin
  select * into v_req from match_requests where id = p_request_id for update;
  if not found then raise exception 'request_not_found'; end if;
  if v_req.status <> 'pending' then raise exception 'request_not_pending'; end if;
  if v_req.opponent_user_id <> auth.uid() then raise exception 'not_request_opponent'; end if;

  update match_requests set opponent_accepted_at = coalesce(opponent_accepted_at, now())
  where id = p_request_id;

  -- 리스트에 올라간 요청이면 대표의 방 참가를 즉시 확정한다.
  -- materialize의 upsert에만 맡기면 나머지 참가자가 수락할 때까지 대표가 자기가 수락한 방에 못 들어간다.
  if v_req.room_id is not null then
    insert into match_room_members (room_id, user_id, role, status, source_role, responded_at)
    values (v_req.room_id, v_req.opponent_user_id, 'player', 'joined', 'opponent', now())
    on conflict (room_id, user_id) do update
      set role = case when match_room_members.role = 'host' then 'host' else 'player' end,
          status = 'joined', source_role = 'opponent', responded_at = now();
  end if;

  perform public.maybe_materialize_request(p_request_id);
end;
$$;

revoke all on function public.accept_match_request(uuid) from public;
revoke execute on function public.accept_match_request(uuid) from anon;
grant execute on function public.accept_match_request(uuid) to authenticated;

-- ════════════════════════════════════════════════════════════════
-- §5 응답 표식 헬퍼 (internal)
-- ════════════════════════════════════════════════════════════════
--- 자격이 없으면 raise가 아니라 false를 돌려준다 — 세션 일괄 RPC가 호출자의 역할을 미리 몰라도
--- 두 함수를 차례로 시도해 해당하는 축만 표식할 수 있어야 하기 때문이다.

create or replace function public.mark_request_opponent_response(p_request_id uuid, p_accept boolean)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_req match_requests%rowtype;
begin
  select * into v_req from match_requests where id = p_request_id for update;
  if not found or v_req.status <> 'pending' then return false; end if;
  if v_req.opponent_user_id <> auth.uid() then return false; end if;
  if v_req.opponent_accepted_at is not null then return false; end if;

  if p_accept then
    update match_requests set opponent_accepted_at = now() where id = p_request_id;
  else
    update match_requests set status = 'rejected', responded_at = now() where id = p_request_id;
  end if;
  return true;
end;
$$;

create or replace function public.mark_request_participant_response(p_request_id uuid, p_accept boolean)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_req match_requests%rowtype;
  v_rows int;
begin
  select * into v_req from match_requests where id = p_request_id for update;
  if not found or v_req.status <> 'pending' then return false; end if;

  update match_request_participants
  set participation_status = case when p_accept then 'accepted' else 'rejected' end,
      responded_at = now()
  where request_id = p_request_id and user_id = auth.uid() and participation_status = 'pending';
  get diagnostics v_rows = row_count;
  if v_rows = 0 then return false; end if;

  -- 복식은 네 자리가 다 있어야 성립한다 — 한 명의 거절이 요청 전체를 끝낸다
  if not p_accept then
    update match_requests set status = 'rejected', responded_at = now() where id = p_request_id;
  end if;
  return true;
end;
$$;

revoke all on function public.mark_request_opponent_response(uuid, boolean) from public, anon, authenticated;
revoke all on function public.mark_request_participant_response(uuid, boolean) from public, anon, authenticated;

-- ════════════════════════════════════════════════════════════════
-- §6 respond_request_participation — 참가자(파트너·상대2)의 수락/거절
-- ════════════════════════════════════════════════════════════════
--- 반환값 = 이 호출로 기록이 만들어졌는지(= 내가 마지막 수락자였는지).
create or replace function public.respond_request_participation(p_request_id uuid, p_accept boolean)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_req match_requests%rowtype;
  v_status text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select * into v_req from match_requests where id = p_request_id for update;
  if not found then raise exception 'request_not_found'; end if;
  if v_req.status <> 'pending' then raise exception 'request_not_pending'; end if;

  select participation_status into v_status from match_request_participants
  where request_id = p_request_id and user_id = v_uid;
  if not found then raise exception 'not_request_participant'; end if;
  if v_status <> 'pending' then raise exception 'participation_already_responded'; end if;

  perform public.mark_request_participant_response(p_request_id, p_accept);
  if not p_accept then return false; end if;
  return public.maybe_materialize_request(p_request_id);
end;
$$;

revoke all on function public.respond_request_participation(uuid, boolean) from public;
revoke execute on function public.respond_request_participation(uuid, boolean) from anon;
grant execute on function public.respond_request_participation(uuid, boolean) to authenticated;

-- ════════════════════════════════════════════════════════════════
-- §7 respond_rotation_participation — 세션 단위 일괄 응답
-- ════════════════════════════════════════════════════════════════
--- 한 로테이션 세션에서 같은 회원이 게임1에서는 상대 대표, 게임3에서는 내 파트너일 수 있다.
--- 요청별로 쪼개면 같은 세션에 대해 [수락]을 역할을 바꿔가며 여러 번 누르는 화면이 된다.
--- 이 RPC가 두 축을 한 번에 흡수한다. rotation_sessions는 보지 않는다 — 개인 세션 행은 이미 삭제됐다.
create or replace function public.respond_rotation_participation(p_rotation_session_id uuid, p_accept boolean)
returns int
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_touched boolean;
  v_n int := 0;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_rotation_session_id is null then raise exception 'session_not_found'; end if;

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

  if v_n = 0 then raise exception 'no_pending_requests'; end if;
  return v_n;
end;
$$;

revoke all on function public.respond_rotation_participation(uuid, boolean) from public;
revoke execute on function public.respond_rotation_participation(uuid, boolean) from anon;
grant execute on function public.respond_rotation_participation(uuid, boolean) to authenticated;

-- ════════════════════════════════════════════════════════════════
-- §8 reject_match_request — 대표 거절을 RPC로 (앱의 직접 UPDATE 대체)
-- ════════════════════════════════════════════════════════════════
--- 종전에는 서버 액션이 테이블을 직접 UPDATE하며 opponent_user_id로 좁혔다. 참가자가 거절하면
--- 0행이 조용히 지나가고 "이미 처리된 요청입니다"로 오표시된다. 두 역할을 한 함수로 받는다.
create or replace function public.reject_match_request(p_request_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_req match_requests%rowtype;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select * into v_req from match_requests where id = p_request_id for update;
  if not found then raise exception 'request_not_found'; end if;
  if v_req.status <> 'pending' then raise exception 'request_not_pending'; end if;

  if v_req.opponent_user_id = v_uid then
    update match_requests set status = 'rejected', responded_at = now() where id = p_request_id;
    return;
  end if;

  if public.mark_request_participant_response(p_request_id, false) then return; end if;
  raise exception 'not_request_participant';
end;
$$;

revoke all on function public.reject_match_request(uuid) from public;
revoke execute on function public.reject_match_request(uuid) from anon;
grant execute on function public.reject_match_request(uuid) to authenticated;

-- ════════════════════════════════════════════════════════════════
-- §9 finalize_rotation_session — 방 밖에서도 상대 대표를 찾는다 (0050 §8 대체)
-- ════════════════════════════════════════════════════════════════
--- 변경점은 대표 결정의 room_id 게이트 제거와, 방/방 밖을 요청 상태로 가르는 분기뿐이다.
---   · 방 안: status='accepted' → materialize → propose (입장이 곧 동의, 0050 그대로)
---   · 방 밖: status='pending' + 협상 행을 'proposed'로 미리 심는다. materialize는 전원 수락 시 게이트가 한다.
--- 함정: 방 밖 요청의 set_scores는 반드시 '[]'다. materialize가 이 값으로 personal_matches를 만들기 때문에,
---       스코어를 넣으면 전원 수락 순간 대표 확인 없이 확정된다. 스코어는 협상 행에만 산다.
--- 폴백(상대팀 전원 비회원 → 즉시 확정)은 종전 그대로 둔다.
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

  if v_s.room_id is null then
    if v_s.user_id <> v_uid then raise exception 'session_not_found'; end if;
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

  -- 위조 방어 allowlist: 세션 풀 ∪ 방 참가자(joined) ∪ 세션 소유자
  select coalesce(array_agg(distinct t.uid), '{}'::uuid[]) into v_allowed
  from (
    select nullif(e->>'userId', '')::uuid as uid from jsonb_array_elements(v_s.players) e
    union
    select m.user_id from match_room_members m
      where v_s.room_id is not null and m.room_id = v_s.room_id and m.status = 'joined'
    union
    select v_s.user_id
  ) t
  where t.uid is not null;

  -- 다른 참가자가 이미 저장한 게임이 있으면 이어붙인다(세션 행 락이 동시 저장을 직렬화한다)
  select coalesce(max(group_seq), 0) into v_seq
  from personal_matches where rotation_session_id = p_session_id;

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
         case when v_is_room then 'accepted' else 'pending' end,
         case when v_is_room then now() else null end,
         case when v_is_room then now() else null end);

      -- 참여 상태는 §1 트리거가 요청 상태에서 파생한다(방 안·비회원 = accepted, 방 밖 회원 = pending)
      insert into match_request_participants (request_id, role, user_id, name, dominant_hand, ntrp_snapshot)
      values (v_req_id, 'partner', v_partner_id, v_partner->>'name',
              nullif(v_partner->>'hand', ''), nullif(v_partner->>'ntrp', '')::numeric);
      insert into match_request_participants (request_id, role, user_id, name, dominant_hand, ntrp_snapshot)
      values (v_req_id, 'opponent2', nullif(v_other->>'userId', '')::uuid, v_other->>'name',
              nullif(v_other->>'hand', ''), nullif(v_other->>'ntrp', '')::numeric);

      if v_is_room then
        -- 방 입장이 곧 참여 동의 — 곧바로 기록을 만들고 세트는 제안으로 올린다
        perform public.materialize_accepted_request(v_req_id, p_session_id, v_seq::smallint);
        perform public.propose_match_result(v_req_id, v_sets);
      else
        -- 방 밖: 전원이 참여를 수락해야 기록이 생긴다. 입력자가 넣은 스코어를 잃지 않도록
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

      if v_is_room then
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

  if v_s.room_id is null then
    delete from rotation_sessions where id = p_session_id;
  else
    perform public.recompute_match_room_settled(v_s.room_id);
  end if;
end;
$$;

revoke all on function public.finalize_rotation_session(uuid, jsonb) from public;
revoke execute on function public.finalize_rotation_session(uuid, jsonb) from anon;
grant execute on function public.finalize_rotation_session(uuid, jsonb) to authenticated;

-- ════════════════════════════════════════════════════════════════
-- §10 join_match_room_as_player — 방 입장은 그 방 요청의 참여 수락을 겸한다 (0050 §6 대체)
-- ════════════════════════════════════════════════════════════════
--- 리스트에 올린 확인 요청은 참가자를 방에 초대한다. 입장했는데 요청은 따로 수락해야 한다면,
--- 같은 방에서 대표는 입장만으로 참가가 확정되는데 파트너만 한 단계를 더 밟는 비대칭이 남는다.
--- 0049가 선언한 '입장(=참가)이 곧 참여 동의'를 참가자에게도 적용한다.
create or replace function public.join_match_room_as_player(p_room_id uuid, p_user_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_room match_rooms%rowtype;
  v_s rotation_sessions%rowtype;
  v_u users%rowtype;
  v_ntrp numeric;
  v_req_id uuid;
begin
  select * into v_room from match_rooms where id = p_room_id;
  if not found then raise exception 'room_not_found'; end if;
  -- 방장은 이미 host·joined
  if v_room.host_user_id = p_user_id then return; end if;

  -- 초대 대기·거절 상태였더라도 비밀번호를 알고 들어왔으면 참가로 확정 (host 행은 건드리지 않는다)
  insert into match_room_members (room_id, user_id, role, status, responded_at)
  values (p_room_id, p_user_id, 'player', 'joined', now())
  on conflict (room_id, user_id) do update
    set role = 'player', status = 'joined', responded_at = now()
    where match_room_members.role <> 'host';

  -- 이 방의 대기 중인 요청에서 내 참가자 자리를 수락 처리한다(입장 = 참여 동의).
  -- auth.uid()를 쓰지 않는다 — 이 헬퍼는 초대 수락 등 다른 주체를 대신해서도 불린다.
  for v_req_id in
    select r.id from match_requests r
    join match_request_participants p on p.request_id = r.id
    where r.room_id = p_room_id and r.status = 'pending'
      and p.user_id = p_user_id and p.participation_status = 'pending'
  loop
    update match_request_participants
    set participation_status = 'accepted', responded_at = now()
    where request_id = v_req_id and user_id = p_user_id and participation_status = 'pending';
    perform public.maybe_materialize_request(v_req_id);
  end loop;

  -- 미확정 로테이션 방이면 세션 풀에도 추가
  select * into v_s from rotation_sessions where room_id = p_room_id for update;
  if not found then return; end if;
  if exists (select 1 from jsonb_array_elements(v_s.players) e where e->>'userId' = p_user_id::text) then return; end if;

  select * into v_u from users where id = p_user_id and is_guest = false and deleted_at is null;
  if not found then return; end if;
  v_ntrp := coalesce(public.derive_public_ntrp(v_u), v_u.ntrp);
  if v_ntrp is null then return; end if;

  update rotation_sessions
  set players = players || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
    'userId', v_u.id, 'name', v_u.name, 'hand', v_u.dominant_hand, 'ntrp', v_ntrp
  )))
  where id = v_s.id;
  update match_room_members set source_role = 'pool' where room_id = p_room_id and user_id = p_user_id;
end;
$$;

revoke all on function public.join_match_room_as_player(uuid, uuid) from public, anon, authenticated;
