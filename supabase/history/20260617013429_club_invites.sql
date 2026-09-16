-- 20260617013429 club_invites
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
create table public.club_invites (
  token uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  is_active boolean not null default true
);

create index club_invites_club_id_idx on public.club_invites(club_id);

alter table public.club_invites enable row level security;

create policy club_invites_select on public.club_invites
  for select using (is_club_owner(club_id, auth.uid()));
create policy club_invites_insert on public.club_invites
  for insert with check (is_club_owner(club_id, auth.uid()) and created_by = auth.uid());
create policy club_invites_update on public.club_invites
  for update using (is_club_owner(club_id, auth.uid()));

create or replace function public.get_invite_preview(p_token uuid)
returns table(club_id uuid, name text, region text, logo_url text, is_public boolean)
language sql security definer set search_path = public
as $$
  select c.id, c.name, c.region, c.logo_url, c.is_public
  from public.club_invites i
  join public.clubs c on c.id = i.club_id
  where i.token = p_token and i.is_active = true
    and (i.expires_at is null or i.expires_at > now());
$$;

create or replace function public.join_club_via_invite(p_token uuid)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_club_id uuid;
begin
  select i.club_id into v_club_id
  from public.club_invites i
  where i.token = p_token and i.is_active = true
    and (i.expires_at is null or i.expires_at > now());
  if v_club_id is null then
    raise exception 'invalid_or_expired_invite';
  end if;
  insert into public.club_members (user_id, club_id, role, status)
  values (auth.uid(), v_club_id, 'member', 'approved')
  on conflict (user_id, club_id) do update set status = 'approved';
  return v_club_id;
end;
$$;

revoke all on function public.get_invite_preview(uuid) from public;
grant execute on function public.get_invite_preview(uuid) to authenticated;
revoke all on function public.join_club_via_invite(uuid) from public;
grant execute on function public.join_club_via_invite(uuid) to authenticated;
