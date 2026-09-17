-- 20260917015045 0095_notification_jobs
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
-- 0095_notification_jobs.sql
-- Week 71 — 예약 알림 + 결과 자동 확정. 0094가 "일어난 일"을 기록했다면, 여기는 **시각이 되면** 일어나는 것들이다.
--
-- 스케줄러는 pg_cron(10분 주기). Vercel Hobby 크론은 하루 한 번뿐이라 "시작 2시간 전"·"24시간 뒤 자동 확정"을
-- 맞출 수 없다. 잡은 postgres 소유자로 돌고 JWT가 없어 `auth.uid()`가 null — 0094의 트리거가 그것을 시스템 행위로
-- 읽어 자동 확정을 `result_auto_confirmed`로 기록한다.
--
-- 규칙(사용자 결정, 2026-09-17):
--   J1·J2 초대 독촉 — 경기 시작 2시간 전, 시작 시각(그때까지 미응답이면). 시각을 모르는 방은 건너뛴다.
--   J3 초대 만료 — 매칭 종료 시각을 응답 없이 지나면 호스트에게 「OOO님이 응답하지 않았습니다」.
--   J4 D-1 — 경기 전날 20:00 KST, 참가자 전원(호스트 포함).
--   J5 결과 미입력 — 종료 + 3시간, 결과가 하나도 안 들어온 게임의 당사자.
--   J6 확정 리마인드 — 자동 확정 12시간 전, 아직 확인하지 않은 좌석.
--   J7 자동 확정 — deadline = max(입력 시각, 매칭 종료) + 24h. 좌석 전원 확인으로 간주해 settle. 되돌리기는 [결과 정정].
--   J8 재입력 독촉 — 이의 뒤 24시간 재입력이 없으면 제안자에게.
--
-- 멱등: 예약 알림은 전부 dedupe_key(0094 부분 유니크)로 1회. **2일 유효창** — due가 이틀 넘게 지난 것은 보내지 않는다.
-- 첫 배포 때 과거 방 전량이 대상이 되거나, 크론이 멈췄다 살아나며 몰아치는 것을 막는다. J7만 창이 없다(늦어도 확정한다).
-- 서브잡은 각자 예외를 삼켜(raise warning) 하나가 실패해도 나머지가 돈다.

create extension if not exists pg_cron;

-- ─── 예약 작업 본체 ──────────────────────────────────────────────────────────
create or replace function public.run_notification_jobs()
returns void
language plpgsql volatile security definer
set search_path = public
as $$
declare
    v_window interval := interval '2 days';
    r record;
    v_seats uuid[];
    v_pending uuid[];
begin
    -- J1·J2 초대 독촉(시작 2시간 전 · 시작 시각) — 미정산·미마감 방, 시각이 있는 방만
    begin
        for r in
            select m.user_id, rm.id as room_id, s.stage, s.due
            from public.match_rooms rm
            join public.match_room_members m on m.room_id = rm.id and m.status = 'invited'
            cross join lateral (values
                (1, public.room_start_at(rm) - interval '2 hours'),
                (2, public.room_start_at(rm))
            ) as s(stage, due)
            where rm.is_settled = false and rm.closed_at is null and rm.played_time is not null
              and s.due <= now() and s.due > now() - v_window
        loop
            perform public.notify_users(array[r.user_id], 'invite_reminder', r.room_id, null, null,
                jsonb_build_object('stage', r.stage), format('invite_reminder:%s:%s', r.room_id, r.stage));
        end loop;
    exception when others then raise warning 'notification job J1/J2 failed: %', sqlerrm; end;

    -- J3 초대 만료 → 호스트. 응답하지 않은 초대는 status를 바꾸지 않고 시간으로 만료된다(0094)
    begin
        for r in
            select rm.id as room_id, rm.host_user_id, m.user_id as invitee, u.name as invitee_name
            from public.match_rooms rm
            join public.match_room_members m on m.room_id = rm.id and m.status = 'invited'
            join public.users u on u.id = m.user_id
            where public.room_end_at(rm) <= now() and public.room_end_at(rm) > now() - v_window
        loop
            perform public.notify_users(array[r.host_user_id], 'invite_expired', r.room_id, null, null,
                jsonb_build_object('inviteeName', r.invitee_name), format('invite_expired:%s:%s', r.room_id, r.invitee));
        end loop;
    exception when others then raise warning 'notification job J3 failed: %', sqlerrm; end;

    -- J4 경기 전날 20:00 KST — 참가자 전원(호스트 포함, actor null이라 아무도 빠지지 않는다)
    begin
        for r in
            select rm.id as room_id
            from public.match_rooms rm
            where rm.is_settled = false and rm.closed_at is null
              and ((rm.played_at - 1) + time '20:00') at time zone 'Asia/Seoul' <= now()
              and ((rm.played_at - 1) + time '20:00') at time zone 'Asia/Seoul' > now() - v_window
        loop
            perform public.notify_users(public.room_joined_user_ids(r.room_id), 'room_tomorrow', r.room_id, null, null,
                '{}'::jsonb, format('room_tomorrow:%s', r.room_id));
        end loop;
    exception when others then raise warning 'notification job J4 failed: %', sqlerrm; end;

    -- J5 결과 미입력 — 종료 + 3h, 대표 게임 중 스코어도 제안도 없는 것. 상호 확인 게임은 좌석 전원, 자유 기록은 소유자
    begin
        for r in
            select pm.id as game_id, rm.id as room_id, req.id as request_id, pm.user_id as owner_id
            from public.match_rooms rm
            join public.personal_matches pm on pm.room_id = rm.id and not pm.is_perspective and jsonb_array_length(pm.set_scores) = 0
            left join public.match_requests req on req.id = pm.source_request_id
            left join public.match_result_negotiations neg on neg.request_id = req.id
            where rm.is_settled = false and rm.closed_at is null
              and coalesce(neg.result_status, 'none') = 'none'
              and public.room_end_at(rm) + interval '3 hours' <= now()
              and public.room_end_at(rm) + interval '3 hours' > now() - v_window
        loop
            v_seats := case when r.request_id is not null then public.request_result_seats(r.request_id) else array[r.owner_id] end;
            perform public.notify_users(v_seats, 'result_missing', r.room_id, r.request_id, null,
                '{}'::jsonb, format('result_missing:%s', r.game_id));
        end loop;
    exception when others then raise warning 'notification job J5 failed: %', sqlerrm; end;

    -- J6 자동 확정 12시간 전 — 아직 확인하지 않은 좌석에게. deadline = max(제안 시각, 매칭 종료) + 24h(방 밖은 제안 + 24h)
    begin
        for r in
            select neg.request_id, req.room_id, neg.confirmed_by,
                   greatest(neg.proposed_at, coalesce(public.room_end_at(rm), neg.proposed_at)) + interval '24 hours' as deadline,
                   extract(epoch from neg.proposed_at)::bigint as proposed_epoch
            from public.match_result_negotiations neg
            join public.match_requests req on req.id = neg.request_id
            left join public.match_rooms rm on rm.id = req.room_id
            where neg.result_status = 'proposed' and neg.proposed_at is not null
        loop
            if r.deadline - interval '12 hours' <= now() and r.deadline - interval '12 hours' > now() - v_window then
                select coalesce(array_agg(u), '{}'::uuid[]) into v_pending
                from unnest(public.request_result_seats(r.request_id)) as t(u)
                where not (u = any(coalesce(r.confirmed_by, '{}'::uuid[])));
                perform public.notify_users(v_pending, 'auto_confirm_reminder', r.room_id, r.request_id, null,
                    jsonb_build_object('deadlineAt', r.deadline), format('auto_confirm_reminder:%s:%s', r.request_id, r.proposed_epoch));
            end if;
        end loop;
    exception when others then raise warning 'notification job J6 failed: %', sqlerrm; end;

    -- J7 자동 확정 — 유효창 없음. 행마다 격리해 한 게임의 실패(좌석 0·관점 행 결손)가 다른 게임을 막지 않게 한다
    for r in
        select neg.request_id,
               greatest(neg.proposed_at, coalesce(public.room_end_at(rm), neg.proposed_at)) + interval '24 hours' as deadline
        from public.match_result_negotiations neg
        join public.match_requests req on req.id = neg.request_id
        left join public.match_rooms rm on rm.id = req.room_id
        where neg.result_status = 'proposed' and neg.proposed_at is not null
    loop
        if r.deadline > now() then continue; end if;
        begin
            perform 1 from public.match_result_negotiations where request_id = r.request_id and result_status = 'proposed' for update skip locked;
            if not found then continue; end if;
            v_seats := public.request_result_seats(r.request_id);
            if cardinality(v_seats) = 0 then continue; end if;
            -- confirmed_by만 바꾸면 0060의 BEFORE 트리거가 초기화하지 않는다(제안 시각·제안자·스코어가 그대로)
            update public.match_result_negotiations set confirmed_by = v_seats where request_id = r.request_id;
            perform public.settle_match_result(r.request_id);   -- → 0094 T2가 result_auto_confirmed(actor null)
        exception when others then raise warning 'auto confirm % failed: %', r.request_id, sqlerrm; end;
    end loop;

    -- J8 이의 뒤 24시간 재입력 없음 → 제안자
    begin
        for r in
            select neg.request_id, req.room_id, neg.proposed_by, neg.dispute_count, neg.dispute_reason
            from public.match_result_negotiations neg
            join public.match_requests req on req.id = neg.request_id
            where neg.result_status = 'disputed' and neg.disputed_at is not null
              and neg.disputed_at + interval '24 hours' <= now() and neg.disputed_at + interval '24 hours' > now() - v_window
        loop
            perform public.notify_users(array[r.proposed_by], 'reentry_reminder', r.room_id, r.request_id, null,
                jsonb_strip_nulls(jsonb_build_object('disputeReason', r.dispute_reason)),
                format('reentry_reminder:%s:%s', r.request_id, r.dispute_count));
        end loop;
    exception when others then raise warning 'notification job J8 failed: %', sqlerrm; end;
end;
$$;

-- 읽은 알림은 30일 뒤 정리(안 읽은 것은 남긴다)
create or replace function public.cleanup_notifications()
returns integer
language plpgsql volatile security definer
set search_path = public
as $$
declare v_count integer;
begin
    delete from public.notifications where read_at is not null and read_at < now() - interval '30 days';
    get diagnostics v_count = row_count;
    return v_count;
end;
$$;
revoke all on function public.run_notification_jobs() from public, anon, authenticated;
revoke all on function public.cleanup_notifications() from public, anon, authenticated;

-- ─── 등록 — cron.job은 데이터 행이라 히스토리 재생·재적용에서 중복된다 → 같은 이름을 먼저 지운다 ───
select cron.unschedule(jobid) from cron.job where jobname in ('notification_jobs', 'notification_cleanup');
select cron.schedule('notification_jobs', '*/10 * * * *', $$select public.run_notification_jobs()$$);
select cron.schedule('notification_cleanup', '10 18 * * *', $$select public.cleanup_notifications()$$);   -- 03:10 KST
