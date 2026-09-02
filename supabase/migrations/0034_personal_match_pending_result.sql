-- 0034_personal_match_pending_result.sql
--- 개인 경기 "결과 미확정" 상태 도입.
--- 등록 폼에서 세트 스코어 입력을 제거하면서, 세트가 없는 경기는 winner = NULL(미확정)로 저장한다.
--- 미확정 경기는 모든 통계·레이팅 집계에서 제외되며(클라: explodePersonalMatchSets, 서버: 아래 RPC),
--- 세트/결과는 추후 별도 플로우에서 등록한다.
---
--- 1) personal_matches.winner NOT NULL 해제 (기존 CHECK는 NULL을 통과시키므로 유지)
--- 2) match_requests.set_scores 1개 이상 제약 완화 — 세트 없이 확인 요청 가능
--- 3) accept_match_request — 세트 0개면 양측 winner NULL·set_scores '[]' 삽입
--- 4) get_user_match_stats_unified / get_user_head_to_head_unified — 미확정 제외

-- ── 1) personal_matches.winner 미확정 허용 ──
alter table public.personal_matches alter column winner drop not null;

-- ── 2) match_requests.set_scores 세트 없는 요청 허용 ──
alter table public.match_requests drop constraint match_requests_set_scores_check;
alter table public.match_requests
  add constraint match_requests_set_scores_check check (jsonb_typeof(set_scores) = 'array');
alter table public.match_requests alter column set_scores set default '[]'::jsonb;

-- ── 3) 수락 RPC: 세트 0개(미확정) 분기 추가 ──
create or replace function public.accept_match_request(p_request_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_req public.match_requests%rowtype;
  v_requester public.users%rowtype;
  v_acceptor public.users%rowtype;
  v_me_sets int;
  v_opp_sets int;
  v_winner text;
  v_inverted_scores jsonb;
  v_requester_ntrp numeric;
  v_acceptor_ntrp numeric;
begin
  select * into v_req from public.match_requests where id = p_request_id for update;
  if not found then
    raise exception 'request_not_found';
  end if;
  if v_req.status <> 'pending' then
    raise exception 'request_not_pending';
  end if;
  if v_req.opponent_user_id <> auth.uid() then
    raise exception 'not_request_opponent';
  end if;

  select * into v_requester from public.users where id = v_req.requester_id;
  if not found or v_requester.deleted_at is not null then
    raise exception 'requester_deleted';
  end if;
  select * into v_acceptor from public.users where id = v_req.opponent_user_id;

  if jsonb_array_length(v_req.set_scores) = 0 then
    -- 세트 없음 = 결과 미확정. 양측 모두 winner NULL, 빈 세트로 기록한다.
    v_winner := null;
    v_inverted_scores := '[]'::jsonb;
  else
    -- winner 재계산 (요청자 관점, 저장값을 신뢰하지 않음)
    select
      count(*) filter (where (e->>'me')::int > (e->>'opp')::int),
      count(*) filter (where (e->>'opp')::int > (e->>'me')::int)
    into v_me_sets, v_opp_sets
    from jsonb_array_elements(v_req.set_scores) e;
    v_winner := case
      when v_me_sets > v_opp_sets then 'me'
      when v_opp_sets > v_me_sets then 'opponent'
      else 'draw'
    end;

    -- 수락자 관점 스코어 반전 (me ↔ opp, 세트 순서 보존)
    select coalesce(jsonb_agg(jsonb_build_object('me', e->'opp', 'opp', e->'me') order by ord), '[]'::jsonb)
    into v_inverted_scores
    from jsonb_array_elements(v_req.set_scores) with ordinality t(e, ord);
  end if;

  -- 상대 NTRP 파생: 통계 비공개(stats_hidden) 유저는 동적 personal_ntrp를 노출하지 않고
  -- 자가선언 ntrp만 사용. personal_matches의 1.0~7.0 check 밖이면 null.
  v_requester_ntrp := case
    when v_requester.stats_hidden then v_requester.ntrp
    else coalesce(v_requester.personal_ntrp, v_requester.ntrp)
  end;
  if v_requester_ntrp is not null and (v_requester_ntrp < 1 or v_requester_ntrp > 7) then
    v_requester_ntrp := null;
  end if;
  v_acceptor_ntrp := case
    when v_acceptor.stats_hidden then v_acceptor.ntrp
    else coalesce(v_acceptor.personal_ntrp, v_acceptor.ntrp)
  end;
  if v_acceptor_ntrp is not null and (v_acceptor_ntrp < 1 or v_acceptor_ntrp > 7) then
    v_acceptor_ntrp := null;
  end if;

  -- 요청자 행 (원본 관점, notes 포함)
  insert into public.personal_matches
    (user_id, opponent_name, opponent_user_id, opponent_ntrp,
     played_at, played_time, match_type, surface, set_scores, winner, notes, source_request_id)
  values
    (v_req.requester_id, v_acceptor.name, v_acceptor.id, v_acceptor_ntrp,
     v_req.played_at, v_req.played_time, v_req.match_type, v_req.surface,
     v_req.set_scores, v_winner, v_req.notes, v_req.id);

  -- 수락자 행 (반전 관점). 미확정(NULL)은 반전해도 NULL — 기존 `else 'draw'`는 NULL을 무승부로 오염시켰음
  insert into public.personal_matches
    (user_id, opponent_name, opponent_user_id, opponent_ntrp,
     played_at, played_time, match_type, surface, set_scores, winner, notes, source_request_id)
  values
    (v_acceptor.id, v_requester.name, v_requester.id, v_requester_ntrp,
     v_req.played_at, v_req.played_time, v_req.match_type, v_req.surface,
     v_inverted_scores,
     case v_winner when 'me' then 'opponent' when 'opponent' then 'me' when 'draw' then 'draw' else null end,
     null, v_req.id);

  update public.match_requests
  set status = 'accepted', responded_at = now()
  where id = p_request_id;
end;
$$;

revoke all on function public.accept_match_request(uuid) from public;
grant execute on function public.accept_match_request(uuid) to authenticated;

-- ── 4-a) get_user_match_stats_unified — 미확정(winner NULL) 제외 ──
create or replace function public.get_user_match_stats_unified(p_user_id uuid, p_scope text default 'total')
returns json language sql stable as $$
with
club_base as (
    select m.match_type,
        case
            when m.match_type = 'singles' and m.player1_id = p_user_id then 'team1'
            when m.match_type = 'singles' and m.player2_id = p_user_id then 'team2'
            when m.match_type <> 'singles' and p_user_id = any(coalesce(m.team1,'{}')) then 'team1'
            when m.match_type <> 'singles' and p_user_id = any(coalesce(m.team2,'{}')) then 'team2'
        end as my_side,
        m.winner_id, m.result_sets
    from public.match_game_matches m
    join public.match_games g on g.id = m.match_game_id
    where g.is_fixed = true and m.status = 'finished'
      and p_scope in ('total','club')
      and (m.player1_id = p_user_id or m.player2_id = p_user_id
           or p_user_id = any(coalesce(m.team1,'{}'))
           or p_user_id = any(coalesce(m.team2,'{}')))
),
club_rows as (
    select cb.match_type,
        case when cb.winner_id = cb.my_side then 1 else 0 end as is_win,
        case when cb.winner_id is not null and cb.winner_id <> 'draw' and cb.winner_id <> cb.my_side then 1 else 0 end as is_loss,
        case when cb.winner_id = 'draw' then 1 else 0 end as is_draw,
        coalesce((select sum(case when cb.my_side='team1' then (s->>'team1')::int else (s->>'team2')::int end)
                  from jsonb_array_elements(coalesce(cb.result_sets,'[]'::jsonb)) s), 0)::int as sets_won,
        coalesce((select sum(case when cb.my_side='team1' then (s->>'team2')::int else (s->>'team1')::int end)
                  from jsonb_array_elements(coalesce(cb.result_sets,'[]'::jsonb)) s), 0)::int as sets_lost
    from club_base cb where cb.my_side is not null
),
personal_rows as (
    select pm.match_type,
        case when pm.winner = 'me'       then 1 else 0 end as is_win,
        case when pm.winner = 'opponent' then 1 else 0 end as is_loss,
        case when pm.winner = 'draw'     then 1 else 0 end as is_draw,
        coalesce((select sum((s->>'me')::int)  from jsonb_array_elements(coalesce(pm.set_scores,'[]'::jsonb)) s), 0)::int as sets_won,
        coalesce((select sum((s->>'opp')::int) from jsonb_array_elements(coalesce(pm.set_scores,'[]'::jsonb)) s), 0)::int as sets_lost
    from public.personal_matches pm
    where pm.user_id = p_user_id and p_scope in ('total','personal')
      and pm.winner is not null  -- 결과 미확정 제외
),
combined as (select * from club_rows union all select * from personal_rows),
agg as (
    select match_type,
        count(*)::int as matches,
        sum(is_win)::int as wins, sum(is_loss)::int as losses, sum(is_draw)::int as draws,
        coalesce(sum(sets_won),0)::int as sets_won, coalesce(sum(sets_lost),0)::int as sets_lost
    from combined group by match_type
),
empty_stat as (select json_build_object('matches',0,'wins',0,'losses',0,'draws',0,'sets_won',0,'sets_lost',0) as val)
select json_build_object(
    'singles',       coalesce((select row_to_json(a) from agg a where a.match_type='singles'),       (select val from empty_stat)),
    'men_doubles',   coalesce((select row_to_json(a) from agg a where a.match_type='men_doubles'),   (select val from empty_stat)),
    'women_doubles', coalesce((select row_to_json(a) from agg a where a.match_type='women_doubles'), (select val from empty_stat)),
    'mixed_doubles', coalesce((select row_to_json(a) from agg a where a.match_type='mixed_doubles'), (select val from empty_stat))
);
$$;

-- ── 4-b) get_user_head_to_head_unified — 미확정(winner NULL) 제외 ──
--- (0016에는 주석 요약만 있던 정의를 서버 원문 기준으로 리포에 수록)
create or replace function public.get_user_head_to_head_unified(p_user_id uuid)
returns table(opponent_user_id uuid, opponent_name text, matches integer, wins integer, losses integer, draws integer, sets_won integer, sets_lost integer)
language sql stable as $$
with
club_base as (
    select
        m.id as match_id,
        m.match_type,
        m.winner_id,
        m.result_sets,
        m.player1_id,
        m.player2_id,
        m.team1,
        m.team2,
        case
            when m.match_type = 'singles' and m.player1_id = p_user_id then 'team1'
            when m.match_type = 'singles' and m.player2_id = p_user_id then 'team2'
            when m.match_type <> 'singles' and p_user_id = any(coalesce(m.team1, '{}')) then 'team1'
            when m.match_type <> 'singles' and p_user_id = any(coalesce(m.team2, '{}')) then 'team2'
        end as my_side
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
club_sets as (
    select
        cb.match_id,
        cb.my_side,
        cb.winner_id,
        coalesce(
            (select sum(case when cb.my_side = 'team1' then (s->>'team1')::int else (s->>'team2')::int end)
             from jsonb_array_elements(coalesce(cb.result_sets, '[]'::jsonb)) s), 0
        )::int as sets_won,
        coalesce(
            (select sum(case when cb.my_side = 'team1' then (s->>'team2')::int else (s->>'team1')::int end)
             from jsonb_array_elements(coalesce(cb.result_sets, '[]'::jsonb)) s), 0
        )::int as sets_lost
    from club_base cb
    where cb.my_side is not null
),
club_vs as (
    select
        cb.match_id,
        unnest(
            case
                when cb.match_type = 'singles' then
                    case cb.my_side
                        when 'team1' then array[cb.player2_id]
                        else array[cb.player1_id]
                    end
                else
                    case cb.my_side
                        when 'team1' then coalesce(cb.team2, '{}')
                        else coalesce(cb.team1, '{}')
                    end
            end
        ) as opp_id
    from club_base cb
    where cb.my_side is not null
),
club_agg as (
    select
        cv.opp_id as opponent_user_id,
        count(*)::int as matches,
        count(*) filter (where cs.winner_id = cs.my_side)::int as wins,
        count(*) filter (where cs.winner_id is not null and cs.winner_id <> 'draw' and cs.winner_id <> cs.my_side)::int as losses,
        count(*) filter (where cs.winner_id = 'draw')::int as draws,
        coalesce(sum(cs.sets_won), 0)::int as sets_won,
        coalesce(sum(cs.sets_lost), 0)::int as sets_lost
    from club_vs cv
    join club_sets cs on cs.match_id = cv.match_id
    where cv.opp_id is not null and cv.opp_id <> p_user_id
    group by cv.opp_id
),
personal_agg as (
    select
        pm.opponent_user_id,
        pm.opponent_name,
        count(*)::int as matches,
        count(*) filter (where pm.winner = 'me')::int as wins,
        count(*) filter (where pm.winner = 'opponent')::int as losses,
        count(*) filter (where pm.winner = 'draw')::int as draws,
        coalesce(sum(
            coalesce((select sum((s->>'me')::int) from jsonb_array_elements(coalesce(pm.set_scores, '[]'::jsonb)) s), 0)
        ), 0)::int as sets_won,
        coalesce(sum(
            coalesce((select sum((s->>'opp')::int) from jsonb_array_elements(coalesce(pm.set_scores, '[]'::jsonb)) s), 0)
        ), 0)::int as sets_lost
    from public.personal_matches pm
    where pm.user_id = p_user_id
      and pm.winner is not null  -- 결과 미확정 제외
    group by pm.opponent_user_id, pm.opponent_name
),
matched as (
    select
        ca.opponent_user_id,
        (ca.matches + pa.matches)::int as matches,
        (ca.wins + pa.wins)::int as wins,
        (ca.losses + pa.losses)::int as losses,
        (ca.draws + pa.draws)::int as draws,
        (ca.sets_won + pa.sets_won)::int as sets_won,
        (ca.sets_lost + pa.sets_lost)::int as sets_lost
    from club_agg ca
    join personal_agg pa on pa.opponent_user_id = ca.opponent_user_id
),
club_only as (
    select ca.opponent_user_id, ca.matches, ca.wins, ca.losses, ca.draws, ca.sets_won, ca.sets_lost
    from club_agg ca
    where not exists (select 1 from personal_agg pa where pa.opponent_user_id = ca.opponent_user_id)
),
personal_user_only as (
    select pa.opponent_user_id, pa.matches, pa.wins, pa.losses, pa.draws, pa.sets_won, pa.sets_lost
    from personal_agg pa
    where pa.opponent_user_id is not null
      and not exists (select 1 from club_agg ca where ca.opponent_user_id = pa.opponent_user_id)
),
personal_text_only as (
    select pa.opponent_user_id, pa.opponent_name, pa.matches, pa.wins, pa.losses, pa.draws, pa.sets_won, pa.sets_lost
    from personal_agg pa
    where pa.opponent_user_id is null
),
all_entries as (
    select opponent_user_id, null::text as opp_name, matches, wins, losses, draws, sets_won, sets_lost from matched
    union all
    select opponent_user_id, null::text, matches, wins, losses, draws, sets_won, sets_lost from club_only
    union all
    select opponent_user_id, null::text, matches, wins, losses, draws, sets_won, sets_lost from personal_user_only
    union all
    select opponent_user_id, opponent_name, matches, wins, losses, draws, sets_won, sets_lost from personal_text_only
)
select
    ae.opponent_user_id,
    coalesce(u.name, ae.opp_name) as opponent_name,
    ae.matches,
    ae.wins,
    ae.losses,
    ae.draws,
    ae.sets_won,
    ae.sets_lost
from all_entries ae
left join public.users u on u.id = ae.opponent_user_id
order by ae.matches desc;
$$;
