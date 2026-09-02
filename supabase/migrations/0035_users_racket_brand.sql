-- 0035_users_racket_brand.sql
--- 회원가입 폼 개편: 주력 라켓 필드 추가.
--- 1) users.racket_brand — 프리셋 한글 라벨('윌슨'|'헤드'|'요넥스'|'바볼랏') 또는 '기타' 직접 입력 브랜드명(최대 30자).
---    가입 시 1회 입력, 프로필 설정에서는 읽기 전용.
--- 2) handle_new_user — auth metadata의 racket_brand를 users 행에 반영.
---    0002(MCP 이력, 레포 미보관)의 원격 정의를 여기서 처음 레포에 편입한다. 컬럼 한 줄 외 본문은 원문 그대로.
---    트리거 on_auth_user_created(AFTER INSERT ON auth.users)는 재생성하지 않는다 — CREATE OR REPLACE는 함수 OID를 유지한다.
---    참고: create trigger on_auth_user_created after insert on auth.users
---            for each row execute function public.handle_new_user();
---    이 트리거는 auth.users INSERT와 같은 트랜잭션이므로 실패 시 가입 자체가 롤백된다.
---    → 서버 액션(signupAction)이 signUp 호출 전에 검증하고, 여기서도 left(...,30)으로 CHECK 위반을 방어한다.

-- ── 1) users.racket_brand ──
alter table public.users
  add column racket_brand text
  check (racket_brand is null or char_length(racket_brand) <= 30);

comment on column public.users.racket_brand is
  '주력 라켓 브랜드 — 프리셋 한글 라벨 또는 기타 직접 입력(≤30자). 가입 시 1회 입력, 변경 불가';

-- ── 2) handle_new_user: racket_brand 반영 ──
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.users (
    id, email, name, nickname, role,
    phone, gender, dominant_hand, tennis_start_date, profile_image, ntrp,
    racket_brand
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'nickname', split_part(new.email, '@', 1)),
    'member',
    new.raw_user_meta_data->>'phone',
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
    left(nullif(trim(new.raw_user_meta_data->>'racket_brand'), ''), 30)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
