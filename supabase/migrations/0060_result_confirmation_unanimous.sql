-- ════════════════════════════════════════════════════════════════════════════
-- 0060 — 결과 확정을 회원 좌석 전원 만장일치로
-- ════════════════════════════════════════════════════════════════════════════
--- 0059는 결과 협상 권한을 좌석 넷으로 넓히면서 **확인을 팀 단위**로 뒀다. 한쪽이 제안하면
--- 상대팀 회원 1명의 confirm이 회원 4명 전원의 personal_matches 관점 행을 동시에 확정했다 —
--- 페어 중 한 명의 확인이 팀 전체를 대리한 것이다. 요구는 "4명이 한 게임에 참여했으면 4명 모두가
--- 확정을 눌러야 한다".
---
--- 규칙 한 문장: **협상이 있는 요청의 활성 회원 좌석 전원이 confirmed_by에 들어가면 정산된다.
--- 제안이 곧 제안자의 확인이다.** 단식은 좌석이 둘이라 상대 1명의 확인으로 종전과 같이 정산되고,
--- 방 안팎·로테이션 파생 게임은 협상 행이 같은 테이블이라 조건문 없이 같은 규칙을 탄다.
--- 상대팀 전원 비회원 게임은 협상 행이 없어(finalize 폴백) 종전대로 즉시 확정이다.
---
--- 0059의 **팀 담합 가드는 제거**한다 — 만장일치에서는 파트너의 확인이 한 표일 뿐이고, 상대팀
--- 동의 없이는 확정되지 않는다. 남는 구멍 하나: 제안 뒤 상대팀 전원이 탈퇴하면 분모가 우리 팀만
--- 남는다. propose의 counterpart_deleted가 제안 시점에 막고, 정산 시점의 잔여는 허용한다.
---
--- 좌석별 확인은 별도 테이블이 아니라 협상 행의 **uuid[] 컬럼**이다. 확인 시각 감사가 요구에 없고
--- 회원은 soft delete뿐이라 행 단위 테이블이 주는 것이 없고, 배열이면 새 RLS 정책·FK·임베드·
--- 다른 테이블 DML이 전부 사라진다.
---
--- 초기화 규칙(제안 진입·재제안 → [제안자], none/disputed → {})은 RPC마다 넣지 않고 **BEFORE
--- 트리거 한 곳**에 둔다. finalize_rotation_session(0057)의 미수락 경로가 propose를 우회해 협상 행을
--- 직접 'proposed'로 INSERT 하므로, RPC마다 고치면 500줄 finalize를 재정의해야 한다.


-- ════════════════════════════════════════════════════════════════
-- §1 confirmed_by 컬럼
-- ════════════════════════════════════════════════════════════════
alter table public.match_result_negotiations
  add column if not exists confirmed_by uuid[] not null default '{}'::uuid[];

comment on column public.match_result_negotiations.confirmed_by is
  '제안 결과를 확인한 좌석의 user_id (0060). 제안자는 제안 시점에 자동으로 들어간다. 활성 회원 좌석 전원(request_result_seats)이 들어가면 settle_match_result가 정산한다. 재제안·이의·정정 시 트리거가 초기화한다.';


-- ════════════════════════════════════════════════════════════════
-- §2 확인 분모 — 활성 회원 좌석
-- ════════════════════════════════════════════════════════════════
--- requester / opponent / partner / opponent2 중 is_active_member인 distinct uuid.
--- materialize_accepted_request(0056)가 관점 행을 만드는 술어, confirm의 perspective_row_missing
--- 단언과 같은 활성 기준이다 — 셋이 어긋나면 '기록은 있는데 확인은 못 받는' 좌석이 생긴다.
--- ⚠ 열람 축 is_request_party(0052)와 다른 축이고 RLS 정책에 쓰지 않는다(권한 전부 회수).
create or replace function public.request_result_seats(p_request_id uuid)
returns uuid[]
language sql security definer stable set search_path = public
as $$
  select coalesce(array_agg(distinct s.u), '{}'::uuid[])
  from (
    select r.requester_id as u from match_requests r where r.id = p_request_id
    union
    select r.opponent_user_id from match_requests r where r.id = p_request_id
    union
    select p.user_id from match_request_participants p
    where p.request_id = p_request_id and p.role in ('partner', 'opponent2')
  ) s
  where s.u is not null and public.is_active_member(s.u);
$$;

revoke all on function public.request_result_seats(uuid) from public, anon, authenticated;

comment on function public.request_result_seats(uuid) is
  '결과 확인의 분모 — 요청의 활성 회원 좌석 전원 (0060). 전원이 confirmed_by에 들어가야 정산된다.';


-- ════════════════════════════════════════════════════════════════
-- §3 settle_match_result — 정산 (0059 confirm 본문 추출)
-- ════════════════════════════════════════════════════════════════
--- 0059 confirm_match_result의 UPDATE 4벌 + 행 단언 + confirmed 전이를 그대로 옮겼다.
--- 갱신 대상 행 집합은 요청 행에서 유도한 user_id로만 정해지고 호출자와 무관하다 — 그래서
--- "마지막 확인자"가 누구든 같은 4행을 확정한다. 내부 전용(권한 전부 회수).
create or replace function public.settle_match_result(p_request_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_req match_requests%rowtype;
  v_neg match_result_negotiations%rowtype;
  v_inverted jsonb;
  v_requester_rows int;
  v_opponent_rows int;
  v_partner_user_id uuid;
  v_opp2_user_id uuid;
  v_partner_rows int;
  v_opp2_rows int;
begin
  select * into v_req from match_requests where id = p_request_id;
  if not found then raise exception 'request_not_found'; end if;
  select * into v_neg from match_result_negotiations where request_id = p_request_id;
  if not found or v_neg.result_status <> 'proposed' then raise exception 'result_not_proposed'; end if;

  if not public.validate_set_scores(v_neg.proposed_set_scores) then raise exception 'invalid_set_scores'; end if;
  v_inverted := public.invert_set_scores(v_neg.proposed_set_scores);

  update personal_matches
  set set_scores = v_neg.proposed_set_scores
  where source_request_id = p_request_id and user_id = v_req.requester_id;
  get diagnostics v_requester_rows = row_count;

  update personal_matches
  set set_scores = v_inverted
  where source_request_id = p_request_id and user_id = v_req.opponent_user_id;
  get diagnostics v_opponent_rows = row_count;

  if v_requester_rows <> 1 or v_opponent_rows <> 1 then
    raise exception 'personal_matches_missing';
  end if;

  -- 복식이면 파트너·상대2 관점 행도 같은 결과로 확정한다(0053: 방 안팎 공통).
  -- materialize_accepted_request가 행을 만드는 조건과 정확히 같은 술어로 단언한다.
  select user_id into v_partner_user_id from match_request_participants
  where request_id = p_request_id and role = 'partner';
  select user_id into v_opp2_user_id from match_request_participants
  where request_id = p_request_id and role = 'opponent2';

  if v_partner_user_id is not null then
    update personal_matches
    set set_scores = public.swap_partner_perspective(v_neg.proposed_set_scores)
    where source_request_id = p_request_id and user_id = v_partner_user_id;
    get diagnostics v_partner_rows = row_count;
    if public.is_active_member(v_partner_user_id)
       and v_partner_user_id not in (v_req.requester_id, v_req.opponent_user_id)
       and v_partner_rows <> 1 then
      raise exception 'perspective_row_missing';
    end if;
  end if;
  if v_opp2_user_id is not null then
    update personal_matches
    set set_scores = public.swap_partner_perspective(v_inverted)
    where source_request_id = p_request_id and user_id = v_opp2_user_id;
    get diagnostics v_opp2_rows = row_count;
    if public.is_active_member(v_opp2_user_id)
       and v_opp2_user_id not in (v_req.requester_id, v_req.opponent_user_id)
       and v_opp2_rows <> 1 then
      raise exception 'perspective_row_missing';
    end if;
  end if;

  update match_result_negotiations
  set set_scores = proposed_set_scores,
      result_status = 'confirmed',
      dispute_reason = null
  where request_id = p_request_id;
end;
$$;

revoke all on function public.settle_match_result(uuid) from public, anon, authenticated;

comment on function public.settle_match_result(uuid) is
  '제안 결과로 관점 행 전부를 확정한다 (0060, 0059 confirm 본문 추출). confirm_match_result가 좌석 전원 확인 시에만 부른다.';


-- ════════════════════════════════════════════════════════════════
-- §4 백필 — 진행 중인 제안에 제안자 확인을 채운다
-- ════════════════════════════════════════════════════════════════
--- 트리거보다 먼저 명시적으로 한다. `set proposed_at = proposed_at`은 값이 안 바뀌어 트리거의
--- 리셋 조건을 못 타므로 값을 직접 쓴다. 요청이 rejected인 협상 행에 들어가도 무해하다 —
--- confirm이 request_not_accepted로 막는다.
update public.match_result_negotiations
set confirmed_by = array[proposed_by]
where result_status = 'proposed' and proposed_by is not null;


-- ════════════════════════════════════════════════════════════════
-- §5 트리거 — 확인 배열의 초기화 규칙을 한 곳에
-- ════════════════════════════════════════════════════════════════
--- 조건을 전부 봐야 한다. "proposed_at 변경"만 보면 INSERT(old 없음)에서 깨지고,
--- "proposed 진입"만 보면 제안자의 제안 수정(status는 proposed 그대로)이 리셋되지 않아 다른 좌석이
--- **바뀐 값에 동의한 적 없는데** 확인이 남는다. proposed_at은 `now()`라 같은 트랜잭션 안에서는
--- 안 바뀌므로 제안값·제안자 변경도 함께 본다(RPC는 각자 트랜잭션이라 실제로는 proposed_at으로
--- 충분하지만, 판정을 시계에만 기대지 않는다).
--- confirmed는 손대지 않는다(누가 확인했는지 이력). proposed 상태에서 제안이 그대로인 UPDATE는
--- confirm 자신(배열 append)이므로 그대로 둔다.
--- 이 한 곳이 propose(재제안)·dispute·reopen(0055)·finalize의 직접 INSERT(0057) 네 경로를 덮는다.
--- materialize의 `on conflict do nothing`은 스킵된 행에 트리거를 띄우지 않으므로 finalize가
--- 미리 심은 proposed 행의 제안자 확인이 보존된다.
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
  return new;
end;
$$;

revoke all on function public.normalize_result_confirmations() from public, anon, authenticated;

drop trigger if exists match_result_negotiations_normalize_confirmations on public.match_result_negotiations;
create trigger match_result_negotiations_normalize_confirmations
  before insert or update on public.match_result_negotiations
  for each row execute function public.normalize_result_confirmations();


-- ════════════════════════════════════════════════════════════════
-- §6 confirm_match_result — 좌석별 확인 + 전원 확인 시 정산 (0059 §3 대체)
-- ════════════════════════════════════════════════════════════════
--- 반환값이 void → boolean(이 호출로 정산됐는가)이라 drop 후 재생성한다.
---
--- 멱등 구조가 핵심이다: **완성 판정을 배열 append 여부와 무관하게 항상** 수행한다. 마지막
--- 미확인자가 탈퇴해 분모가 줄었을 때, 누군가(제안자 포함) 한 번 더 누르면 정산되므로 영구 정지가
--- 없다. 이미 들어 있는 좌석의 재클릭은 미완성일 때만 에러다.
--- 집합 포함(<@)으로 판정한다 — 탈퇴자의 옛 확인이 배열에 남아 있어도 count 비교와 달리 안전하다.
--- 요청·협상 행 for update 락이 동시 확인을 직렬화한다(마지막 둘이 동시에 눌러도 한 명만 정산).
drop function if exists public.confirm_match_result(uuid);

create function public.confirm_match_result(p_request_id uuid)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_req match_requests%rowtype;
  v_neg match_result_negotiations%rowtype;
  v_uid uuid := auth.uid();
  v_seat text;
  v_seats uuid[];
  v_confirmed uuid[];
  v_is_proposer boolean;
  v_already boolean;
begin
  select * into v_req from match_requests where id = p_request_id for update;
  if not found then raise exception 'request_not_found'; end if;
  if v_req.status <> 'accepted' then raise exception 'request_not_accepted'; end if;

  v_seat := public.request_seat_of(p_request_id, v_uid);
  if v_seat is null then raise exception 'not_request_party'; end if;

  select * into v_neg from match_result_negotiations where request_id = p_request_id for update;
  if not found or v_neg.result_status <> 'proposed' then raise exception 'result_not_proposed'; end if;

  v_is_proposer := v_neg.proposed_by = v_uid;
  v_already := v_is_proposer or v_uid = any(v_neg.confirmed_by);
  v_confirmed := v_neg.confirmed_by;

  if not v_already then
    v_confirmed := v_confirmed || v_uid;
    -- proposed_at 불변 → 트리거가 손대지 않는다
    update match_result_negotiations
    set confirmed_by = v_confirmed
    where request_id = p_request_id;
  end if;

  v_seats := public.request_result_seats(p_request_id);
  if cardinality(v_seats) = 0 then raise exception 'counterpart_deleted'; end if;

  if v_seats <@ v_confirmed then
    perform public.settle_match_result(p_request_id);
    return true;
  end if;

  if v_is_proposer then raise exception 'cannot_confirm_own_proposal'; end if;
  if v_already then raise exception 'result_already_confirmed_by_seat'; end if;
  return false;
end;
$$;

revoke all on function public.confirm_match_result(uuid) from public;
revoke execute on function public.confirm_match_result(uuid) from anon;
grant execute on function public.confirm_match_result(uuid) to authenticated;

comment on function public.confirm_match_result(uuid) is
  '제안 결과에 내 좌석의 확인을 더한다 (0060). 활성 회원 좌석 전원이 확인하면 settle_match_result로 정산하고 true를 돌려준다. 제안은 제안자의 확인을 겸한다.';


-- ════════════════════════════════════════════════════════════════
-- §7 dispute_match_result — 팀 가드 제거 (0059 §4 대체)
-- ════════════════════════════════════════════════════════════════
--- 0059는 UI와 RPC의 자격을 같은 문장으로 두려고 확인과 같은 팀 가드를 걸었다. 확인이 좌석별로
--- 바뀌었으니 이의도 좌석별이다 — 제안자 본인만 빼고 좌석 누구나, 이미 확인한 좌석도 정산 전이면
--- 이의할 수 있다. disputed 전이는 트리거가 배열을 비운다.
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
  set result_status = 'disputed', dispute_reason = v_reason
  where request_id = p_request_id;
end;
$$;

revoke all on function public.dispute_match_result(uuid, text) from public;
revoke execute on function public.dispute_match_result(uuid, text) from anon;
grant execute on function public.dispute_match_result(uuid, text) to authenticated;

--- 팀 판정은 호출처가 사라졌다. propose·reopen의 counterpart 판정은 좌석 2분기 그대로다.
drop function if exists public.request_result_team(uuid, uuid);
