-- 20260519040229 dashboard_stats_v2
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16

-- ============================================================
-- 1. get_user_match_stats_v2
--    4분기(단식/남복/여복/혼복) + sets_won/sets_lost 집계
-- ============================================================
create or replace function public.get_user_match_stats_v2(p_user_id uuid)
returns json
language sql
stable
security invoker
as $$
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
    count(*)::int                                                                  as matches,
    count(*) filter (where winner_id = my_side)::int                               as wins,
    count(*) filter (where winner_id is not null
                       and winner_id <> 'draw'
                       and winner_id <> my_side)::int                              as losses,
    count(*) filter (where winner_id = 'draw')::int                                as draws,
    coalesce(sum(sets_won), 0)::int                                                as sets_won,
    coalesce(sum(sets_lost), 0)::int                                               as sets_lost
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

grant execute on function public.get_user_match_stats_v2(uuid) to authenticated;

-- ============================================================
-- 2. get_user_doubles_court_stats
--    복식 기준 애드/듀스 코트별 승패 집계
-- ============================================================
create or replace function public.get_user_doubles_court_stats(p_user_id uuid)
returns json
language sql
stable
security invoker
as $$
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
    and (
      p_user_id = any(coalesce(m.team1, '{}'))
      or p_user_id = any(coalesce(m.team2, '{}'))
    )
),
agg as (
  select
    court,
    count(*)::int                                                                  as matches,
    count(*) filter (where winner_id = my_side)::int                               as wins,
    count(*) filter (where winner_id is not null
                       and winner_id <> 'draw'
                       and winner_id <> my_side)::int                              as losses,
    count(*) filter (where winner_id = 'draw')::int                                as draws
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

grant execute on function public.get_user_doubles_court_stats(uuid) to authenticated;

-- ============================================================
-- 3. get_user_partner_stats
--    복식 경기에서 같은 팀에 있던 파트너별 전적 집계
-- ============================================================
create or replace function public.get_user_partner_stats(p_user_id uuid)
returns table (
  partner_id uuid,
  matches    int,
  wins       int,
  losses     int,
  draws      int
)
language sql
stable
security invoker
as $$
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
  pid                                                                              as partner_id,
  count(*)::int                                                                    as matches,
  count(*) filter (where winner_id = my_side)::int                                 as wins,
  count(*) filter (where winner_id is not null
                     and winner_id <> 'draw'
                     and winner_id <> my_side)::int                               as losses,
  count(*) filter (where winner_id = 'draw')::int                                  as draws
from unnested
where pid <> p_user_id
group by pid
order by matches desc;
$$;

grant execute on function public.get_user_partner_stats(uuid) to authenticated;

