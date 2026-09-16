-- 20260905032121 0052_request_participant_select
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
create or replace function public.is_request_party(p_request_id uuid)
returns boolean
language sql security definer stable set search_path = public
as $$
  select exists (
    select 1 from match_requests r
    where r.id = p_request_id
      and (r.requester_id = auth.uid() or r.opponent_user_id = auth.uid())
  ) or exists (
    select 1 from match_request_participants p
    where p.request_id = p_request_id and p.user_id = auth.uid()
  );
$$;

revoke all on function public.is_request_party(uuid) from public, anon;
grant execute on function public.is_request_party(uuid) to authenticated;

drop policy if exists match_requests_select on public.match_requests;
create policy match_requests_select on public.match_requests
  for select using (public.is_request_party(id));

drop policy if exists match_request_participants_select on public.match_request_participants;
create policy match_request_participants_select on public.match_request_participants
  for select using (public.is_request_party(request_id));

drop policy if exists match_result_negotiations_select on public.match_result_negotiations;
create policy match_result_negotiations_select on public.match_result_negotiations
  for select using (public.is_request_party(request_id));

comment on function public.is_request_party(uuid) is
  '확인 요청의 열람 자격 — 요청 당사자(requester/opponent) 또는 복식 참가자(partner/opponent2). 읽기 전용 판정이며 쓰기 권한과 무관하다(0052).';
