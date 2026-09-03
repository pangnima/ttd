-- 0042_fix_finalize_rotation_session_lock.sql
--- finalize_rotation_session은 security invoker라 RLS가 그대로 적용되는데, `select ... for update`는
--- Postgres RLS에서 UPDATE 정책(USING)으로 행을 거른다. rotation_sessions에는 본인 SELECT/INSERT/DELETE
--- 정책만 있고 UPDATE 정책이 없어 잠금 대상 행이 항상 0건 → 실제로 존재하는 세션에도 'session_not_found'가
--- 나던 결함. (match_requests 계열 RPC는 SECURITY DEFINER라 같은 패턴이어도 문제가 없었다.)
---
--- 수정: UPDATE 정책을 새로 열지 않고, 이미 있는 DELETE 정책(본인)으로 세션을 `delete ... returning`으로
--- 먼저 소비한다. 소유 검사·행 잠금·세션 삭제가 한 문장에서 끝나고, 이후 게임 insert가 하나라도 실패하면
--- 트랜잭션 전체가 롤백돼 세션도 그대로 남는다. 동시 호출 시 두 번째 delete는 0행이라 session_not_found로
--- 끝나므로 이중 분해 방지도 유지된다.

create or replace function public.finalize_rotation_session(p_session_id uuid, p_games jsonb)
returns void
language plpgsql
as $$
declare
  v_s rotation_sessions%rowtype;
  g jsonb;
  v_sets jsonb;
  v_match_id uuid;
begin
  delete from rotation_sessions
  where id = p_session_id and user_id = auth.uid()
  returning * into v_s;
  if not found then raise exception 'session_not_found'; end if;

  if p_games is null or jsonb_typeof(p_games) <> 'array'
     or jsonb_array_length(p_games) < 1 or jsonb_array_length(p_games) > 20 then
    raise exception 'invalid_games';
  end if;

  for g in select value from jsonb_array_elements(p_games) loop
    if coalesce(g->'partner'->>'name', '') = ''
       or coalesce(g->'opp1'->>'name', '') = ''
       or coalesce(g->'opp2'->>'name', '') = '' then
      raise exception 'invalid_games';
    end if;
    if not public.validate_set_scores(g->'sets') then
      raise exception 'invalid_set_scores';
    end if;
    v_sets := public.normalize_set_scores(g->'sets', true);
    v_match_id := gen_random_uuid();

    insert into personal_matches (id, user_id, source_type, played_at, played_time, match_type, surface, set_scores, winner, notes)
    values (v_match_id, v_s.user_id, 'rotation', v_s.played_at, v_s.played_time, v_s.match_type, v_s.surface, v_sets, public.personal_match_winner(v_sets), v_s.notes);

    insert into personal_match_participants (match_id, role, user_id, name, dominant_hand, ntrp_snapshot)
    values (v_match_id, 'opponent', nullif(g->'opp1'->>'userId', '')::uuid, g->'opp1'->>'name', nullif(g->'opp1'->>'hand', ''), nullif(g->'opp1'->>'ntrp', '')::numeric);
    insert into personal_match_participants (match_id, role, user_id, name, dominant_hand, ntrp_snapshot)
    values (v_match_id, 'partner', nullif(g->'partner'->>'userId', '')::uuid, g->'partner'->>'name', nullif(g->'partner'->>'hand', ''), nullif(g->'partner'->>'ntrp', '')::numeric);
    insert into personal_match_participants (match_id, role, user_id, name, dominant_hand, ntrp_snapshot)
    values (v_match_id, 'opponent2', nullif(g->'opp2'->>'userId', '')::uuid, g->'opp2'->>'name', nullif(g->'opp2'->>'hand', ''), nullif(g->'opp2'->>'ntrp', '')::numeric);
  end loop;
end;
$$;

revoke all on function public.finalize_rotation_session(uuid, jsonb) from public;
grant execute on function public.finalize_rotation_session(uuid, jsonb) to authenticated;
