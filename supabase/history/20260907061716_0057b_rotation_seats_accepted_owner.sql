-- 20260907061716 0057b_rotation_seats_accepted_owner
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
-- 0057 보정: 세션 소유자는 좌석 행이 없으므로 수락자로 센다.
-- 이 조항이 없으면 참가자가 소유자를 넣은 게임이 언제나 미수락으로 떨어진다.
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
