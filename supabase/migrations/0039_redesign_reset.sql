-- 0039_redesign_reset.sql
--- DB 재설계(docs/redesign/erd.md) 1단계: users(계정/인증) 제외 전체 초기화.
--- 전제: 프로덕션 실사용자 데이터 없음(배포 전 테스트 데이터만 존재) — plan-task-db-reflective-dewdrop.md 승인.
--- 구조가 바뀌는 3테이블(personal_matches/match_requests/match_game_matches)은 DROP 후 0040에서 재생성.
--- 나머지(clubs/club_members/club_invites/match_games 계열/rotation_sessions/club_player_ratings/
--- club_rating_history/ai_coaching_cache)는 구조 유지, 데이터만 초기화.

-- ── 1) 참가자 비정규화(player1_id/team1 등)에 의존하는 뷰/함수 제거 ──
-- SQL 함수는 뷰 의존성이 pg_depend에 기록되므로 CASCADE로 함께 정리된다.
drop view if exists public.user_match_participations cascade;

-- 아래는 src에서 호출되지 않는 죽은 RPC(CLAUDE.md 명시) — 영구 제거, 0040에서 재생성하지 않음.
drop function if exists public.get_user_match_stats(uuid);
drop function if exists public.get_user_match_stats_unified(uuid, text);
drop function if exists public.get_user_head_to_head_unified(uuid);

-- 아래는 참가자 정규화에 맞춰 0040에서 단일 함수(선택적 p_club_id 기본값)로 재생성한다.
drop function if exists public.get_user_head_to_head(uuid);
drop function if exists public.get_user_head_to_head(uuid, uuid);
drop function if exists public.get_user_match_stats_v2(uuid);
drop function if exists public.get_user_match_stats_v2(uuid, uuid);
drop function if exists public.get_user_doubles_court_stats(uuid);
drop function if exists public.get_user_doubles_court_stats(uuid, uuid);
drop function if exists public.get_user_partner_stats(uuid);
drop function if exists public.get_user_partner_stats(uuid, uuid);
drop function if exists public.get_club_activity_ranking(uuid, timestamptz);
drop function if exists public.get_club_win_rate_ranking(uuid, integer);
drop function if exists public.create_match_game(uuid, text, date, jsonb, jsonb, jsonb);
drop function if exists public.update_match_game(uuid, text, date, jsonb, jsonb, jsonb);
drop function if exists public.accept_match_request(uuid);
drop function if exists public.propose_match_result(uuid, jsonb);
drop function if exists public.confirm_match_result(uuid);
drop function if exists public.dispute_match_result(uuid, text);
drop function if exists public.finalize_rotation_session(uuid, jsonb);

-- 순수 jsonb 함수(personal_match_winner/invert_set_scores/validate_set_scores/normalize_set_scores/
-- derive_public_ntrp)와 is_club_owner/is_club_approved_member/add_guest_player/get_club_member_counts/
-- get_invite_preview/join_club_via_invite/handle_new_user는 컬럼 구조 변경과 무관하므로 그대로 둔다.

-- ── 2) 구조가 바뀌는 테이블 DROP (CASCADE로 정책·FK 함께 제거) ──
-- club_rating_history.match_id → match_game_matches(id) FK는 CASCADE로 제약만 제거되고
-- club_rating_history 테이블 자체는 남는다(0040에서 FK 재생성).
drop table if exists public.personal_matches cascade;
drop table if exists public.match_requests cascade;
drop table if exists public.match_game_matches cascade;

-- ── 3) 구조 유지, 데이터만 초기화 (단일 TRUNCATE로 FK 순서 자동 처리) ──
truncate table
  public.match_game_time_slots,
  public.match_game_rounds,
  public.match_game_courts,
  public.match_games,
  public.club_rating_history,
  public.club_player_ratings,
  public.club_invites,
  public.club_members,
  public.clubs,
  public.rotation_sessions,
  public.ai_coaching_cache;

-- ── 4) 개인 동적 NTRP 캐시 초기화 (users 테이블 자체·다른 컬럼은 유지) ──
update public.users set personal_ntrp = null;
