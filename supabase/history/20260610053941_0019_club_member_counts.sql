-- 20260610053941 0019_club_member_counts
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
create or replace function public.get_club_member_counts(p_club_ids uuid[])
returns table(club_id uuid, regular integer, guest integer)
language sql
security definer
set search_path = public
as $$
  select cm.club_id,
         count(*) filter (where not coalesce(u.is_guest, false))::int as regular,
         count(*) filter (where coalesce(u.is_guest, false))::int      as guest
  from public.club_members cm
  join public.users u on u.id = cm.user_id
  where cm.club_id = any(p_club_ids)
    and cm.status = 'approved'
  group by cm.club_id;
$$;

revoke all on function public.get_club_member_counts(uuid[]) from public;
grant execute on function public.get_club_member_counts(uuid[]) to authenticated;
