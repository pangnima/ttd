-- 0090: 타인 프로필의 공개 개인 전적 (F-24, Week 63)
--
-- 타인 프로필은 그동안 클럽 대진표(match_games)만 집계했다 — 클럽이 동결·픽스처라 누구를 열어도
-- 「0 경기」였고, 통계 공개/비공개 스위치의 뜻이 사라져 있었다. 개인 경기는 `personal_matches_select`가
-- 본인 행뿐이라 앱 조회로는 남의 것을 읽을 수 없다. 그래서 definer RPC가 **확정된** 개인 경기 행을
-- 참가자와 함께 돌려주고, 앱은 본인 개인 탭과 같은 순수 집계를 그대로 돌린다(카드 한 벌을 두 화면이 공유).
--
-- 가드: 로그인 필수 / 대상이 탈퇴했거나 통계를 비공개했으면 빈 배열(`derive_public_ntrp` 0038과 같은 술어).
-- 행 모양은 `select('*, participants:personal_match_participants(*)')`와 같다 — `mapPersonalMatchRow`를 그대로 쓴다.
-- 관점 복사본(is_perspective)도 그대로 준다: 본인 탭의 조회도 관점 행을 포함하며, 그것이 "내 기록"이다.

create or replace function public.get_public_personal_matches(p_user_id uuid)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select case
    when auth.uid() is null then null
    when not exists (
      select 1 from public.users u
      where u.id = p_user_id and u.deleted_at is null and not coalesce(u.stats_hidden, false)
    ) then '[]'::jsonb
    else coalesce((
      select jsonb_agg(
        to_jsonb(pm) || jsonb_build_object(
          'participants', coalesce((
            select jsonb_agg(to_jsonb(pp) order by pp.role)
            from public.personal_match_participants pp where pp.match_id = pm.id
          ), '[]'::jsonb)
        )
        order by pm.played_at desc, pm.played_time desc nulls last, pm.group_seq asc nulls last
      )
      from public.personal_matches pm
      where pm.user_id = p_user_id and pm.has_result
    ), '[]'::jsonb)
  end;
$$;

revoke all on function public.get_public_personal_matches(uuid) from public, anon;
grant execute on function public.get_public_personal_matches(uuid) to authenticated;
