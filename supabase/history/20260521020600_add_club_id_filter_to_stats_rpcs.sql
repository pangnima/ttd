-- 20260521020600 add_club_id_filter_to_stats_rpcs
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
-- 1. user_match_participations 뷰에 club_id 컬럼 추가 (security_invoker=on 유지)
CREATE OR REPLACE VIEW public.user_match_participations
WITH (security_invoker = on) AS
  SELECT m.id AS match_id,
    m.match_type,
    m.player1_id AS user_id,
    CASE
      WHEN m.winner_id = 'team1' THEN 'win'::text
      WHEN m.winner_id = 'team2' THEN 'loss'::text
      WHEN m.winner_id = 'draw' THEN 'draw'::text
      ELSE NULL::text
    END AS result,
    g.club_id
  FROM match_game_matches m
  JOIN match_games g ON g.id = m.match_game_id
  WHERE m.match_type = 'singles' AND m.status = 'finished' AND m.player1_id IS NOT NULL
UNION ALL
  SELECT m.id AS match_id,
    m.match_type,
    m.player2_id AS user_id,
    CASE
      WHEN m.winner_id = 'team2' THEN 'win'::text
      WHEN m.winner_id = 'team1' THEN 'loss'::text
      WHEN m.winner_id = 'draw' THEN 'draw'::text
      ELSE NULL::text
    END AS result,
    g.club_id
  FROM match_game_matches m
  JOIN match_games g ON g.id = m.match_game_id
  WHERE m.match_type = 'singles' AND m.status = 'finished' AND m.player2_id IS NOT NULL
UNION ALL
  SELECT m.id AS match_id,
    m.match_type,
    unnest(m.team1) AS user_id,
    CASE
      WHEN m.winner_id = 'team1' THEN 'win'::text
      WHEN m.winner_id = 'team2' THEN 'loss'::text
      WHEN m.winner_id = 'draw' THEN 'draw'::text
      ELSE NULL::text
    END AS result,
    g.club_id
  FROM match_game_matches m
  JOIN match_games g ON g.id = m.match_game_id
  WHERE m.match_type <> 'singles' AND m.status = 'finished' AND m.team1 IS NOT NULL
UNION ALL
  SELECT m.id AS match_id,
    m.match_type,
    unnest(m.team2) AS user_id,
    CASE
      WHEN m.winner_id = 'team2' THEN 'win'::text
      WHEN m.winner_id = 'team1' THEN 'loss'::text
      WHEN m.winner_id = 'draw' THEN 'draw'::text
      ELSE NULL::text
    END AS result,
    g.club_id
  FROM match_game_matches m
  JOIN match_games g ON g.id = m.match_game_id
  WHERE m.match_type <> 'singles' AND m.status = 'finished' AND m.team2 IS NOT NULL;

-- 2. get_user_head_to_head: p_club_id 선택적 파라미터 추가
CREATE OR REPLACE FUNCTION public.get_user_head_to_head(
  p_user_id uuid,
  p_club_id uuid default null
)
RETURNS TABLE(opponent_id uuid, matches integer, wins integer, losses integer, draws integer)
LANGUAGE sql STABLE
AS $$
  WITH me AS (
    SELECT match_id, result
    FROM user_match_participations
    WHERE user_id = p_user_id
      AND match_type = 'singles'
      AND (p_club_id IS NULL OR club_id = p_club_id)
  ),
  opp AS (
    SELECT p.match_id, p.user_id AS opponent_id
    FROM user_match_participations p
    JOIN me ON me.match_id = p.match_id
    WHERE p.user_id <> p_user_id AND p.match_type = 'singles'
  )
  SELECT
    opp.opponent_id,
    COUNT(*)::int AS matches,
    COUNT(*) FILTER (WHERE me.result = 'win')::int AS wins,
    COUNT(*) FILTER (WHERE me.result = 'loss')::int AS losses,
    COUNT(*) FILTER (WHERE me.result = 'draw')::int AS draws
  FROM opp
  JOIN me USING (match_id)
  GROUP BY opp.opponent_id
  ORDER BY matches DESC;
$$;

-- 3. get_user_match_stats_v2: p_club_id 선택적 파라미터 추가
CREATE OR REPLACE FUNCTION public.get_user_match_stats_v2(
  p_user_id uuid,
  p_club_id uuid default null
)
RETURNS json LANGUAGE sql STABLE
AS $$
with base as (
  select
    m.id as match_id,
    m.match_type,
    case
      when m.match_type = 'singles' and m.player1_id = p_user_id then 'team1'
      when m.match_type = 'singles' and m.player2_id = p_user_id then 'team2'
      when m.match_type <> 'singles'
           and p_user_id = any(coalesce(m.team1, '{}')) then 'team1'
      when m.match_type <> 'singles'
           and p_user_id = any(coalesce(m.team2, '{}')) then 'team2'
    end as my_side,
    m.winner_id,
    m.result_sets
  from public.match_game_matches m
  join public.match_games g on g.id = m.match_game_id
  where g.is_fixed = true
    and m.status = 'finished'
    and (p_club_id is null or g.club_id = p_club_id)
    and (
      m.player1_id = p_user_id
      or m.player2_id = p_user_id
      or p_user_id = any(coalesce(m.team1, '{}'))
      or p_user_id = any(coalesce(m.team2, '{}'))
    )
),
sets_per_match as (
  select
    b.match_id,
    b.match_type,
    b.my_side,
    b.winner_id,
    coalesce(
      (select sum(
         case when b.my_side = 'team1' then (s->>'team1')::int
              else (s->>'team2')::int end
       ) from jsonb_array_elements(coalesce(b.result_sets, '[]'::jsonb)) s),
      0
    ) as sets_won,
    coalesce(
      (select sum(
         case when b.my_side = 'team1' then (s->>'team2')::int
              else (s->>'team1')::int end
       ) from jsonb_array_elements(coalesce(b.result_sets, '[]'::jsonb)) s),
      0
    ) as sets_lost
  from base b
  where b.my_side is not null
),
agg as (
  select
    match_type,
    count(*)::int as matches,
    count(*) filter (where winner_id = my_side)::int as wins,
    count(*) filter (where winner_id is not null
                       and winner_id <> 'draw'
                       and winner_id <> my_side)::int as losses,
    count(*) filter (where winner_id = 'draw')::int as draws,
    coalesce(sum(sets_won), 0)::int as sets_won,
    coalesce(sum(sets_lost), 0)::int as sets_lost
  from sets_per_match
  group by match_type
),
empty_stat as (
  select json_build_object(
    'matches', 0, 'wins', 0, 'losses', 0, 'draws', 0, 'sets_won', 0, 'sets_lost', 0
  ) as val
)
select json_build_object(
  'singles',
    coalesce((select row_to_json(a) from agg a where a.match_type = 'singles'),
             (select val from empty_stat)),
  'men_doubles',
    coalesce((select row_to_json(a) from agg a where a.match_type = 'men_doubles'),
             (select val from empty_stat)),
  'women_doubles',
    coalesce((select row_to_json(a) from agg a where a.match_type = 'women_doubles'),
             (select val from empty_stat)),
  'mixed_doubles',
    coalesce((select row_to_json(a) from agg a where a.match_type = 'mixed_doubles'),
             (select val from empty_stat))
);
$$;

-- 4. get_user_doubles_court_stats: p_club_id 선택적 파라미터 추가
CREATE OR REPLACE FUNCTION public.get_user_doubles_court_stats(
  p_user_id uuid,
  p_club_id uuid default null
)
RETURNS json LANGUAGE sql STABLE
AS $$
with base as (
  select
    case
      when p_user_id = any(coalesce(m.team1, '{}')) then 'team1'
      when p_user_id = any(coalesce(m.team2, '{}')) then 'team2'
    end as my_side,
    case
      when p_user_id = any(coalesce(m.team1, '{}'))
           and m.team1_ad_player_id = p_user_id then 'ad'
      when p_user_id = any(coalesce(m.team2, '{}'))
           and m.team2_ad_player_id = p_user_id then 'ad'
      else 'deuce'
    end as court,
    m.winner_id
  from public.match_game_matches m
  join public.match_games g on g.id = m.match_game_id
  where g.is_fixed = true
    and m.status = 'finished'
    and m.match_type in ('men_doubles', 'women_doubles', 'mixed_doubles')
    and (p_club_id is null or g.club_id = p_club_id)
    and (
      p_user_id = any(coalesce(m.team1, '{}'))
      or p_user_id = any(coalesce(m.team2, '{}'))
    )
),
agg as (
  select
    court,
    count(*)::int as matches,
    count(*) filter (where winner_id = my_side)::int as wins,
    count(*) filter (where winner_id is not null
                       and winner_id <> 'draw'
                       and winner_id <> my_side)::int as losses,
    count(*) filter (where winner_id = 'draw')::int as draws
  from base
  where my_side is not null
  group by court
),
empty_stat as (
  select json_build_object('matches', 0, 'wins', 0, 'losses', 0, 'draws', 0) as val
)
select json_build_object(
  'ad',
    coalesce((select row_to_json(a) from agg a where a.court = 'ad'),
             (select val from empty_stat)),
  'deuce',
    coalesce((select row_to_json(a) from agg a where a.court = 'deuce'),
             (select val from empty_stat))
);
$$;

-- 5. get_user_partner_stats: p_club_id 선택적 파라미터 추가
CREATE OR REPLACE FUNCTION public.get_user_partner_stats(
  p_user_id uuid,
  p_club_id uuid default null
)
RETURNS TABLE(partner_id uuid, matches integer, wins integer, losses integer, draws integer)
LANGUAGE sql STABLE
AS $$
with base as (
  select
    case
      when p_user_id = any(coalesce(m.team1, '{}')) then 'team1'
      when p_user_id = any(coalesce(m.team2, '{}')) then 'team2'
    end as my_side,
    case
      when p_user_id = any(coalesce(m.team1, '{}')) then m.team1
      else m.team2
    end as my_team,
    m.winner_id
  from public.match_game_matches m
  join public.match_games g on g.id = m.match_game_id
  where g.is_fixed = true
    and m.status = 'finished'
    and m.match_type in ('men_doubles', 'women_doubles', 'mixed_doubles')
    and (p_club_id is null or g.club_id = p_club_id)
    and (
      p_user_id = any(coalesce(m.team1, '{}'))
      or p_user_id = any(coalesce(m.team2, '{}'))
    )
),
unnested as (
  select unnest(my_team) as pid, my_side, winner_id
  from base
  where my_side is not null
)
select
  pid as partner_id,
  count(*)::int as matches,
  count(*) filter (where winner_id = my_side)::int as wins,
  count(*) filter (where winner_id is not null
                     and winner_id <> 'draw'
                     and winner_id <> my_side)::int as losses,
  count(*) filter (where winner_id = 'draw')::int as draws
from unnested
where pid <> p_user_id
group by pid
order by matches desc;
$$;
