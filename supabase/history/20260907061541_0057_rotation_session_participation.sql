-- 20260907061541 0057_rotation_session_participation
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
-- 0057 — 로테이션 세션의 참여 동의 축 (일정 초대). 정본은 supabase/migrations/0057_rotation_session_participation.sql

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

drop policy if exists rotation_sessions_select on public.rotation_sessions;
create policy rotation_sessions_select on public.rotation_sessions
  for select using (public.is_rotation_session_party(id));

drop policy if exists rotation_session_participants_select on public.rotation_session_participants;
create policy rotation_session_participants_select on public.rotation_session_participants
  for select using (public.is_rotation_session_party(session_id));

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

  delete from rotation_session_participants
  where session_id = new.id
    and not (user_id = any(v_ids))
    and participation_status <> 'rejected';

  insert into rotation_session_participants (session_id, user_id, participation_status, responded_at)
  select new.id, uid,
         case when new.room_id is not null then 'accepted' else 'pending' end,
         case when new.room_id is not null then now() else null end
  from unnest(v_ids) uid
  on conflict (session_id, user_id) do update
    set participation_status = excluded.participation_status,
        responded_at = excluded.responded_at
    where rotation_session_participants.participation_status = 'rejected';

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

create or replace function public.respond_rotation_plan(p_session_id uuid, p_accept boolean)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_rows int;
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
end;
$$;

revoke all on function public.respond_rotation_plan(uuid, boolean) from public;
revoke execute on function public.respond_rotation_plan(uuid, boolean) from anon;
grant execute on function public.respond_rotation_plan(uuid, boolean) to authenticated;

comment on function public.respond_rotation_plan(uuid, boolean) is
  '로테이션 일정(세션) 초대에 대한 참여 응답 (0057). 게임 파생 요청의 일괄 응답은 respond_rotation_participation(0056)이다.';
comment on function public.respond_rotation_participation(uuid, boolean) is
  'finalize가 만든 게임 파생 요청들의 세션 단위 일괄 응답 (0056). 게임 전 일정 초대는 respond_rotation_plan(0057)이다.';

create or replace function public.rotation_seats_accepted(p_session_id uuid, p_uids uuid[])
returns boolean
language sql stable security definer set search_path = public
as $$
  select not exists (
    select 1 from unnest(p_uids) u(uid)
    where public.is_active_member(u.uid)
      and not exists (
        select 1 from rotation_session_participants p
        where p.session_id = p_session_id and p.user_id = u.uid
          and p.participation_status = 'accepted')
  );
$$;

revoke all on function public.rotation_seats_accepted(uuid, uuid[]) from public, anon, authenticated;

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

  v_notes := case when v_s.user_id = v_uid then v_s.notes else null end;

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

  select coalesce(max(group_seq), 0) into v_seq
  from personal_matches where rotation_session_id = p_session_id;

  for g in select value from jsonb_array_elements(p_games) loop
    if coalesce(g->'partner'->>'name', '') = ''
       or coalesce(g->'opp1'->>'name', '') = ''
       or coalesce(g->'opp2'->>'name', '') = '' then
      raise exception 'invalid_games';
    end if;
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
    if v_partner_id = v_uid or v_opp1_id = v_uid or v_opp2_id = v_uid then
      raise exception 'invalid_games';
    end if;
    if (v_partner_id is not null and v_partner_id in (v_opp1_id, v_opp2_id))
       or (v_opp1_id is not null and v_opp1_id = v_opp2_id) then
      raise exception 'duplicate_players';
    end if;

    v_sets := public.normalize_set_scores(g->'sets', true);
    v_seq := v_seq + 1;

    v_immediate := v_is_room
      or public.rotation_seats_accepted(p_session_id, array[v_partner_id, v_opp1_id, v_opp2_id]);

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

insert into public.rotation_session_participants (session_id, user_id, participation_status, responded_at)
select s.id, t.uid, 'accepted', s.created_at
from public.rotation_sessions s,
     lateral (select distinct nullif(e->>'userId', '')::uuid as uid
              from jsonb_array_elements(s.players) e) t
where public.is_active_member(t.uid) and t.uid <> s.user_id
on conflict (session_id, user_id) do nothing;
