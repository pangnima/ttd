-- 20260905082250 reopen_match_result
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
-- 0055_reopen_match_result.sql
-- 확정된 상호 확인 경기의 결과를 다시 협상 상태(disputed)로 되돌린다.

create or replace function public.reopen_match_result(p_request_id uuid, p_reason text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_req match_requests%rowtype;
  v_neg match_result_negotiations%rowtype;
  v_uid uuid := auth.uid();
  v_counterpart_id uuid;
  v_counterpart_deleted timestamptz;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_rows int;
begin
  select * into v_req from match_requests where id = p_request_id for update;
  if not found then raise exception 'request_not_found'; end if;
  if v_req.status <> 'accepted' then raise exception 'request_not_accepted'; end if;
  if v_uid is null or (v_req.requester_id <> v_uid and v_req.opponent_user_id <> v_uid) then
    raise exception 'not_request_party';
  end if;

  select * into v_neg from match_result_negotiations where request_id = p_request_id for update;
  if not found or v_neg.result_status <> 'confirmed' then raise exception 'result_not_confirmed'; end if;
  if v_reason is not null and char_length(v_reason) > 200 then raise exception 'dispute_reason_too_long'; end if;

  v_counterpart_id := case when v_req.requester_id = v_uid then v_req.opponent_user_id else v_req.requester_id end;
  select deleted_at into v_counterpart_deleted from users where id = v_counterpart_id;
  if v_counterpart_deleted is not null then raise exception 'counterpart_deleted'; end if;

  update personal_matches
  set set_scores = '[]'::jsonb
  where source_request_id = p_request_id;
  get diagnostics v_rows = row_count;
  if v_rows < 2 then raise exception 'personal_matches_missing'; end if;

  update match_result_negotiations
  set result_status = 'disputed',
      set_scores = '[]'::jsonb,
      dispute_reason = coalesce(v_reason, '결과 정정 요청')
  where request_id = p_request_id;
end;
$$;

revoke all on function public.reopen_match_result(uuid, text) from public;
revoke execute on function public.reopen_match_result(uuid, text) from anon;
grant execute on function public.reopen_match_result(uuid, text) to authenticated;
