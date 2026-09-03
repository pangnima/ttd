-- 0041_fix_match_requests_set_scores.sql
--- 0040에서 match_requests.set_scores 컬럼을 빠뜨림 — accept_match_request가 여전히 이를 참조해
--- (plpgsql은 CREATE 시점에 컬럼 존재를 검증하지 않으므로) 런타임에만 실패하는 결함이었다.
--- 요청자가 요청 생성 시점에 결과를 함께 제출하는 기존 기능(0033 원 설계, 현재 UI는 보통 생략)을
--- 복원한다. match_requests.set_scores = 요청 시점 원본값, match_result_negotiations.set_scores =
--- 수락/확정 시점 값 — 서로 다른 시점의 값이므로 컬럼명이 겹쳐도 별개 개념이다.

alter table public.match_requests
  add column set_scores jsonb not null default '[]'::jsonb check (jsonb_typeof(set_scores) = 'array');

drop function if exists public.create_match_request(uuid, date, time, text, text, text, jsonb, jsonb);

create or replace function public.create_match_request(
  p_opponent_user_id uuid,
  p_played_at date,
  p_played_time time,
  p_match_type text,
  p_surface text,
  p_notes text default null,
  p_set_scores jsonb default '[]'::jsonb,
  p_partner jsonb default null,
  p_opponent2 jsonb default null
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid := gen_random_uuid();
  v_is_doubles boolean := p_match_type <> 'singles';
  v_partner_user_id uuid;
  v_opp2_user_id uuid;
  v_sets jsonb;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if v_uid = p_opponent_user_id then raise exception 'cannot_request_self'; end if;
  if not exists (
    select 1 from users u where u.id = p_opponent_user_id and u.is_guest = false and u.deleted_at is null
  ) then
    raise exception 'invalid_opponent';
  end if;

  if p_set_scores is not null and jsonb_typeof(p_set_scores) = 'array' and jsonb_array_length(p_set_scores) > 0 then
    if not public.validate_set_scores(p_set_scores) then
      raise exception 'invalid_set_scores';
    end if;
    v_sets := public.normalize_set_scores(p_set_scores, v_is_doubles);
  else
    v_sets := '[]'::jsonb;
  end if;

  if v_is_doubles then
    if p_partner is null or p_opponent2 is null
       or coalesce(p_partner->>'name','') = '' or coalesce(p_opponent2->>'name','') = '' then
      raise exception 'doubles_players_required';
    end if;
    v_partner_user_id := nullif(p_partner->>'user_id','')::uuid;
    v_opp2_user_id := nullif(p_opponent2->>'user_id','')::uuid;
    if v_partner_user_id is not null and v_partner_user_id in (v_uid, p_opponent_user_id) then
      raise exception 'invalid_partner';
    end if;
    if v_opp2_user_id is not null and v_opp2_user_id in (v_uid, p_opponent_user_id) then
      raise exception 'invalid_opponent2';
    end if;
    if v_partner_user_id is not null and v_opp2_user_id is not null and v_partner_user_id = v_opp2_user_id then
      raise exception 'duplicate_players';
    end if;
  end if;

  insert into match_requests (id, requester_id, opponent_user_id, played_at, played_time, match_type, surface, notes, set_scores)
  values (v_id, v_uid, p_opponent_user_id, p_played_at, p_played_time, p_match_type, p_surface, p_notes, v_sets);

  if v_is_doubles then
    insert into match_request_participants (request_id, role, user_id, name, dominant_hand, ntrp_snapshot)
    values (v_id, 'partner', v_partner_user_id, p_partner->>'name', nullif(p_partner->>'dominant_hand',''), nullif(p_partner->>'ntrp','')::numeric);
    insert into match_request_participants (request_id, role, user_id, name, dominant_hand, ntrp_snapshot)
    values (v_id, 'opponent2', v_opp2_user_id, p_opponent2->>'name', nullif(p_opponent2->>'dominant_hand',''), nullif(p_opponent2->>'ntrp','')::numeric);
  end if;

  return v_id;
end;
$$;

revoke all on function public.create_match_request(uuid, date, time, text, text, text, jsonb, jsonb, jsonb) from public;
grant execute on function public.create_match_request(uuid, date, time, text, text, text, jsonb, jsonb, jsonb) to authenticated;
