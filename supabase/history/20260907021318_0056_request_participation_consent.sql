-- 20260907021318 0056_request_participation_consent
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
-- 0056_request_participation_consent.sql
-- 방 밖 확인 요청은 회원 참가자 전원이 참여를 수락해야 기록이 생긴다.
-- 상세 주석은 supabase/migrations/0056_request_participation_consent.sql 참조.

-- ── §1 스키마 ──
alter table public.match_request_participants
  add column if not exists participation_status text not null default 'pending'
    check (participation_status in ('pending', 'accepted', 'rejected')),
  add column if not exists responded_at timestamptz;

comment on column public.match_request_participants.participation_status is
  '참여 수락 상태. 회원 참가자만 의미가 있다(비회원·탈퇴자는 트리거가 accepted로 시작시킨다). 요청이 pending일 때만 대기 판정에 쓰인다.';

alter table public.match_requests
  add column if not exists opponent_accepted_at timestamptz,
  add column if not exists rotation_session_id uuid,
  add column if not exists group_seq smallint;

comment on column public.match_requests.rotation_session_id is
  '로테이션 세션 tombstone id (FK 없음). 세션 단위 일괄 수락(respond_rotation_participation)과 목록 묶음의 키.';

drop index if exists public.match_requests_pending_dedup_uidx;
create unique index match_requests_pending_dedup_uidx
  on public.match_requests(requester_id, opponent_user_id, played_at, played_time)
  where status = 'pending' and rotation_session_id is null;

create index if not exists match_requests_rotation_idx
  on public.match_requests(rotation_session_id) where rotation_session_id is not null;

create index if not exists match_request_participants_user_idx
  on public.match_request_participants(user_id) where user_id is not null;

update public.match_request_participants set participation_status = 'accepted'
where participation_status = 'pending';

update public.match_requests set opponent_accepted_at = coalesce(responded_at, created_at)
where status = 'accepted' and opponent_accepted_at is null;

update public.match_requests r
set rotation_session_id = pm.rotation_session_id, group_seq = pm.group_seq
from public.personal_matches pm
where pm.source_request_id = r.id and not pm.is_perspective
  and pm.rotation_session_id is not null and r.rotation_session_id is null;

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

-- ── §2 전원 수락 게이트 ──
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

  if v_req.status <> 'pending' then return false; end if;
  if v_req.opponent_accepted_at is null then return false; end if;

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

-- ── §3 materialize — 협상 행 보존 + 이중 실행 방어 (0053 §1 대체) ──
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

  v_result_status := case when jsonb_array_length(v_req.set_scores) = 0 then 'none' else 'confirmed' end;
  insert into match_result_negotiations (request_id, set_scores, result_status)
  values (p_request_id, v_req.set_scores, v_result_status)
  on conflict (request_id) do nothing;

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

-- ── §4 accept_match_request (0050 §4 대체) ──
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

-- ── §5 응답 표식 헬퍼 ──
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

  if not p_accept then
    update match_requests set status = 'rejected', responded_at = now() where id = p_request_id;
  end if;
  return true;
end;
$$;

revoke all on function public.mark_request_opponent_response(uuid, boolean) from public, anon, authenticated;
revoke all on function public.mark_request_participant_response(uuid, boolean) from public, anon, authenticated;

-- ── §6 참가자 응답 ──
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

-- ── §7 세션 단위 일괄 응답 ──
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

-- ── §8 reject_match_request ──
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
