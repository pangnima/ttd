-- 20260907071604 0058c_seat_default_from_rotation_plan
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
-- 0058 §4 — '세션 수락 = 게임 참여 동의'를 좌석 기본값에서도 성립시킨다.
--
-- 0057은 이 규칙을 finalize의 v_immediate(게임 전체가 전원 수락일 때)로만 구현했다. 그래서
-- 한 명이라도 미응답이면 그 게임은 pending으로 가고, **이미 일정을 수락해 둔 사람의 좌석까지**
-- pending으로 시작해 다시 물어보게 된다. 0058이 재초대를 열면서 이 순서가 흔해진다.
-- 좌석 기본값을 세션 수락에서 파생시키면 규칙이 한 곳(트리거)에 모인다.
create or replace function public.default_participation_status()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.participation_status = 'pending'
     and (
       -- 비회원·게스트·탈퇴자는 수락 대상이 아니다
       not public.is_active_member(new.user_id)
       -- 방 안 경로: 요청이 이미 accepted로 태어난다(입장이 곧 동의)
       or exists (select 1 from match_requests r
                  where r.id = new.request_id and r.status <> 'pending')
       -- 로테이션 일정을 이미 수락한 사람 (0058) — 세션 수락이 게임 참여 동의를 대신한다
       or exists (select 1 from match_requests r
                  join rotation_session_participants p
                    on p.session_id = r.rotation_session_id and p.user_id = new.user_id
                  where r.id = new.request_id and p.participation_status = 'accepted')
     )
  then
    new.participation_status := 'accepted';
    new.responded_at := now();
  end if;
  return new;
end;
$$;

revoke all on function public.default_participation_status() from public, anon, authenticated;
