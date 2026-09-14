-- 0080 — 닉네임 사용 여부를 묻는 RPC (Week 52)
--
-- 0079가 닉네임 유일성을 부분 유니크 인덱스로 고정했다. 남은 것은 **화면이 제출 전에 알려 주는 일**인데,
-- 그것을 브라우저에서 `select ... from users`로 할 수 없다. 이유가 둘이다.
--
--   ① **가입 화면의 방문자는 `anon`이다.** `users_select` 정책은 `authenticated` 전용(`using true`)이라
--      anon의 조회는 에러가 아니라 **빈 결과**로 돌아온다 → 화면은 어떤 닉네임이든 "사용 가능"이라
--      거짓말을 하고, 제출하고 나서야 23505를 만난다. 조용히 틀리는 종류의 고장이다.
--   ② 정책을 열어 anon에게 users를 통째로 읽히는 것은 훨씬 큰 문을 여는 일이다. 필요한 것은
--      "이 닉네임이 쓰이고 있나"라는 **boolean 하나**지 회원 목록이 아니다.
--
-- 그래서 SECURITY DEFINER 함수로 **판정만** 돌려준다. 반환이 boolean이라 행도 id도 새지 않는다.
--
-- ⚠ `anon`에게 EXECUTE를 **준다**. 이 레포의 기본 규칙("새 RPC는 anon EXECUTE 회수")의 예외이고,
--    예외인 이유는 이 함수가 쓰이는 자리가 로그인 이전(회원가입 폼)이기 때문이다.
--    대가로 "특정 닉네임의 사용 여부"는 공개 정보가 된다 — 닉네임은 이 앱에서 서로에게 보이는 값이고,
--    이메일과 달리 계정 열거의 발판이 되지 않는다. 시도 제한은 없다(프로젝트 전반의 미해결 항목과 같다).
--
-- ⚠ 조건식을 `lower(btrim(...))`로 쓰는 것이 중요하다 — 0079의 인덱스가 **표현식 인덱스**라
--    같은 표현식으로 물어야 인덱스를 탄다. 그리고 무엇보다 **인덱스가 판정하는 것과 같은 집합**을 봐야
--    "화면은 된다는데 저장이 안 되는" 어긋남이 생기지 않는다(`deleted_at is null`도 같은 이유).

create or replace function public.is_nickname_taken(
  p_nickname text,
  p_exclude_user_id uuid default null
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where lower(btrim(u.nickname)) = lower(btrim(p_nickname))
      and u.deleted_at is null
      --- 프로필 설정에서 자기 닉네임을 그대로 두고 저장할 때 스스로를 중복이라 말하지 않게 한다.
      and (p_exclude_user_id is null or u.id <> p_exclude_user_id)
  );
$$;

comment on function public.is_nickname_taken(text, uuid) is
  '닉네임이 이미 쓰이고 있는지 판정한다(0080). 0079의 users_nickname_unique_idx와 같은 집합을 본다 — 표현식·deleted_at 조건이 어긋나면 화면과 저장이 갈린다. 회원가입 폼에서 쓰이므로 anon EXECUTE를 허용한다.';

revoke all on function public.is_nickname_taken(text, uuid) from public;
grant execute on function public.is_nickname_taken(text, uuid) to anon, authenticated;
