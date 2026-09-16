-- 20260914052307 0080_nickname_availability
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
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
      and (p_exclude_user_id is null or u.id <> p_exclude_user_id)
  );
$$;

comment on function public.is_nickname_taken(text, uuid) is
  '닉네임이 이미 쓰이고 있는지 판정한다(0080). 0079의 users_nickname_unique_idx와 같은 집합을 본다 — 표현식·deleted_at 조건이 어긋나면 화면과 저장이 갈린다. 회원가입 폼에서 쓰이므로 anon EXECUTE를 허용한다.';

revoke all on function public.is_nickname_taken(text, uuid) from public;
grant execute on function public.is_nickname_taken(text, uuid) to anon, authenticated;
