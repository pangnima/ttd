-- 20260914083926 0083b_room_close_cleanup_guard
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
-- 0083 §7 — 닫힌 방은 마지막 자유 기록을 지워도 사라지지 않는다 (정본: 0083_room_close.sql §7)
create or replace function public.cleanup_match_room_on_personal_match_delete()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if exists (select 1 from match_rooms r where r.id = old.room_id and r.closed_at is not null) then
    raise exception 'room_closed';
  end if;
  if exists (select 1 from personal_matches where room_id = old.room_id and id <> old.id)
     or exists (select 1 from rotation_sessions where room_id = old.room_id)
     or exists (select 1 from match_requests where room_id = old.room_id) then
    return null;
  end if;
  delete from match_rooms where id = old.room_id and host_user_id = old.user_id;
  return null;
end;
$$;
