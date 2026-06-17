-- 0031_club_invites.sql
--- 비공개 클럽은 비멤버에게 리스트·상세가 RLS로 차단되어 새 멤버를 받을 경로가 없다.
--- 운영자가 공유 초대 링크(/clubs/join/[token])를 발급하고, 링크를 받은 로그인 사용자가
--- 즉시 approved 멤버로 가입하도록 한다.
--- 비멤버는 RLS로 clubs/club_members/club_invites를 직접 읽을 수 없으므로,
--- 미리보기·가입은 get_club_member_counts(0019)와 동일한 SECURITY DEFINER RPC로 RLS를 우회한다.

create table public.club_invites (
  token uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz,           -- null = 무기한
  is_active boolean not null default true
);

create index club_invites_club_id_idx on public.club_invites(club_id);

alter table public.club_invites enable row level security;

-- 운영자만 자기 클럽 초대 관리 (가입자는 RLS로 직접 접근 불가, 아래 RPC만 사용)
create policy club_invites_select on public.club_invites
  for select using (is_club_owner(club_id, auth.uid()));
create policy club_invites_insert on public.club_invites
  for insert with check (is_club_owner(club_id, auth.uid()) and created_by = auth.uid());
create policy club_invites_update on public.club_invites
  for update using (is_club_owner(club_id, auth.uid()));

-- 미리보기: 비멤버가 가입 전 클럽 기본 정보를 확인 (RLS 우회)
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

-- 가입: 토큰 검증 후 approved 멤버로 멱등 등록 (RLS 우회)
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
