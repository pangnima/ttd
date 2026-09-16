-- 20260617012214 clubs_select_owner
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
alter policy clubs_select on public.clubs
  using (
    is_public = true
    or owner_id = auth.uid()
    or is_club_approved_member(id, auth.uid())
  );
