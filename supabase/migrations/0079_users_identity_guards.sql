-- 0079 — 가입 입력에 제약을 건다: 닉네임 유일성 · 휴대폰 형식 · 이름 길이 (Week 52)
--
-- `public.users`는 이 앱에서 유일하게 **제약 없이 도메인 값을 받는 테이블**로 남아 있었다.
-- 0079 직전 상태를 실제로 조회해 보면 제약은 PK 하나와 CHECK 여섯(gender·dominant_hand·role·
-- personal_ntrp·racket_brand·racket_model)뿐이고 **UNIQUE 인덱스가 하나도 없다**. 그래서
--   · 같은 닉네임으로 몇 명이든 가입할 수 있고,
--   · `010-1` 같은 미완성 번호가 그대로 저장되며(앱에는 하이픈 포맷터만 있고 유효성 판정 함수가 없다),
--   · 이름·닉네임 길이가 무제한이다 — 라켓 필드만 30/40자가 폼·서버·CHECK 3중으로 걸려 있는 것과 대조된다.
--
-- **지금이 제약을 거는 가장 싼 타이밍이다.** 적용 시점의 실데이터는 회원 53명 · 탈퇴자 0명 ·
-- 닉네임 중복 0건 · `phone` 52건 전부 형식 통과(1건 null) · 이름·닉네임 전원 20자 이하다.
-- 그래서 backfill도, 충돌 해소 화면도, `not valid` 우회도 필요 없다. 회원이 수천 명일 때
-- 같은 일을 하려면 중복 정리부터 해야 한다.
--
-- ⚠ **순서가 결정적이다.** 트리거 수정이 `phone` CHECK보다 **먼저** 와야 한다. 아래 2) 참고 —
--   순서를 뒤집으면 연락처를 비운 신규 가입이 전부 롤백된다.
--
-- ⚠ **닉네임은 전역 UNIQUE가 아니라 부분 유니크 인덱스다.** 아래 5) 참고 —
--   전역으로 걸면 두 번째 탈퇴자가 탈퇴에 실패하는데, 탈퇴자가 0명이라 스모크로도 잡히지 않는다.

-- ── 1) handle_new_user — 새 CHECK를 만족하는 값만 넣도록 방어를 보강한다 ──────────────
--
-- 제약을 걸 때는 **그 컬럼에 값을 넣는 모든 경로**를 함께 봐야 한다(0072가 "서버 가드를 넣을 때
-- 노출 조건을 함께 보라"고 적은 것의 DB판이다). `users` 행을 만드는 경로는 이 트리거 하나뿐이고,
-- 트리거는 `auth.users` INSERT와 **같은 트랜잭션**이라 여기서 CHECK에 걸리면 가입 자체가
-- 불투명한 에러로 롤백된다(0035 머리말). 그래서 CHECK를 걸기 전에 트리거를 먼저 고친다.
--
-- 바꾸는 것은 셋이다.
--   (a) `phone`에 `nullif(trim(...), '')` — 지금은 이 줄에만 nullif가 없어(racket_* 는 쓴다)
--       연락처 미입력 가입이 **null이 아니라 빈 문자열**을 저장한다. 2)의 CHECK는 `''`를 거부하므로
--       이 줄을 고치지 않고 CHECK부터 걸면 연락처를 비운 모든 신규 가입이 실패한다.
--       (앱의 프로필 수정 경로는 이미 `|| null`을 쓰고 있어, 이 수정으로 두 경로의 빈 값 표현이 같아진다.)
--   (b) `name`·`nickname`의 **길이 clamp** — 폴백인 `split_part(email,'@',1)`이 20자를 넘을 수 있다.
--       4)의 CHECK가 생기는 순간 긴 이메일로 가입하면 롤백되므로 `left(..., 20)`으로 자른다.
--   (c) 폴백 닉네임의 **중복 회피** — 메타데이터에 닉네임이 없어 이메일 앞부분을 쓰는 경우에만,
--       이미 쓰이는 닉네임이면 id 조각을 붙인다. **사용자가 직접 적어 보낸 닉네임은 건드리지 않는다** —
--       그 경우의 충돌은 조용히 개명할 일이 아니라 23505로 알려서 앱이 "이미 사용 중"이라 말할 일이다.
--       (c)가 필요한 이유는 5)의 유니크 인덱스 때문이다. 지금은 폼이 언제나 닉네임을 보내지만,
--       대시보드에서 손으로 만든 계정이나 뒤에 붙일 소셜 로그인은 이 폴백을 탄다.
--
-- 그 밖의 줄(특히 `ntrp`의 `coalesce(..., 3.0)`)은 **그대로 둔다** — 소셜 로그인을 붙일 때 함께 볼 몫이다.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_name text;
  v_nickname text;
  v_nickname_given boolean;
begin
  v_name := left(coalesce(
    nullif(btrim(new.raw_user_meta_data->>'name'), ''),
    split_part(new.email, '@', 1)
  ), 20);

  v_nickname_given := nullif(btrim(new.raw_user_meta_data->>'nickname'), '') is not null;
  v_nickname := left(coalesce(
    nullif(btrim(new.raw_user_meta_data->>'nickname'), ''),
    split_part(new.email, '@', 1)
  ), 20);

  --- 폴백으로 만들어진 값이 CHECK(1~20 / 2~20)를 만족하지 못하는 경우의 탈출구.
  --- 여기서 막지 않으면 'a@x.com' 같은 주소가 닉네임 1자를 만들어 가입이 통째로 롤백된다.
  if char_length(v_name) < 1 then
    v_name := '회원';
  end if;
  if char_length(v_nickname) < 2 then
    v_nickname := '회원' || substr(replace(new.id::text, '-', ''), 1, 6);
  end if;

  --- 폴백 닉네임만 중복을 피한다(위 (c)).
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
    new.email,
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
    new.raw_user_meta_data->>'profile_image',
    coalesce(nullif(new.raw_user_meta_data->>'ntrp', '')::numeric, 3.0),
    left(nullif(trim(new.raw_user_meta_data->>'racket_brand'), ''), 30),
    left(nullif(trim(new.raw_user_meta_data->>'racket_model'), ''), 40)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ── 2) phone 형식 CHECK ────────────────────────────────────────────────────────
--
--- **앞자리 화이트리스트가 요점이다.** `\d{3}-\d{4}-\d{4}` 였다면 `399-2039-3030`이 통과한다 —
--- 모양만 맞고 한국에 없는 번호다. 그래서 통신사 식별번호를 직접 나열한다.
--- `010`은 뒷자리가 언제나 4-4이고, 010 통합 이전 번호(011·016·017·018·019)만 3-4를 허용한다.
--- 유선(02·031·…)과 070은 받지 않는다 — 이 필드의 쓰임은 "클럽 운영자가 회원에게 연락한다"이고,
--- 지역번호 20개 × 가변 자릿수를 표에 넣어 얻는 것이 없다. 라벨도 '휴대폰 번호'로 바꿔 규칙을 말한다.
---
--- **저장 형식은 하이픈 그대로다**(숫자만 남기지 않는다). 실데이터 52건이 전부 하이픈 형식이라
--- 숫자 저장으로 옮기면 backfill + `phone`을 그대로 그리는 모든 화면 + `mapUserRow`의
--- `phone ?? ''` 계약이 함께 움직이는데, 얻는 것은 요청되지 않은 "미래의 전화번호 중복 검사"뿐이다.
--- 정규형이 하나로 정해져 있으면 그 검사는 나중에도 그대로 된다.
---
--- 적용 시점 검증: 52건 통과 / 0건 위반 / 1건 null → `not valid` 없이 바로 건다.
alter table public.users
  add constraint users_phone_check
  check (phone is null or phone ~ '^(010-[0-9]{4}|01[16789]-[0-9]{3,4})-[0-9]{4}$');

comment on constraint users_phone_check on public.users is
  '휴대폰 번호 — 하이픈 포함 정규형(010-1234-5678). 앱 거울은 lib/format/phone.ts의 isValidMobilePhone (0079)';

-- ── 3) 이름·닉네임 길이 CHECK ──────────────────────────────────────────────────
--
--- racket_brand(30)·racket_model(40)의 선례를 따른다. `btrim`을 쓰는 이유는 공백만 넣은 값이
--- 길이 검사를 통과해 버리는 구멍을 막기 위해서다. 적용 시점 최댓값은 이름 4자·닉네임 7자.
alter table public.users
  add constraint users_name_check
  check (char_length(btrim(name)) between 1 and 20);

alter table public.users
  add constraint users_nickname_check
  check (char_length(btrim(nickname)) between 2 and 20);

comment on constraint users_name_check on public.users is
  '실명 1~20자(앞뒤 공백 제외). 가입 시 1회 입력, 변경 불가 (0079)';
comment on constraint users_nickname_check on public.users is
  '닉네임 2~20자(앞뒤 공백 제외). 프로필 설정에서 수정 가능 (0079)';

-- ── 4) 닉네임 부분 유니크 인덱스 ───────────────────────────────────────────────
--
--- **전역 UNIQUE를 쓰면 안 된다.** `deleteAccountAction`이 탈퇴 시 `nickname`을 `'탈퇴한 회원'`
--- **리터럴**로 덮으므로, 전역이면 **두 번째 탈퇴자가 23505로 탈퇴에 실패**한다. 탈퇴자가 0명이라
--- 첫 사람은 성공하고, 그래서 스모크로도 잡히지 않는 종류의 고장이다.
--- 부분 인덱스(`where deleted_at is null`)는 그 함정을 원천 차단하고, 덤으로
--- **탈퇴한 사람의 닉네임을 다시 쓸 수 있게** 한다 — 소프트 삭제 스키마에서 원하는 동작이다.
---
--- `lower(btrim(...))`은 새 관용구가 아니다 — `match_room_guests`의
--- `unique(room_id, lower(btrim(name)))`이 같은 이유(대소문자·공백만 다른 이름의 중복 방지)로 쓰고 있다.
--- ⚠ 표현식 인덱스이므로 **조회도 같은 표현식으로 써야 인덱스를 탄다**(앱의 중복 확인 쿼리가 그렇다).
create unique index users_nickname_unique_idx
  on public.users (lower(btrim(nickname)))
  where deleted_at is null;

comment on index public.users_nickname_unique_idx is
  '활성 회원의 닉네임은 대소문자·앞뒤 공백을 무시하고 유일하다. 탈퇴 행은 제외 — 탈퇴 시 닉네임이 리터럴로 덮이고, 떠난 사람의 닉네임은 재사용할 수 있어야 한다 (0079)';
