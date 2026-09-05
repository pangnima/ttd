-- 0052: 확인 요청 참가자 SELECT 확장
--
-- 복식 파트너·상대2가 **자기가 뛴 경기의 협상 상태를 읽기만** 할 수 있게 한다.
-- 지금까지는 요청 당사자(requester_id/opponent_user_id)만 match_requests를 읽을 수 있어서,
-- 파트너의 관점 행(0049)에는 협상 행이 아예 내려오지 않았다 → 화면이
-- "아무도 제안하지 않음 / 제안돼서 대표 확인만 남음 / 이의 제기됨"을 구분하지 못했다.
--
-- 쓰기는 무변경 — 제안/확인/이의 RPC 3종은 여전히 requester/opponent만 통과시킨다
-- (not_request_party). UPDATE 정책(cancel/reject)도 그대로 당사자 전용이다.
--
-- ⚠️ 정책식이 match_request_participants를 직접 참조하면 그 테이블의 SELECT 정책이 다시
-- match_requests를 참조해 상호 재귀에 빠진다. is_room_participant(0049)·
-- is_club_approved_member 선례대로 SECURITY DEFINER 헬퍼로 우회한다.

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

-- 3개 SELECT 정책을 헬퍼 기반으로 교체 (0040:138,156,166)
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
