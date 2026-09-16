-- 20260903093920 personal_match_rotation_group
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
-- 0044_personal_match_rotation_group.sql (레포 supabase/migrations/0044_personal_match_rotation_group.sql 과 동일 본문)
alter table public.personal_matches
  add column rotation_session_id uuid,
  add column group_seq smallint;

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
