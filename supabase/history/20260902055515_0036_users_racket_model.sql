-- 20260902055515 0036_users_racket_model
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
alter table public.users
  add column racket_model text
  check (racket_model is null or char_length(racket_model) <= 40);

comment on column public.users.racket_model is
  '주력 라켓 모델명 (≤40자, 선택). 가입·프로필 설정에서 수정 가능';
comment on column public.users.racket_brand is
  '주력 라켓 브랜드 — 프리셋 한글 라벨 또는 기타 직접 입력(≤30자). 가입·프로필 설정에서 수정 가능';

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.users (
    id, email, name, nickname, role,
    phone, gender, dominant_hand, tennis_start_date, profile_image, ntrp,
    racket_brand, racket_model
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
    left(nullif(trim(new.raw_user_meta_data->>'racket_brand'), ''), 30),
    left(nullif(trim(new.raw_user_meta_data->>'racket_model'), ''), 40)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
