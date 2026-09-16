-- 20260907090531 0060_result_confirmation_unanimous
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
-- 0060 — 결과 확정을 회원 좌석 전원 만장일치로 (정본: supabase/migrations/0060_result_confirmation_unanimous.sql)

alter table public.match_result_negotiations
  add column if not exists confirmed_by uuid[] not null default '{}'::uuid[];

comment on column public.match_result_negotiations.confirmed_by is
  '제안 결과를 확인한 좌석의 user_id (0060). 제안자는 제안 시점에 자동으로 들어간다. 활성 회원 좌석 전원(request_result_seats)이 들어가면 settle_match_result가 정산한다. 재제안·이의·정정 시 트리거가 초기화한다.';

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

update public.match_result_negotiations
set confirmed_by = array[proposed_by]
where result_status = 'proposed' and proposed_by is not null;

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

drop function if exists public.request_result_team(uuid, uuid);
