-- 20260527021449 0015_ai_coaching_cache
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
CREATE TABLE ai_coaching_cache (
  user_id      uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  bundle_hash  text NOT NULL,
  content      jsonb NOT NULL,
  model        text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_coaching_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_coaching_cache_select" ON ai_coaching_cache
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "ai_coaching_cache_upsert" ON ai_coaching_cache
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
