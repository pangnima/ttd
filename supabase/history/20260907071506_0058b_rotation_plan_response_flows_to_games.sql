-- 20260907071506 0058b_rotation_plan_response_flows_to_games
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
-- 0058 §3 — 일정 응답이 그 세션의 게임 요청까지 흡수한다(0057 §5 대체).
-- 정본은 supabase/migrations/0058_rotation_session_pool_invite.sql
create or replace function public.respond_rotation_plan(p_session_id uuid, p_accept boolean)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_rows int;
  v_req_id uuid;
  v_touched boolean;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  perform 1 from rotation_sessions where id = p_session_id for update;
  if not found then raise exception 'session_not_found'; end if;

  update rotation_session_participants
  set participation_status = case when p_accept then 'accepted' else 'rejected' end,
      responded_at = now()
  where session_id = p_session_id and user_id = v_uid and participation_status = 'pending';
  get diagnostics v_rows = row_count;
  if v_rows = 0 then raise exception 'plan_already_responded'; end if;

  if not p_accept then
    update rotation_sessions
    set players = coalesce((
      select jsonb_agg(e) from jsonb_array_elements(players) e
      where nullif(e->>'userId', '')::uuid is distinct from v_uid
    ), '[]'::jsonb)
    where id = p_session_id;
  end if;

  for v_req_id in
    select r.id from match_requests r
    where r.rotation_session_id = p_session_id and r.status = 'pending'
    order by r.group_seq nulls last, r.created_at
  loop
    v_touched := public.mark_request_opponent_response(v_req_id, p_accept);
    if public.mark_request_participant_response(v_req_id, p_accept) then v_touched := true; end if;
    if v_touched and p_accept then perform public.maybe_materialize_request(v_req_id); end if;
  end loop;
end;
$$;

revoke all on function public.respond_rotation_plan(uuid, boolean) from public;
revoke execute on function public.respond_rotation_plan(uuid, boolean) from anon;
grant execute on function public.respond_rotation_plan(uuid, boolean) to authenticated;
