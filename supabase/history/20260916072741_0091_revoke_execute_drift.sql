-- 20260916072741 0091_revoke_execute_drift
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
revoke execute on function public.cleanup_match_room_on_personal_match_delete() from public, anon, authenticated;
revoke execute on function public.cleanup_match_room_on_request_close() from public, anon, authenticated;
revoke execute on function public.sync_match_room_from_personal_match() from public, anon, authenticated;
revoke execute on function public.update_match_room_password(uuid, text) from anon;
