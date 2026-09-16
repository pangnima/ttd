-- 20260914100355 0084_handle_new_user_oauth
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_name text;
  v_nickname text;
  v_nickname_given boolean;
begin
  -- (a) 이메일이 없는 provider를 대비한 폴백. users.email이 NOT NULL이고 이 트리거는
  --     auth.users INSERT와 같은 트랜잭션이라, 여기서 터지면 로그인 자체가 롤백된다.
  v_email := coalesce(nullif(btrim(new.email), ''), new.id::text || '@no-email.local');

  v_name := left(coalesce(
    nullif(btrim(new.raw_user_meta_data->>'name'), ''),
    nullif(btrim(new.raw_user_meta_data->>'full_name'), ''),
    split_part(v_email, '@', 1)
  ), 20);

  v_nickname_given := nullif(btrim(new.raw_user_meta_data->>'nickname'), '') is not null;
  v_nickname := left(coalesce(
    nullif(btrim(new.raw_user_meta_data->>'nickname'), ''),
    split_part(v_email, '@', 1)
  ), 20);

  if char_length(v_name) < 1 then
    v_name := '회원';
  end if;
  if char_length(v_nickname) < 2 then
    v_nickname := '회원' || substr(replace(new.id::text, '-', ''), 1, 6);
  end if;

  if not v_nickname_given and exists (
    select 1 from public.users u
    where lower(btrim(u.nickname)) = lower(v_nickname) and u.deleted_at is null
  ) then
    v_nickname := left(v_nickname, 13) || '-' || substr(replace(new.id::text, '-', ''), 1, 6);
  end if;

  insert into public.users (
    id, email, name, nickname, role,
    phone, gender, dominant_hand, tennis_start_date, profile_image, ntrp,
    racket_brand, racket_model
  )
  values (
    new.id,
    v_email,
    v_name,
    v_nickname,
    'member',
    nullif(btrim(new.raw_user_meta_data->>'phone'), ''),
    new.raw_user_meta_data->>'gender',
    new.raw_user_meta_data->>'dominant_hand',
    case
      when new.raw_user_meta_data->>'tennis_start_date' is not null
        and new.raw_user_meta_data->>'tennis_start_date' != ''
      then (new.raw_user_meta_data->>'tennis_start_date')::date
      else null
    end,
    coalesce(
      nullif(btrim(new.raw_user_meta_data->>'profile_image'), ''),
      nullif(btrim(new.raw_user_meta_data->>'avatar_url'), ''),
      nullif(btrim(new.raw_user_meta_data->>'picture'), '')
    ),
    -- (b) 기본값 3.0 제거 — null이 곧 "테니스 정보 미입력"이다
    nullif(new.raw_user_meta_data->>'ntrp', '')::numeric,
    left(nullif(trim(new.raw_user_meta_data->>'racket_brand'), ''), 30),
    left(nullif(trim(new.raw_user_meta_data->>'racket_model'), ''), 40)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

comment on function public.handle_new_user() is
  'auth.users INSERT -> public.users 행 생성. 0079의 길이 clamp/닉네임 중복 회피 + 0084의 OAuth 대비(이메일 폴백/ntrp 기본값 제거/provider 프로필 매핑). ntrp is null = 테니스 정보 미입력(소셜 가입자)';
