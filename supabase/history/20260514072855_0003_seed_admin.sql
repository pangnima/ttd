-- 20260514072855 0003_seed_admin
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16

DO $$
DECLARE
  v_admin_id uuid := gen_random_uuid();
BEGIN
  -- auth.users에 admin 계정 생성 (트리거가 public.users row 자동 생성)
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    raw_app_meta_data,
    is_super_admin,
    created_at,
    updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_admin_id,
    'authenticated',
    'authenticated',
    'admin@tennis-club.com',
    crypt('admin123!@#', gen_salt('bf')),
    now(),
    '{"name":"장관우","nickname":"관우"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    false,
    now(),
    now()
  );

  -- auth.identities 연결 (이메일 로그인용)
  INSERT INTO auth.identities (
    id,
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    'admin@tennis-club.com',
    v_admin_id,
    jsonb_build_object('sub', v_admin_id::text, 'email', 'admin@tennis-club.com'),
    'email',
    now(),
    now(),
    now()
  );

  -- 트리거가 생성한 public.users row를 admin 프로필로 승격
  UPDATE public.users
  SET
    role          = 'admin',
    name          = '장관우',
    nickname      = '관우',
    phone         = '010-9000-0000',
    gender        = 'male',
    dominant_hand = 'right',
    ntrp          = 5.0,
    tennis_start_date = '2010-03-01'
  WHERE id = v_admin_id;
END;
$$;

