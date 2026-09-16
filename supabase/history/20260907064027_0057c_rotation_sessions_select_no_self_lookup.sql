-- 20260907064027 0057c_rotation_sessions_select_no_self_lookup
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
-- 0057 보정: rotation_sessions_select가 자기 테이블을 되읽지 않게 한다.
--
-- 증상: 로테이션 세션 저장이 42501(new row violates row-level security policy)로 실패.
-- 원인: INSERT ... RETURNING은 반환 행에 **SELECT 정책**을 적용하는데, 0057이 그 정책을
--       `is_rotation_session_party(id)`(STABLE · rotation_sessions를 다시 조회)로 바꿨다.
--       STABLE 함수는 문장 시작 시점 스냅샷을 쓰므로 **그 문장이 방금 삽입한 행이 보이지 않는다.**
--       종전 정책은 반환 행의 컬럼을 직접 비교해서 조회가 필요 없었다.
-- 해결: 소유자·방 분기는 컬럼 비교로 되돌리고, 좌석 분기만 정의자 헬퍼로 둔다.
--       그 헬퍼는 rotation_session_participants만 읽으므로 자기 참조가 없고 재귀도 없다
--       (참가자 테이블 정책은 종전대로 is_rotation_session_party를 쓴다 — 그쪽은 정의자 함수라
--        rotation_sessions의 RLS를 우회하고, 참가자 행은 RETURNING으로 만들어지지 않는다).

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

drop policy if exists rotation_sessions_select on public.rotation_sessions;
create policy rotation_sessions_select on public.rotation_sessions
  for select using (
    user_id = auth.uid()
    or (room_id is not null and public.is_room_participant(room_id))
    or public.is_rotation_session_seat(id)
  );
