-- 20260615061908 personal_match_doubles_details
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
alter table public.personal_matches
  add column partner_ntrp numeric
    check (partner_ntrp is null or (partner_ntrp >= 1.0 and partner_ntrp <= 7.0)),
  add column opponent2_ntrp numeric
    check (opponent2_ntrp is null or (opponent2_ntrp >= 1.0 and opponent2_ntrp <= 7.0)),
  add column my_ad_player text
    check (my_ad_player in ('me', 'partner')),
  add column opponent_ad_player text
    check (opponent_ad_player in ('opponent', 'opponent2'));
