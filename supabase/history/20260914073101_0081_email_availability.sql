-- 20260914073101 0081_email_availability
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
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
