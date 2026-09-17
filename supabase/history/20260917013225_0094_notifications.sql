-- 20260917013225 0094_notifications
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
-- 0094_notifications.sql
-- Week 71 — 인앱 알림(사건 기록) + 초대 유효기간(매칭 종료 시각) + 이의 시각 스탬프.
--
-- 왜 지금인가: 초대·결과 확인·이의에 알림이 없어 무응답이 방을 막는다(백로그 「알림 부재」). 이 마이그레이션은
-- "무엇이 일어났나"를 `notifications` 한 테이블에 남기는 **사건 기록**이고, 채널(인앱 종 아이콘)은 앱이 그린다.
-- 이메일·PWA 웹 푸시는 나중에 이 테이블의 INSERT를 구독하는 채널을 하나 더 꽂는 것으로 얹는다 — 그래서
-- 채널 컬럼을 두지 않고, payload에 **표시에 필요한 전부를 스냅샷**으로 넣는다(방·행위자가 지워져도 문구가 선다).
--
-- 사건은 전부 **트리거**가 잡는다(RPC·앱 어느 경로로 바뀌어도 같은 곳을 지난다). 예외는 자동 대진표 —
-- 게임 수만큼 행이 INSERT되므로 행 트리거면 알림이 N개 터진다. 그래서 `create_room_lineup`·`replace_room_lineup`
-- 본문 말미에서 1회 방출한다(본문은 dev의 pg_get_functiondef를 그대로 옮겨 적었다 — 0075·0078이 겪은 「옛 정의 복사」
-- 함정을 피하기 위해 마이그레이션 파일이 아니라 살아 있는 정의에서 가져왔다. `room_not_ready` 가드는 없다).
--
-- 행위자는 `auth.uid()` — JWT GUC라 SECURITY DEFINER를 지나도 호출자 uid가 유지된다. pg_cron·MCP처럼 JWT가 없는
-- 경로에서는 null이고, 트리거는 그것을 **시스템 행위**로 읽는다(0095의 자동 확정이 `result_auto_confirmed`가 되는 근거).
-- 행위자 본인에게는 보내지 않는다(`notify_users`가 한 곳에서 거른다).
--
-- 초대 유효기간: 매칭 **종료 시각**까지. 종료는 `room_end_at`이 정한다 — played_time이 없으면 그날이 끝날 때,
-- duration이 없으면 120분(앱 `DEFAULT_DURATION_MINUTES`의 거울. 앱 쪽 `roomEndAt`과 규칙이 같아야 한다 — vitest 고정).
-- 만료를 컬럼(status)으로 두지 않고 시간으로 해석한다 — CHECK·`keep_removed_room_member`·재초대 경로가 그대로다.

-- ─── 1. 테이블 ───────────────────────────────────────────────────────────────
create table public.notifications (
    id            uuid primary key default gen_random_uuid(),
    user_id       uuid not null references public.users(id) on delete cascade,     -- 받는 사람
    type          text not null check (type in (
        -- 사건(트리거·RPC)
        'room_invited', 'invite_accepted', 'invite_declined', 'room_entered',
        'member_removed', 'member_left',
        'result_proposed', 'result_confirmed', 'result_auto_confirmed', 'result_disputed', 'result_reopen_requested',
        'room_closed', 'lineup_saved', 'lineup_changed', 'room_deleted', 'invite_expired',
        -- 예약(0095 run_notification_jobs)
        'invite_reminder', 'room_tomorrow', 'result_missing', 'auto_confirm_reminder', 'reentry_reminder'
    )),
    room_id       uuid references public.match_rooms(id) on delete set null,       -- 지워져도 행은 남는다(payload가 문구를 지탱)
    request_id    uuid references public.match_requests(id) on delete set null,
    actor_user_id uuid references public.users(id) on delete set null,             -- 시스템(cron)이면 null
    payload       jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
    dedupe_key    text,                                                            -- 예약 알림 멱등 키(사건 알림은 null)
    created_at    timestamptz not null default clock_timestamp(),   -- now()는 트랜잭션 시각이라 한 RPC 안의 여러 행이 같은 값을 받는다(0075 교훈) — 목록 순서가 곧 데이터다
    read_at       timestamptz
);
comment on table public.notifications is
    '알림 사건 기록(0094). 쓰기는 트리거·RPC 전용, 본인 행만 SELECT. payload = 방·행위자 스냅샷 + 타입별 키. 채널(인앱·이메일·푸시)은 이 위에 얹는다.';

create unique index notifications_dedupe_uidx on public.notifications (user_id, dedupe_key) where dedupe_key is not null;
create index notifications_inbox_idx   on public.notifications (user_id, created_at desc);
create index notifications_unread_idx  on public.notifications (user_id) where read_at is null;
-- FK 인덱스(0092 advisor 관용구)
create index notifications_room_idx    on public.notifications (room_id) where room_id is not null;
create index notifications_request_idx on public.notifications (request_id) where request_id is not null;
create index notifications_actor_idx   on public.notifications (actor_user_id) where actor_user_id is not null;

alter table public.notifications enable row level security;
create policy notifications_select on public.notifications
    for select to authenticated using (user_id = (select auth.uid()));
-- INSERT/UPDATE/DELETE 정책 없음 = 트리거·RPC 전용(match_room_secrets 관용구)
revoke insert, update, delete on public.notifications from anon, authenticated;
revoke all on public.notifications from anon;

-- ─── 2. 시간 헬퍼 — 방의 시작·종료 시각(KST) ─────────────────────────────────
-- played_at·played_time은 KST 로컬 값이고 now()는 UTC라 여기서 한 번 timestamptz로 만든다.
create or replace function public.room_start_at(r public.match_rooms)
returns timestamptz
language sql stable
set search_path = public
as $$
    select (r.played_at + coalesce(r.played_time, time '00:00')) at time zone 'Asia/Seoul';
$$;

-- 시각을 모르는 방(played_time null — 레거시)은 그날이 끝날 때, 소요 시간을 모르면 120분(앱 DEFAULT_DURATION_MINUTES 거울)
create or replace function public.room_end_at(r public.match_rooms)
returns timestamptz
language sql stable
set search_path = public
as $$
    select case
        when r.played_time is null then ((r.played_at + 1)::timestamp) at time zone 'Asia/Seoul'
        else public.room_start_at(r) + make_interval(mins => coalesce(r.duration_minutes, 120))
    end;
$$;
revoke all on function public.room_start_at(public.match_rooms) from public, anon, authenticated;
revoke all on function public.room_end_at(public.match_rooms) from public, anon, authenticated;

-- ─── 3. 발송 헬퍼 ────────────────────────────────────────────────────────────
-- 방 스냅샷 — 앱의 buildRoomTitle이 그대로 읽을 수 있는 키 이름
create or replace function public.room_snapshot(p_room_id uuid)
returns jsonb
language sql stable security definer
set search_path = public
as $$
    select coalesce((
        select jsonb_strip_nulls(jsonb_build_object(
            'playedAt', r.played_at,
            'playedTime', to_char(r.played_time, 'HH24:MI'),
            'durationMinutes', r.duration_minutes,
            'matchType', r.match_type,
            'courtName', r.court_name,
            'hostName', h.name
        ))
        from public.match_rooms r
        left join public.users h on h.id = r.host_user_id
        where r.id = p_room_id
    ), '{}'::jsonb);
$$;

create or replace function public.room_joined_user_ids(p_room_id uuid)
returns uuid[]
language sql stable security definer
set search_path = public
as $$
    select coalesce(array_agg(user_id), '{}'::uuid[])
    from public.match_room_members where room_id = p_room_id and status = 'joined';
$$;

create or replace function public.room_reachable_user_ids(p_room_id uuid)
returns uuid[]
language sql stable security definer
set search_path = public
as $$
    select coalesce(array_agg(user_id), '{}'::uuid[])
    from public.match_room_members where room_id = p_room_id and status in ('invited', 'joined');
$$;

-- 수신자 배열 → 행. 중복 제거·탈퇴/게스트 제외·**행위자 제외**·dedupe_key 충돌은 조용히 건너뛴다. 반환 = 삽입 수.
create or replace function public.notify_users(
    p_user_ids uuid[],
    p_type text,
    p_room_id uuid,
    p_request_id uuid,
    p_actor uuid,
    p_payload jsonb default '{}'::jsonb,
    p_dedupe_key text default null
)
returns integer
language plpgsql volatile security definer
set search_path = public
as $$
declare
    v_payload jsonb;
    v_count integer;
begin
    if p_user_ids is null or cardinality(p_user_ids) = 0 then return 0; end if;

    v_payload := public.room_snapshot(p_room_id);
    if p_actor is not null then
        v_payload := v_payload || jsonb_strip_nulls(jsonb_build_object(
            'actorName', (select u.name from public.users u where u.id = p_actor)));
    end if;
    v_payload := v_payload || coalesce(p_payload, '{}'::jsonb);

    insert into public.notifications (user_id, type, room_id, request_id, actor_user_id, payload, dedupe_key)
    select distinct u, p_type, p_room_id, p_request_id, p_actor, v_payload, p_dedupe_key
    from unnest(p_user_ids) as t(u)
    where public.is_active_member(u) and (p_actor is null or u <> p_actor)
    on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
    get diagnostics v_count = row_count;
    return v_count;
end;
$$;
revoke all on function public.room_snapshot(uuid) from public, anon, authenticated;
revoke all on function public.room_joined_user_ids(uuid) from public, anon, authenticated;
revoke all on function public.room_reachable_user_ids(uuid) from public, anon, authenticated;
revoke all on function public.notify_users(uuid[], text, uuid, uuid, uuid, jsonb, text) from public, anon, authenticated;

-- ─── 4. 사건 트리거 ──────────────────────────────────────────────────────────
-- T1 멤버 상태 전이. 초대 수락(invited→joined)과 비밀번호 입장(INSERT joined / declined→joined)은
-- join_match_room_as_player의 upsert 전이로 갈린다. 호스트 자기 행(INSERT host)은 사건이 아니다.
create or replace function public.notify_room_member_event()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
    v_actor uuid := auth.uid();
    v_host uuid;
begin
    select host_user_id into v_host from public.match_rooms where id = new.room_id;
    if v_host is null then return null; end if;

    if tg_op = 'INSERT' then
        if new.status = 'invited' then
            perform public.notify_users(array[new.user_id], 'room_invited', new.room_id, null, v_actor);
        elsif new.status = 'joined' and new.role <> 'host' then
            perform public.notify_users(array[v_host], 'room_entered', new.room_id, null, new.user_id);
        end if;
        return null;
    end if;

    if old.status = new.status then return null; end if;

    if new.status = 'invited' and old.status in ('declined', 'removed') then
        perform public.notify_users(array[new.user_id], 'room_invited', new.room_id, null, v_actor);
    elsif new.status = 'joined' and old.status = 'invited' then
        perform public.notify_users(array[v_host], 'invite_accepted', new.room_id, null, new.user_id);
    elsif new.status = 'joined' and old.status = 'declined' then
        perform public.notify_users(array[v_host], 'room_entered', new.room_id, null, new.user_id);
    elsif new.status = 'declined' and old.status = 'invited' then
        perform public.notify_users(array[v_host], 'invite_declined', new.room_id, null, new.user_id);
    elsif new.status = 'declined' and old.status = 'joined' then
        perform public.notify_users(array[v_host], 'member_left', new.room_id, null, new.user_id);
    elsif new.status = 'removed' then
        perform public.notify_users(array[new.user_id], 'member_removed', new.room_id, null, v_actor);
    end if;
    return null;
end;
$$;
revoke all on function public.notify_room_member_event() from public, anon, authenticated;
create trigger match_room_members_notify
    after insert or update of status on public.match_room_members
    for each row execute function public.notify_room_member_event();

-- T2 결과 협상 전이. 좌석 = request_result_seats(활성 회원). 확정은 사람(uid 있음)과 시스템(uid 없음 — 0095 자동 확정)을 가른다.
-- 이의(proposed→disputed)와 정정 요청(confirmed→disputed)은 OLD로 갈린다.
create or replace function public.notify_result_event()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
    v_actor uuid := auth.uid();
    v_room uuid;
    v_seats uuid[];
    v_old text := case when tg_op = 'INSERT' then null else old.result_status end;
begin
    select room_id into v_room from public.match_requests where id = new.request_id;
    v_seats := public.request_result_seats(new.request_id);

    if new.result_status = 'proposed'
       and (v_old is distinct from 'proposed' or new.proposed_at is distinct from old.proposed_at) then
        perform public.notify_users(v_seats, 'result_proposed', v_room, new.request_id, new.proposed_by,
            jsonb_build_object('revised', v_old = 'proposed'));
    elsif new.result_status = 'confirmed' and v_old = 'proposed' then
        if v_actor is not null then
            perform public.notify_users(v_seats, 'result_confirmed', v_room, new.request_id, v_actor);
        else
            perform public.notify_users(v_seats, 'result_auto_confirmed', v_room, new.request_id, null);
        end if;
    elsif new.result_status = 'disputed' and v_old = 'proposed' then
        perform public.notify_users(v_seats, 'result_disputed', v_room, new.request_id, new.disputed_by,
            jsonb_strip_nulls(jsonb_build_object('disputeReason', new.dispute_reason)));
    elsif new.result_status = 'disputed' and v_old = 'confirmed' then
        perform public.notify_users(v_seats, 'result_reopen_requested', v_room, new.request_id, new.disputed_by,
            jsonb_strip_nulls(jsonb_build_object('disputeReason', new.dispute_reason)));
    end if;
    return null;
end;
$$;
revoke all on function public.notify_result_event() from public, anon, authenticated;
create trigger match_result_negotiations_notify
    after insert or update of result_status, proposed_at on public.match_result_negotiations
    for each row execute function public.notify_result_event();

-- T4 이의 시각 — 0095의 「이의 뒤 24시간 재입력 없음」 독촉 기준. 0062 normalize_result_confirmations는 손대지 않는다.
alter table public.match_result_negotiations add column if not exists disputed_at timestamptz;
create or replace function public.stamp_result_disputed_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
    if new.result_status = 'disputed' and old.result_status <> 'disputed' then
        new.disputed_at := now();
    end if;
    return new;
end;
$$;
revoke all on function public.stamp_result_disputed_at() from public, anon, authenticated;
create trigger match_result_negotiations_stamp_disputed
    before update of result_status on public.match_result_negotiations
    for each row execute function public.stamp_result_disputed_at();

-- T3 매칭 마감·삭제. 삭제는 BEFORE여야 멤버 행(cascade 대상)이 아직 있고 스냅샷을 읽을 수 있다 —
-- 행이 지워지면 FK가 notifications.room_id를 null로 바꾸고 payload가 문구를 지탱한다.
create or replace function public.notify_room_closed()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
    if old.closed_at is null and new.closed_at is not null then
        perform public.notify_users(public.room_joined_user_ids(new.id), 'room_closed', new.id, null, new.host_user_id);
    end if;
    return null;
end;
$$;
create or replace function public.notify_room_deleted()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
    perform public.notify_users(public.room_reachable_user_ids(old.id), 'room_deleted', old.id, null, old.host_user_id);
    return old;
end;
$$;
revoke all on function public.notify_room_closed() from public, anon, authenticated;
revoke all on function public.notify_room_deleted() from public, anon, authenticated;
create trigger match_rooms_notify_closed
    after update of closed_at on public.match_rooms
    for each row execute function public.notify_room_closed();
create trigger match_rooms_notify_deleted
    before delete on public.match_rooms
    for each row execute function public.notify_room_deleted();

-- ─── 5. 초대 유효기간 — respond_room_invite에 invite_expired ─────────────────
-- 본문은 0050 그대로 + 방을 먼저 읽어 수락만 막는다. **거절은 만료 뒤에도 허용**(낡은 화면의 정리 경로).
create or replace function public.respond_room_invite(p_room_id uuid, p_accept boolean)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
    v_uid uuid := auth.uid();
    v_room match_rooms%rowtype;
begin
    if v_uid is null then raise exception 'not_authenticated'; end if;
    select * into v_room from match_rooms where id = p_room_id;
    if not found then raise exception 'room_not_found'; end if;
    if p_accept and public.room_end_at(v_room) <= now() then raise exception 'invite_expired'; end if;

    update match_room_members
    set status = case when p_accept then 'joined' else 'declined' end, responded_at = now()
    where room_id = p_room_id and user_id = v_uid and status = 'invited';
    if not found then raise exception 'invite_not_found'; end if;

    if p_accept then
        perform public.join_match_room_as_player(p_room_id, v_uid);
    end if;
end;
$$;
revoke execute on function public.respond_room_invite(uuid, boolean) from public, anon;

-- ─── 6. 자동 대진표 — RPC 말미 1회 방출 ─────────────────────────────────────
create or replace function public.create_room_lineup(p_room_id uuid, p_games jsonb, p_slot_minutes integer default null)
returns integer
language plpgsql security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room match_rooms%rowtype;
  v_count integer;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select * into v_room from match_rooms where id = p_room_id for update;
  if not found then raise exception 'room_not_found'; end if;
  if v_room.host_user_id <> v_uid then raise exception 'not_room_host'; end if;
  if v_room.is_settled then raise exception 'room_already_closed'; end if;

  if p_games is null or jsonb_typeof(p_games) <> 'array' or jsonb_array_length(p_games) < 1 then
    raise exception 'invalid_games';
  end if;

  if p_slot_minutes is not null and (p_slot_minutes < 10 or p_slot_minutes > 180) then
    raise exception 'invalid_slot_minutes';
  end if;

  v_count := public.insert_room_lineup_games(p_room_id, p_games);

  if p_slot_minutes is not null then
    update match_rooms set slot_minutes = p_slot_minutes where id = p_room_id;
  end if;

  perform public.recompute_match_room_settled(p_room_id);
  -- 0094: 참가자에게 「대진표가 나왔습니다」 1회(게임 수와 무관). 호스트 본인은 notify_users가 뺀다.
  perform public.notify_users(public.room_joined_user_ids(p_room_id), 'lineup_saved', p_room_id, null, v_uid,
      jsonb_build_object('gameCount', v_count));
  return v_count;
end;
$$;

create or replace function public.replace_room_lineup(p_room_id uuid, p_game_ids uuid[], p_games jsonb)
returns integer
language plpgsql security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room match_rooms%rowtype;
  v_ids uuid[] := coalesce(p_game_ids, '{}');
  v_req_ids uuid[];
  v_locked integer;
  v_count integer;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select * into v_room from match_rooms where id = p_room_id for update;
  if not found then raise exception 'room_not_found'; end if;
  if v_room.host_user_id <> v_uid then raise exception 'not_room_host'; end if;
  if v_room.is_settled then raise exception 'room_already_closed'; end if;

  select count(*) into v_locked
  from unnest(v_ids) as t(id)
  where not exists (
    select 1
    from personal_matches pm
    left join match_requests req on req.id = pm.source_request_id
    left join match_result_negotiations neg on neg.request_id = req.id
    where pm.id = t.id
      and pm.room_id = p_room_id
      and not pm.is_perspective
      and jsonb_array_length(pm.set_scores) = 0
      and (
        (pm.source_type = 'confirmation'
           and req.origin = 'lineup'
           and req.status = 'accepted'
           and jsonb_array_length(req.set_scores) = 0
           and coalesce(neg.result_status, 'none') = 'none'
           and not exists (
             select 1 from personal_matches x
             where x.source_request_id = req.id and jsonb_array_length(x.set_scores) > 0
           ))
        or (pm.source_type = 'direct' and pm.origin = 'lineup' and pm.source_request_id is null)
      )
  );
  if v_locked > 0 then raise exception 'lineup_locked'; end if;

  if array_length(v_ids, 1) is not null then
    select array_agg(pm.source_request_id) into v_req_ids
    from personal_matches pm
    where pm.id = any(v_ids) and pm.source_request_id is not null;
    if v_req_ids is not null then
      delete from personal_matches where source_request_id = any(v_req_ids);
      delete from match_requests where id = any(v_req_ids);
    end if;
    delete from personal_matches
    where id = any(v_ids) and source_type = 'direct' and origin = 'lineup';
  end if;

  v_count := public.insert_room_lineup_games(p_room_id, coalesce(p_games, '[]'::jsonb));
  perform public.recompute_match_room_settled(p_room_id);
  -- 0094: 「대진표가 바뀌었습니다」 1회
  perform public.notify_users(public.room_joined_user_ids(p_room_id), 'lineup_changed', p_room_id, null, v_uid,
      jsonb_build_object('gameCount', v_count));
  return v_count;
end;
$$;
revoke execute on function public.create_room_lineup(uuid, jsonb, integer) from public, anon;
revoke execute on function public.replace_room_lineup(uuid, uuid[], jsonb) from public, anon;

-- ─── 7. 읽음 처리 RPC ────────────────────────────────────────────────────────
-- 정책 UPDATE 대신 RPC — 정책으로 열면 payload·type까지 고칠 수 있고(컬럼 grant 전례 없음), [모두 읽음]이 한 호출이다.
create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns integer
language plpgsql volatile security definer
set search_path = public
as $$
declare
    v_uid uuid := auth.uid();
    v_count integer;
begin
    if v_uid is null then raise exception 'not_authenticated'; end if;
    update public.notifications
    set read_at = now()
    where user_id = v_uid and read_at is null and (p_ids is null or id = any(p_ids));
    get diagnostics v_count = row_count;
    return v_count;
end;
$$;
revoke execute on function public.mark_notifications_read(uuid[]) from public, anon;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;
