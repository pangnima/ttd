-- 20260527021443 0014_personal_matches
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
CREATE TABLE personal_matches (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  opponent_name text NOT NULL,
  played_at     date NOT NULL,
  match_type    text NOT NULL CHECK (match_type IN ('singles','men_doubles','women_doubles','mixed_doubles')),
  surface       text CHECK (surface IN ('hard','clay','indoor','omni')),
  set_scores    jsonb NOT NULL DEFAULT '[]'::jsonb,
  winner        text NOT NULL CHECK (winner IN ('me','opponent','draw')),
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX personal_matches_user_played ON personal_matches (user_id, played_at DESC);

ALTER TABLE personal_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "personal_matches_select" ON personal_matches
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "personal_matches_insert" ON personal_matches
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "personal_matches_update" ON personal_matches
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "personal_matches_delete" ON personal_matches
  FOR DELETE USING (user_id = auth.uid());
