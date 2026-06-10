-- 0019_club_member_counts.sql
-- 클럽 목록에서 가입하지 않은 클럽의 멤버 수(정회원/게스트)를 노출하기 위한 RPC.
-- club_members SELECT RLS는 승인 멤버만 다른 멤버 행을 읽을 수 있어, 비가입 클럽의 카운트가 0이 되는 문제를 해결한다.
-- 집계 숫자만 반환하므로 개인정보 노출 없이 SECURITY DEFINER로 RLS를 우회한다.

create or replace function public.get_club_member_counts(p_club_ids uuid[])
returns table(club_id uuid, regular integer, guest integer)
language sql
security definer
set search_path = public
as $$
  select cm.club_id,
         count(*) filter (where not coalesce(u.is_guest, false))::int as regular,
         count(*) filter (where coalesce(u.is_guest, false))::int      as guest
  from public.club_members cm
  join public.users u on u.id = cm.user_id
  where cm.club_id = any(p_club_ids)
    and cm.status = 'approved'
  group by cm.club_id;
$$;

revoke all on function public.get_club_member_counts(uuid[]) from public;
grant execute on function public.get_club_member_counts(uuid[]) to authenticated;
