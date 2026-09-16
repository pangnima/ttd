-- 20260915045705 0085_login_id
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
-- 0085 — 로그인 아이디 (Week 60). 전문·배경은 supabase/migrations/0085_login_id.sql.

alter table public.users add column if not exists login_id text;

alter table public.users
  add constraint users_login_id_check
  check (login_id is null or login_id ~ '^[a-z0-9_]{4,20}$');

create unique index if not exists users_login_id_unique_idx
  on public.users (login_id)
  where deleted_at is null and login_id is not null;

comment on column public.users.login_id is
  '로그인 아이디(0085). 영문 소문자·숫자·_ 4~20자, 가입 시 1회 입력 후 변경 불가(앱 가드). null이면 이메일로만 로그인한다(기존 회원·소셜 가입자). 유일성은 users_login_id_unique_idx(탈퇴 행 제외).';

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
  -- (0084) provider가 이메일을 주지 않으면 id 기반 폴백 — NOT NULL에 걸려 로그인이 롤백되지 않게
  v_email := coalesce(nullif(btrim(new.email), ''), new.id::text || '@no-email.local');

  -- 이름: 우리 가입 폼(name) → provider(full_name) → 이메일 앞부분. 20자 clamp(0079).
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

  if char_length(v_name) < 1 then v_name := '회원'; end if;
  if char_length(v_nickname) < 2 then
    v_nickname := '회원' || substr(replace(new.id::text, '-', ''), 1, 6);
  end if;

  -- 폴백 닉네임만 중복 회피 — 사용자가 직접 적어 보낸 닉네임은 개명하지 않는다(0079)
  if not v_nickname_given and exists (
    select 1 from public.users u
    where lower(btrim(u.nickname)) = lower(v_nickname) and u.deleted_at is null
  ) then
    v_nickname := left(v_nickname, 13) || '-' || substr(replace(new.id::text, '-', ''), 1, 6);
  end if;

  insert into public.users (
    id, email, name, nickname, role,
    phone, gender, dominant_hand, tennis_start_date, profile_image, ntrp,
    racket_brand, racket_model,
    login_id
  ) values (
    new.id, v_email, v_name, v_nickname, 'member',
    nullif(btrim(new.raw_user_meta_data->>'phone'), ''),
    new.raw_user_meta_data->>'gender',
    new.raw_user_meta_data->>'dominant_hand',
    case when new.raw_user_meta_data->>'tennis_start_date' is not null
          and new.raw_user_meta_data->>'tennis_start_date' != ''
         then (new.raw_user_meta_data->>'tennis_start_date')::date else null end,
    coalesce(
      nullif(btrim(new.raw_user_meta_data->>'profile_image'), ''),
      nullif(btrim(new.raw_user_meta_data->>'avatar_url'), ''),
      nullif(btrim(new.raw_user_meta_data->>'picture'), '')
    ),
    nullif(new.raw_user_meta_data->>'ntrp', '')::numeric,
    left(nullif(trim(new.raw_user_meta_data->>'racket_brand'), ''), 30),
    left(nullif(trim(new.raw_user_meta_data->>'racket_model'), ''), 40),
    -- (0085) 소문자 정규화 — 앱도 같은 정규화를 하지만 CHECK가 소문자만 받으므로 여기서도 맞춘다
    lower(nullif(btrim(new.raw_user_meta_data->>'login_id'), ''))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

comment on function public.handle_new_user() is
  'auth.users INSERT → public.users 행 생성. 0079의 길이 clamp·닉네임 중복 회피 + 0084의 OAuth 대비(이메일 폴백·ntrp 기본값 제거·provider 프로필 매핑) + 0085의 login_id(소문자 정규화). ntrp is null = 테니스 정보 미입력(소셜 가입자)';

create or replace function public.is_login_id_taken(p_login_id text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.login_id = lower(btrim(p_login_id))
      and u.deleted_at is null
  );
$$;

comment on function public.is_login_id_taken(text) is
  '아이디가 이미 쓰이는지 판정한다(0085). users_login_id_unique_idx와 같은 표현식·같은 집합(탈퇴 행 제외)을 봐야 화면과 저장이 갈리지 않는다. 회원가입 폼에서 쓰이므로 anon EXECUTE를 허용한다.';

revoke all on function public.is_login_id_taken(text) from public;
grant execute on function public.is_login_id_taken(text) to anon, authenticated;

create or replace function public.resolve_login_email(p_login_id text)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select a.email
  from public.users u
  join auth.users a on a.id = u.id
  where u.login_id = lower(btrim(p_login_id))
    and u.deleted_at is null
  limit 1;
$$;

comment on function public.resolve_login_email(text) is
  '로그인 아이디를 auth.users.email로 해석한다(0085). loginAction이 서버 액션 안에서만 부른다 — 응답의 이메일은 브라우저에 실리지 않는다. ⚠ anon EXECUTE를 허용해 아이디→이메일 열거를 연다(대가와 되돌리는 법은 0085 머리말).';

revoke all on function public.resolve_login_email(text) from public;
grant execute on function public.resolve_login_email(text) to anon, authenticated;
