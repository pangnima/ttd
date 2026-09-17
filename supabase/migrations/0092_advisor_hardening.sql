-- 0092_advisor_hardening.sql
-- Week 70 보안·성능 잔여 — Supabase advisors(security·performance, 2026-09-16 dev 기준)가 지적한 것을 한 번에 닫는다.
-- 스키마·동작 변경 없음(함수 본문·정책의 뜻은 그대로). dev 롤백 스모크 → dev → prod 순서로 적용한다.
--
-- ① search_path 미설정 함수 10종 — SECURITY DEFINER가 아니어도 검색 경로가 비어 있으면 호출자의 스키마에서
--    같은 이름의 객체를 먼저 찾는다(search_path 하이재킹). 레포 규칙(pgcrypto 관용구)과 같은 값으로 고정한다.
alter function public.derive_public_ntrp(p_user users) set search_path = public, extensions;
alter function public.get_user_doubles_court_stats(p_user_id uuid, p_club_id uuid) set search_path = public, extensions;
alter function public.get_user_head_to_head(p_user_id uuid, p_club_id uuid) set search_path = public, extensions;
alter function public.get_user_match_stats_v2(p_user_id uuid, p_club_id uuid) set search_path = public, extensions;
alter function public.get_user_partner_stats(p_user_id uuid, p_club_id uuid) set search_path = public, extensions;
alter function public.invert_set_scores(p_sets jsonb) set search_path = public, extensions;
alter function public.normalize_set_scores(p_sets jsonb, p_keep_ad boolean) set search_path = public, extensions;
alter function public.swap_opponent_perspective(p_sets jsonb) set search_path = public, extensions;
alter function public.swap_partner_perspective(p_sets jsonb) set search_path = public, extensions;
alter function public.validate_set_scores(p_sets jsonb) set search_path = public, extensions;

-- ② anon EXECUTE 회수 — 클럽 동결 UI(Week 69에 삭제, 태그 frozen-clubs-ui-2026-09-16)의 잔재 RPC.
--    화면이 없어져 부를 곳이 없는데 열려 있으면 curl로 직접 부를 수 있다. 의도적 anon 6종은 그대로 둔다:
--    find_login_id · is_email_taken · is_login_id_taken · is_nickname_taken · resolve_login_email · get_invite_preview.
--    is_club_owner_or_officer는 정책식이 부르므로 authenticated는 남긴다(정책은 호출자 권한으로 함수를 실행한다).
--    ⚠ PUBLIC도 함께 회수한다 — 이 함수들은 옛 기본값으로 PUBLIC(=X)에도 EXECUTE가 있어 anon만 빼면 여전히 실행된다
--    (롤백 스모크가 잡았다: from anon만으로는 11건 중 8건이 그대로였다).
revoke execute on function public.add_guest_player(uuid, text) from public, anon;
revoke execute on function public.add_guest_player(uuid, text, text) from public, anon;
revoke execute on function public.apply_club_rating_snapshot(uuid, jsonb) from public, anon;
revoke execute on function public.create_match_game(uuid, text, date, jsonb, jsonb, jsonb) from public, anon;
revoke execute on function public.update_match_game(uuid, text, date, jsonb, jsonb, jsonb) from public, anon;
revoke execute on function public.get_club_activity_ranking(uuid, timestamptz) from public, anon;
revoke execute on function public.get_club_member_counts(uuid[]) from public, anon;
revoke execute on function public.get_club_win_rate_ranking(uuid, integer) from public, anon;
revoke execute on function public.is_club_owner_or_officer(uuid, uuid) from public, anon;
revoke execute on function public.join_club_via_invite(uuid) from public, anon;
-- 트리거 함수 — 트리거는 소유자 권한으로 돌므로 클라이언트 EXECUTE가 필요 없다(0091 관용구).
revoke execute on function public.sync_club_member_count() from public, anon, authenticated;

-- ③ 미인덱스 FK 11건 — FK 검사·cascade·조인이 부모 삭제마다 자식 테이블을 전부 훑는다.
create index if not exists club_invites_created_by_idx on public.club_invites (created_by);
create index if not exists club_player_ratings_user_id_idx on public.club_player_ratings (user_id);
create index if not exists club_rating_history_match_id_idx on public.club_rating_history (match_id);
create index if not exists club_rating_history_user_id_idx on public.club_rating_history (user_id);
create index if not exists clubs_owner_id_idx on public.clubs (owner_id);
create index if not exists match_game_matches_court_id_idx on public.match_game_matches (court_id);
create index if not exists match_game_matches_round_id_idx on public.match_game_matches (round_id);
create index if not exists match_game_matches_time_slot_id_idx on public.match_game_matches (time_slot_id);
create index if not exists match_games_club_id_idx on public.match_games (club_id);
create index if not exists match_result_negotiations_disputed_by_idx on public.match_result_negotiations (disputed_by);
create index if not exists match_result_negotiations_proposed_by_idx on public.match_result_negotiations (proposed_by);

-- ④ RLS 정책의 auth.uid()·auth.role() → (select auth.uid()) — 맨 호출은 **행마다** 다시 평가되고, 서브쿼리로
--    감싸면 initPlan이 되어 쿼리당 한 번만 평가된다(Supabase 권장 관용구). 57건이라 손으로 옮겨 적지 않고
--    pg_policies에서 되읽어 같은 식을 감싸 재작성한다 — 뜻은 그대로이고 dev·prod 스키마가 같아 결과도 같다.
--    이미 감싼 정책은 건너뛰므로 다시 돌려도 안전하다(멱등). 새 정책을 쓸 때도 이 관용구를 따른다.
do $$
declare
    r record;
    ddl text;
begin
    for r in
        select policyname, tablename, qual, with_check
        from pg_policies
        where schemaname = 'public'
          and (coalesce(qual, '') || coalesce(with_check, '')) ~ 'auth\.(uid|role)\(\)'
          -- 감싼 뒤 pg_policies는 `( SELECT auth.uid() AS uid)`로 되돌려 보여 준다 — 대소문자 무관하게 그 모양이면 건너뛴다(멱등)
          and not ((coalesce(qual, '') || coalesce(with_check, '')) ~* 'select\s+auth\.(uid|role)\(\)')
    loop
        ddl := format('alter policy %I on public.%I', r.policyname, r.tablename);
        if r.qual is not null then
            ddl := ddl || ' using (' || replace(replace(r.qual, 'auth.uid()', '(select auth.uid())'), 'auth.role()', '(select auth.role())') || ')';
        end if;
        if r.with_check is not null then
            ddl := ddl || ' with check (' || replace(replace(r.with_check, 'auth.uid()', '(select auth.uid())'), 'auth.role()', '(select auth.role())') || ')';
        end if;
        execute ddl;
    end loop;
end $$;

-- 남겨 둔 것(의도): match_room_secrets RLS 정책 0개(RPC 전용, Week 25), 다중 permissive 정책
-- (match_requests cancel/reject는 서로 다른 당사자의 UPDATE라 갈라 둔 것, club_members ×3·ai_coaching_cache는 동결 영역),
-- 미사용 인덱스 6건(클럽 4건은 동결이라 판단 보류, match_room_guests·match_rooms 2건은 실데이터가 쌓이면 쓰인다),
-- leaked password protection(대시보드 설정 — Authentication › Providers › Email).
