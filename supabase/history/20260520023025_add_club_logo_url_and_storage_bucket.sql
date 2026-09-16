-- 20260520023025 add_club_logo_url_and_storage_bucket
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16

-- 1. clubs 테이블에 logo_url 컬럼 추가
ALTER TABLE public.clubs ADD COLUMN logo_url text;

-- 2. club-logos 버킷 생성 (public, 5MB 제한)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('club-logos', 'club-logos', true, 5242880)
ON CONFLICT (id) DO NOTHING;

-- 3. RLS: public SELECT
CREATE POLICY "club-logos public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'club-logos');

-- 4. RLS: 로그인 사용자 INSERT
CREATE POLICY "club-logos authenticated insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'club-logos' AND auth.role() = 'authenticated');

-- 5. RLS: 로그인 사용자 UPDATE
CREATE POLICY "club-logos authenticated update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'club-logos' AND auth.role() = 'authenticated');

-- 6. RLS: 로그인 사용자 DELETE
CREATE POLICY "club-logos authenticated delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'club-logos' AND auth.role() = 'authenticated');

