-- 0081 — 이메일 사용 여부 RPC (Week 52)
--
-- 0080의 `is_nickname_taken`과 같은 구조다. 브라우저에서 직접 조회할 수 없는 이유도 같다 —
-- 가입 화면의 방문자는 `anon`이고 `users_select` 정책은 `authenticated` 전용이라
-- 직접 select가 에러가 아니라 **빈 결과**로 돌아와 "어떤 이메일이든 사용 가능"이라 거짓말을 한다.
--
-- ⚠ **`public.users`가 아니라 `auth.users`를 본다.** 둘이 갈리는 자리가 실제로 있다 —
--    탈퇴(`deleteAccountAction`)는 `public.users.email`을 `deleted+{id}@deleted.local`로 덮지만
--    **`auth.users` 행은 그대로 남긴다.** 즉 탈퇴한 사람의 이메일로는 재가입이 되지 않는데,
--    public.users만 보면 "사용 가능"이라 말한 뒤 제출에서 막히게 된다.
--    "가입할 수 있나"의 권위는 `auth.users.email`이므로 그쪽을 본다.
--
-- ⚠ **이 함수는 의도적으로 user enumeration을 연다.** 닉네임(0080)과 달리 이메일은
--    바깥으로 새면 스팸·피싱 표적화에 쓰이는 값이고, Supabase가 가입 응답을 난독화하는 것도
--    바로 그 열거를 막기 위해서다. 그럼에도 "제출하고 나서야 알게 되는" 가입 경험을 택하지 않기로
--    결정했고(사용자 요청, Week 52), 그 대가를 여기 적어 둔다. 시도 제한은 없다.
--    ⇒ 되돌리려면 이 함수의 anon EXECUTE를 회수하고 폼의 실시간 검사를 떼면 된다
--      (제출 시점의 `mapAuthError` 경로는 그대로 남아 있다).

create or replace function public.is_email_taken(p_email text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from auth.users u
    where lower(btrim(u.email)) = lower(btrim(p_email))
  );
$$;

comment on function public.is_email_taken(text) is
  '이메일이 이미 가입에 쓰였는지 판정한다(0081). auth.users를 보는 이유는 탈퇴 시 public.users.email만 치환되고 auth 행은 남아 재가입이 막히기 때문이다. 회원가입 폼에서 쓰이므로 anon EXECUTE를 허용한다 — 의도적으로 user enumeration을 여는 선택이다.';

revoke all on function public.is_email_taken(text) from public;
grant execute on function public.is_email_taken(text) to anon, authenticated;

-- ⚠ **이름에 숫자 금지는 DB 제약으로 걸지 않았다.** 앱(`validateName`)에서만 막는다.
--    `check (name !~ '[0-9]') not valid`를 시도했다가 롤백 스모크에서 되돌렸다 —
--    `not valid`는 초기 전수 검사만 건너뛸 뿐 **기존 행의 UPDATE도 그대로 검사한다.**
--    적용 시점 53명 중 **52명의 이름에 숫자가 있어**(`남자13`·`여자17` — 개발·E2E 계정),
--    그 계정들이 프로필 설정에서 **닉네임만 바꿔도 저장이 실패**하게 된다.
--    0072가 "가드를 넣을 때 노출 조건을 함께 보라"고 적은 것의 또 다른 얼굴이다 —
--    이번엔 INSERT만 보고 **UPDATE 경로를 빠뜨릴 뻔했다.**
--
--    이름을 쓰는 경로는 `handle_new_user`(가입)와 `deleteAccountAction`('탈퇴한 회원') 둘뿐이고
--    이름은 가입 후 변경 불가라, 앱 가드만으로도 실질 방어는 된다.
--    개발 계정을 정리한 뒤에는 아래 두 줄로 승격할 수 있다:
--      alter table public.users add constraint users_name_no_digit check (name !~ '[0-9]') not valid;
--      alter table public.users validate constraint users_name_no_digit;
