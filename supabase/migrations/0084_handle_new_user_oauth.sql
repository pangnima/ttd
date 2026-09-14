-- 0084 — handle_new_user를 OAuth 가입에도 견디게 한다 (소셜 로그인 전제 조건)
--
-- 소셜 로그인의 어려운 부분은 배선이 아니라 **빈 프로필**이다(docs/social-login.md §2).
-- 이 앱의 가입 폼은 계정 정보만이 아니라 NTRP·성별·주력손을 함께 받는데, OAuth는 그 폼을
-- 통째로 건너뛴다. 그런데 `updateProfileAction`은 "가입 시 1회 입력, 변경 불가" 정책으로
-- 그 컬럼들을 update에서 빼므로, 트리거가 기본값을 박아 두면 **본인도 영영 고칠 수 없다**.
--
-- 그래서 바꿀 것은 셋이다.
--
-- (a) **email 폴백** — `public.users.email`은 NOT NULL인데 provider가 이메일을 주지 않을 수
--     있다(카카오는 비즈 앱 전환 전까지 `account_email`을 요청할 수 없고, Supabase의
--     "Allow users without an email"을 켜면 이메일 없는 계정이 생긴다). 이 트리거는
--     `auth.users` INSERT와 **같은 트랜잭션**이라 여기서 NOT NULL에 걸리면 로그인 자체가
--     `Database error saving new user`라는 불투명한 메시지로 롤백된다.
--     폴백에 `new.id`가 들어가므로 값이 충돌할 일은 없다(`users.email`에는 UNIQUE가 없다 —
--     유일성의 권위는 `auth.users`가 쥔다).
--
-- (b) **ntrp 기본값 3.0 제거** — 종전에는 메타데이터에 ntrp가 없으면 3.0을 박았다. NTRP는
--     레이팅·티어·통계의 입력값이라 고른 적 없는 값이 박히는 것은 데이터 오염이고, 나중에
--     그 회원이 진짜 3.0이었는지 알 방법이 없다. 이제 **`ntrp is null`이 "테니스 정보 미입력"의
--     권위 술어**가 되고, 앱은 그 술어로 완성 화면(`/onboarding/profile`)으로 보낸다.
--     ⚠ 이메일 가입 경로는 영향이 없다 — `signupAction`이 `isSignupNtrp`로 NTRP를 필수 검증해
--     메타데이터에 언제나 값이 실린다. 적용 시점의 기존 54명도 `ntrp is null`이 0건이다.
--
-- (c) **provider 프로필 매핑** — 이름은 `name`→`full_name`, 사진은 `profile_image`(우리 가입
--     경로)→`avatar_url`→`picture` 순으로 본다. provider가 `raw_user_meta_data`에 어떤 키를
--     넣는지는 공식 문서에 없으므로 한 키에 걸지 않고 coalesce 사슬로 받는다.
--
-- 나머지(닉네임 폴백의 길이 clamp·중복 회피, phone의 nullif)는 0079가 넣은 것을 **그대로**
-- 옮겨 적는다. 0079 이전 정의를 복사하면 연락처 미입력이 빈 문자열로 저장되던 버그가 되살아난다.
-- 0075가 `create_room_lineup`에서 겪은 것과 같은 함정이다.
--
-- 성별·주력손은 여전히 nullable이라 OAuth 가입자는 null로 들어온다 — 완성 화면이 채운다.

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
  -- (a) 이메일이 없는 provider를 대비한 폴백. 아래 split_part도 이 값을 본다.
  v_email := coalesce(nullif(btrim(new.email), ''), new.id::text || '@no-email.local');

  v_name := left(coalesce(
    nullif(btrim(new.raw_user_meta_data->>'name'), ''),
    nullif(btrim(new.raw_user_meta_data->>'full_name'), ''),   -- (c) 구글이 쓰는 키
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

  -- 사용자가 직접 적어 보낸 닉네임은 개명하지 않는다 — 그 충돌은 23505로 알릴 일이다(0079).
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
    -- (c) 우리 가입 경로의 키를 먼저 보고, 없으면 provider가 준 사진을 받는다
    coalesce(
      nullif(btrim(new.raw_user_meta_data->>'profile_image'), ''),
      nullif(btrim(new.raw_user_meta_data->>'avatar_url'), ''),
      nullif(btrim(new.raw_user_meta_data->>'picture'), '')
    ),
    -- (b) 기본값 3.0을 걷어낸다 — null이 곧 "아직 안 골랐다"
    nullif(new.raw_user_meta_data->>'ntrp', '')::numeric,
    left(nullif(trim(new.raw_user_meta_data->>'racket_brand'), ''), 30),
    left(nullif(trim(new.raw_user_meta_data->>'racket_model'), ''), 40)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

comment on function public.handle_new_user() is
  'auth.users INSERT → public.users 행 생성. 0079의 길이 clamp·닉네임 중복 회피 + 0084의 OAuth 대비(이메일 폴백·ntrp 기본값 제거·provider 프로필 매핑). ntrp is null = 테니스 정보 미입력(소셜 가입자)';
