-- 20260914051951 0079_users_identity_guards
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
-- 0079 — 가입 입력에 제약을 건다: 닉네임 유일성 · 휴대폰 형식 · 이름 길이 (Week 52)
--
-- public.users는 이 앱에서 유일하게 제약 없이 도메인 값을 받는 테이블로 남아 있었다.
-- 적용 직전 제약은 PK 하나와 CHECK 여섯뿐이고 UNIQUE 인덱스가 하나도 없었다.
-- 실데이터: 회원 53명 · 탈퇴자 0명 · 닉네임 중복 0건 · phone 52건 전부 형식 통과(1건 null).
-- 그래서 backfill도, not valid 우회도 필요 없다. 자세한 근거는 레포의 동명 파일 주석 참고.
--
-- 순서가 결정적이다: 트리거 수정이 phone CHECK보다 먼저 와야 한다.

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

alter table public.users
  add constraint users_phone_check
  check (phone is null or phone ~ '^(010-[0-9]{4}|01[16789]-[0-9]{3,4})-[0-9]{4}$');

comment on constraint users_phone_check on public.users is
  '휴대폰 번호 — 하이픈 포함 정규형(010-1234-5678). 앱 거울은 lib/format/phone.ts의 isValidMobilePhone (0079)';

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

create unique index users_nickname_unique_idx
  on public.users (lower(btrim(nickname)))
  where deleted_at is null;

comment on index public.users_nickname_unique_idx is
  '활성 회원의 닉네임은 대소문자·앞뒤 공백을 무시하고 유일하다. 탈퇴 행은 제외 — 탈퇴 시 닉네임이 리터럴로 덮이고, 떠난 사람의 닉네임은 재사용할 수 있어야 한다 (0079)';

