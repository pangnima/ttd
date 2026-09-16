-- 20260514232432 0008_fix_seed_admin_null_tokens
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
-- auth.users에 직접 INSERT된 admin 시드 계정의 NULL 토큰 컬럼 수정
-- GoTrue(Auth)는 이 컬럼들이 빈 문자열('')이어야 로그인 처리 가능
UPDATE auth.users
SET
  confirmation_token       = COALESCE(confirmation_token, ''),
  recovery_token           = COALESCE(recovery_token, ''),
  email_change_token_new   = COALESCE(email_change_token_new, ''),
  email_change             = COALESCE(email_change, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  phone_change             = COALESCE(phone_change, ''),
  phone_change_token       = COALESCE(phone_change_token, ''),
  reauthentication_token   = COALESCE(reauthentication_token, '')
WHERE email = 'admin@tennis-club.com';

