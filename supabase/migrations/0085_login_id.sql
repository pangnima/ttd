-- 0085 — 로그인 아이디 (Week 60)
--
-- 이메일이 곧 로그인 ID였다. 사용자가 "@xxx.com 없이 로그인하고 싶다"고 했고, 이메일의 앞부분을
-- 아이디로 삼는 안은 실데이터에서 이미 충돌한다(`auth.users`의 local-part `dddd`가 2건).
-- 닉네임을 아이디로 삼는 안은 닉네임이 **프로필에서 바꿀 수 있는 공개 표시명**이라 기각했다 —
-- 로그인 크리덴셜의 절반이 화면에 보이고 바뀌는 셈이다. 그래서 별도 컬럼이다.
--
-- 규칙: 영문 소문자·숫자·밑줄 4~20자(`users_login_id_check`), 소문자로 정규화해 저장, 가입 시 1회
-- 입력 후 변경 불가(앱 가드 — 이름과 같은 정책), **nullable**. 기존 55명과 소셜 가입자는 null이고
-- 이메일로 계속 로그인한다. 원하면 프로필 설정에서 1회 설정한다(Week 56의 시작일 null 입력란과
-- 같은 관용구).
--
-- 유일성은 0079 닉네임과 같은 **부분 유니크 인덱스**다 — 탈퇴(`deleteAccountAction`)가 login_id를
-- null로 비우므로 인덱스에서 빠지고, 떠난 사람의 아이디를 다음 사람이 쓸 수 있다.
--
-- 이메일의 역할은 이제 "로그인 ID"가 아니라 **비밀번호 찾기·알림 채널**이다. 그래서 여전히 필수다 —
-- 이메일을 안 받으면(합성 이메일) 비밀번호를 잊은 사람이 막다른 길에 선다.
--
-- ⚠ `resolve_login_email`은 **아이디 → 이메일 열거를 연다.** `is_email_taken`(0081)이 "이 이메일이
--    가입돼 있나"를 열었다면 이쪽은 "이 아이디의 이메일이 무엇인가"를 준다 — 한 단계 더 나간다.
--    그래도 anon EXECUTE를 여는 이유: 로그인 서버 액션도 anon 키로 돌고(service role 없음),
--    `signInWithPassword`에는 이메일이 필요하다. 완화: ① 브라우저에서 직접 부르지 않는다(서버 액션
--    안에서만 소비, 이메일은 응답에 실리지 않는다) ② 아이디가 없어도 로그인 실패 문구는 비밀번호
--    오류와 같다 ③ 아이디는 화면에 노출하지 않는다(닉네임과 분리). curl 우회와 시도 제한 부재는
--    남는다 — 프로젝트 전반의 미해결 항목(백로그 "보안·성능")과 같은 뿌리.
--    되돌리려면 이 함수의 anon EXECUTE를 회수하고 로그인 폼을 이메일 전용으로 되돌리면 된다.
--
-- `handle_new_user`는 0084 본문을 **그대로** 옮겨 적고 login_id 한 줄만 더한다. 0079의 phone
-- `nullif`·닉네임 clamp·0084의 이메일 폴백·ntrp 기본값 제거를 되살리거나 빠뜨리면 안 된다 —
-- 0075·0084가 두 번 경고한 "이전 정의 복사" 함정이다. CHECK·유니크 위반은 `auth.users` INSERT와
-- 같은 트랜잭션에서 터져 가입 전체가 `Database error saving new user`로 롤백되므로(0079·0084)
-- **서버 액션이 signUp 전에 `is_login_id_taken`으로 거른다** — 닉네임·이메일과 같은 3중 구조
-- (화면 debounce / 서버 사전 확인 / 인덱스).

-- ── 1. 컬럼 · CHECK · 부분 유니크 ────────────────────────────────────────────

alter table public.users add column if not exists login_id text;

alter table public.users
  add constraint users_login_id_check
  check (login_id is null or login_id ~ '^[a-z0-9_]{4,20}$');

create unique index if not exists users_login_id_unique_idx
  on public.users (login_id)
  where deleted_at is null and login_id is not null;

comment on column public.users.login_id is
  '로그인 아이디(0085). 영문 소문자·숫자·_ 4~20자, 가입 시 1회 입력 후 변경 불가(앱 가드). null이면 이메일로만 로그인한다(기존 회원·소셜 가입자). 유일성은 users_login_id_unique_idx(탈퇴 행 제외).';

-- ── 2. handle_new_user — 0084 본문 + login_id ───────────────────────────────

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

-- ── 3. 가입 화면용 판정 — is_nickname_taken(0080)과 같은 모양 ───────────────

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

-- ── 4. 로그인용 해석 — 아이디 → 이메일 ──────────────────────────────────────

create or replace function public.resolve_login_email(p_login_id text)
returns text
language sql
security definer
stable
set search_path = public
as $$
  -- 권위는 auth.users.email이다(0081과 같은 이유 — public.users.email은 탈퇴 시 치환된다).
  -- 탈퇴 행은 login_id가 null이지만 deleted_at 조건도 함께 둔다 — 익명화가 login_id를 빠뜨려도 새지 않게.
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
