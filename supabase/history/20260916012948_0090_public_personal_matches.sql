-- 20260916012948 0090_public_personal_matches
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
create or replace function public.get_public_personal_matches(p_user_id uuid)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select case
    when auth.uid() is null then null
    when not exists (
      select 1 from public.users u
      where u.id = p_user_id and u.deleted_at is null and not coalesce(u.stats_hidden, false)
    ) then '[]'::jsonb
    else coalesce((
      select jsonb_agg(
        to_jsonb(pm) || jsonb_build_object(
          'participants', coalesce((
            select jsonb_agg(to_jsonb(pp) order by pp.role)
            from public.personal_match_participants pp where pp.match_id = pm.id
          ), '[]'::jsonb)
        )
        order by pm.played_at desc, pm.played_time desc nulls last, pm.group_seq asc nulls last
      )
      from public.personal_matches pm
      where pm.user_id = p_user_id and pm.has_result
    ), '[]'::jsonb)
  end;
$$;

revoke all on function public.get_public_personal_matches(uuid) from public, anon;
grant execute on function public.get_public_personal_matches(uuid) to authenticated;
