-- 20260915053451 0086_find_login_id
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
-- 0086 — 아이디 찾기 (Week 61). 전문·배경은 supabase/migrations/0086_find_login_id.sql.

create or replace function public.find_login_id(p_name text, p_email text)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select case
    when u.login_id is not null then
      jsonb_build_object(
        'kind', 'login_id',
        'masked', left(u.login_id, 2) || repeat('*', char_length(u.login_id) - 2)
      )
    when a.raw_app_meta_data->'providers' ? 'email' then
      jsonb_build_object('kind', 'email_only')
    else
      jsonb_build_object('kind', 'social', 'provider', a.raw_app_meta_data->>'provider')
  end
  from public.users u
  join auth.users a on a.id = u.id
  where lower(btrim(u.name)) = lower(btrim(p_name))
    and lower(btrim(a.email)) = lower(btrim(p_email))
    and u.deleted_at is null
  limit 1;
$$;

comment on function public.find_login_id(text, text) is
  '아이디 찾기(0086). 이름+이메일이 맞으면 마스킹된 아이디(앞 2자 + *) 또는 계정 종류(email_only/social)를 jsonb로, 아니면 null. 마스킹은 이 함수 안에서만 한다 — anon EXECUTE라 원문이 나가면 안 된다. 열거 대가는 0086 머리말.';

revoke all on function public.find_login_id(text, text) from public;
grant execute on function public.find_login_id(text, text) to anon, authenticated;
