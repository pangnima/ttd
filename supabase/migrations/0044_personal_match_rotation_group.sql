-- 0044_personal_match_rotation_group.sql
--- 로테이션 세션에서 분해된 게임들을 목록에서 한 묶음으로 보여주기 위한 그룹 키.
--- finalize_rotation_session은 세션 행을 삭제(0042 delete … returning)하므로 게임 행에 세션 id를 남기지 않으면
--- 사후에 "같은 로테이션"을 복원할 수 없었다. 또한 한 트랜잭션에서 insert된 행들은 created_at이 모두 같아
--- 게임 순서도 복원 불가 → 루프 순번(group_seq)을 함께 기록한다.
---
--- rotation_session_id는 FK를 두지 않는다(세션 행은 finalize 시점에 사라지는 tombstone id). 조회는 user_id로
--- 한 번에 가져와 앱에서 묶으므로 별도 인덱스도 두지 않는다.
---
--- 동호인 복식은 게임 1건 = 스코어 1줄이므로 finalize는 게임당 세트 배열 길이 1만 허용한다(클라·액션·RPC 3중 방어).
--- 이미 저장된 멀티세트 로테이션 행은 그대로 두고 화면에서 줄 N개로 표시한다.
---
--- 레거시 백필: source_type='rotation'이면서 세션 id가 없는 행은 (user_id, created_at)이 같으면 같은 finalize에서
--- 나온 것이므로 그룹마다 새 uuid를 부여하고 id 순으로 순번을 매긴다(원래 입력 순서는 복원 불가).

-- ── 1) 컬럼 추가 ──
alter table public.personal_matches
  add column rotation_session_id uuid,
  add column group_seq smallint;

-- ── 2) finalize_rotation_session — 세션 id·순번 기록 + 게임당 스코어 1줄 강제 (그 외 0043과 동일) ──
create or replace function public.finalize_rotation_session(p_session_id uuid, p_games jsonb)
returns void
language plpgsql
as $$
declare
  v_s rotation_sessions%rowtype;
  g jsonb;
  v_sets jsonb;
  v_match_id uuid;
  v_seq int := 0;
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
    -- 게임 1건 = 스코어 1줄
    if jsonb_typeof(g->'sets') <> 'array' or jsonb_array_length(g->'sets') <> 1
       or not public.validate_set_scores(g->'sets') then
      raise exception 'invalid_set_scores';
    end if;
    v_sets := public.normalize_set_scores(g->'sets', true);
    v_match_id := gen_random_uuid();
    v_seq := v_seq + 1;

    insert into personal_matches
      (id, user_id, source_type, played_at, played_time, match_type, surface, set_scores, winner, notes, court_name,
       rotation_session_id, group_seq)
    values
      (v_match_id, v_s.user_id, 'rotation', v_s.played_at, v_s.played_time, v_s.match_type, v_s.surface, v_sets,
       public.personal_match_winner(v_sets), v_s.notes, v_s.court_name, p_session_id, v_seq);

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

-- ── 3) 레거시 로테이션 행 백필 — 같은 (user_id, created_at) = 같은 finalize ──
with grp as (
  select user_id, created_at, gen_random_uuid() as sid
  from public.personal_matches
  where source_type = 'rotation' and rotation_session_id is null
  group by user_id, created_at
),
seq as (
  select id, row_number() over (partition by user_id, created_at order by id) as rn
  from public.personal_matches
  where source_type = 'rotation' and rotation_session_id is null
)
update public.personal_matches p
set rotation_session_id = grp.sid, group_seq = seq.rn
from grp, seq
where p.id = seq.id and p.user_id = grp.user_id and p.created_at = grp.created_at;
