-- 0061 — 이의 제기자 기록 (match_result_negotiations.disputed_by)
--
--- 확인 요청 허브 3탭화(내 차례 / 상대 대기 / 이의 제기)의 전제. disputed 상태에서 '다시 입력할 차례'는
--- 제안자뿐이고 이의자·나머지 좌석은 대기인데, 화면이 "누가 이의했는가"를 알아야 섹션·배지가 갈린다.
--- 협상 행에는 사유(dispute_reason)만 있었다 — 단식은 '제안자 아닌 쪽'으로 유도되지만 복식은 좌석 셋 중
--- 누구인지 알 수 없다.
---
--- 초기화 규칙은 0060과 같은 원칙이다 — RPC마다 넣지 않고 BEFORE 트리거 한 곳이 disputed 밖으로 전이할 때
--- 지운다(propose 재제안·settle 확정·finalize 직접 INSERT 세 경로를 조건문 없이 덮는다).
--- 백필은 하지 않는다 — 기존 disputed 행은 이의자 미상(null)으로 남고, 앱은 '이의 제기됨' 폴백 문구를 쓴다.
--- 분류 자체는 proposed_by만 보므로(제안자 = 다시 입력할 차례) 미상이어도 동작이 어긋나지 않는다.

-- ════════════════════════════════════════════════════════════════
-- §1 컬럼
-- ════════════════════════════════════════════════════════════════
alter table public.match_result_negotiations
  add column if not exists disputed_by uuid references public.users(id) on delete set null;

comment on column public.match_result_negotiations.disputed_by is
  '이의(dispute_match_result) 또는 정정(reopen_match_result)으로 disputed 상태를 만든 좌석의 user_id (0061). disputed 밖으로 전이하면 normalize_result_confirmations 트리거가 null로 초기화한다. 0061 이전의 disputed 행은 null(이의자 미상).';


-- ════════════════════════════════════════════════════════════════
-- §2 normalize_result_confirmations — disputed 밖에서 disputed_by 초기화 (0060 §5 대체)
-- ════════════════════════════════════════════════════════════════
--- 0060 본문 그대로 + 마지막 분기 하나. 트리거는 컬럼 목록 없는 BEFORE INSERT OR UPDATE라 재생성하지 않는다.
create or replace function public.normalize_result_confirmations()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.result_status = 'proposed'
     and (tg_op = 'INSERT'
          or old.result_status <> 'proposed'
          or new.proposed_at is distinct from old.proposed_at
          or new.proposed_by is distinct from old.proposed_by
          or new.proposed_set_scores is distinct from old.proposed_set_scores) then
    new.confirmed_by := case
      when new.proposed_by is null then '{}'::uuid[]
      else array[new.proposed_by]
    end;
  elsif new.result_status in ('none', 'disputed') then
    new.confirmed_by := '{}'::uuid[];
  end if;

  -- 0061: 이의자 표식은 disputed 상태에서만 의미가 있다 (INSERT 포함)
  if new.result_status <> 'disputed' then
    new.disputed_by := null;
  end if;
  return new;
end;
$$;

revoke all on function public.normalize_result_confirmations() from public, anon, authenticated;


-- ════════════════════════════════════════════════════════════════
-- §3 dispute_match_result — 이의자 기록 (0060 §7 대체)
-- ════════════════════════════════════════════════════════════════
--- 자격·검증은 0060 그대로(제안자 본인만 빼고 좌석 누구나). UPDATE에 disputed_by 한 줄만 는다.
create or replace function public.dispute_match_result(p_request_id uuid, p_reason text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_req match_requests%rowtype;
  v_neg match_result_negotiations%rowtype;
  v_uid uuid := auth.uid();
  v_seat text;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  select * into v_req from match_requests where id = p_request_id for update;
  if not found then raise exception 'request_not_found'; end if;
  if v_req.status <> 'accepted' then raise exception 'request_not_accepted'; end if;

  v_seat := public.request_seat_of(p_request_id, v_uid);
  if v_seat is null then raise exception 'not_request_party'; end if;

  select * into v_neg from match_result_negotiations where request_id = p_request_id for update;
  if not found or v_neg.result_status <> 'proposed' then raise exception 'result_not_proposed'; end if;
  if v_neg.proposed_by = v_uid then raise exception 'cannot_dispute_own_proposal'; end if;

  if v_reason is not null and char_length(v_reason) > 200 then raise exception 'dispute_reason_too_long'; end if;

  update match_result_negotiations
  set result_status = 'disputed', dispute_reason = v_reason, disputed_by = v_uid
  where request_id = p_request_id;
end;
$$;

revoke all on function public.dispute_match_result(uuid, text) from public;
revoke execute on function public.dispute_match_result(uuid, text) from anon;
grant execute on function public.dispute_match_result(uuid, text) to authenticated;


-- ════════════════════════════════════════════════════════════════
-- §4 reopen_match_result — 정정 요청자 기록 (0059 §5 대체)
-- ════════════════════════════════════════════════════════════════
--- 정정도 disputed로 전이하므로 같은 컬럼에 요청자를 남긴다. proposed_by는 마지막 제안자로 남는다(재제안 프리필) —
--- 그래서 앱의 '다시 입력할 차례'는 마지막 제안자이고, 제안자 본인이 정정하면 그 사람이 곧 차례다.
create or replace function public.reopen_match_result(p_request_id uuid, p_reason text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_req match_requests%rowtype;
  v_neg match_result_negotiations%rowtype;
  v_uid uuid := auth.uid();
  v_seat text;
  v_has_counterpart boolean;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_rows int;
begin
  select * into v_req from match_requests where id = p_request_id for update;
  if not found then raise exception 'request_not_found'; end if;
  if v_req.status <> 'accepted' then raise exception 'request_not_accepted'; end if;

  v_seat := public.request_seat_of(p_request_id, v_uid);
  if v_seat is null then raise exception 'not_request_party'; end if;

  select * into v_neg from match_result_negotiations where request_id = p_request_id for update;
  if not found or v_neg.result_status <> 'confirmed' then raise exception 'result_not_confirmed'; end if;
  if v_reason is not null and char_length(v_reason) > 200 then raise exception 'dispute_reason_too_long'; end if;

  -- 되돌린 뒤 다시 합의해 줄 사람이 상대팀에 남아 있어야 한다
  if v_seat in ('requester', 'partner') then
    v_has_counterpart := public.is_active_member(v_req.opponent_user_id)
      or exists (select 1 from match_request_participants p
                 where p.request_id = p_request_id and p.role = 'opponent2'
                   and public.is_active_member(p.user_id));
  else
    v_has_counterpart := public.is_active_member(v_req.requester_id)
      or exists (select 1 from match_request_participants p
                 where p.request_id = p_request_id and p.role = 'partner'
                   and public.is_active_member(p.user_id));
  end if;
  if not v_has_counterpart then raise exception 'counterpart_deleted'; end if;

  update personal_matches
  set set_scores = '[]'::jsonb
  where source_request_id = p_request_id;
  get diagnostics v_rows = row_count;
  if v_rows < 2 then raise exception 'personal_matches_missing'; end if;

  update match_result_negotiations
  set result_status = 'disputed',
      set_scores = '[]'::jsonb,
      dispute_reason = coalesce(v_reason, '결과 정정 요청'),
      disputed_by = v_uid
  where request_id = p_request_id;
end;
$$;

revoke all on function public.reopen_match_result(uuid, text) from public;
revoke execute on function public.reopen_match_result(uuid, text) from anon;
grant execute on function public.reopen_match_result(uuid, text) to authenticated;
