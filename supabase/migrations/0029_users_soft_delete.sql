-- 0029_users_soft_delete.sql
--- 계정(서비스) 탈퇴를 soft delete(익명화) 방식으로 처리하기 위한 마킹 컬럼.
--- 물리 삭제는 match_game_matches(SET NULL)·club_player_ratings(CASCADE) 등 과거 경기/레이팅을
--- 손상시키므로, users 행을 보존하고 개인정보만 익명화한 뒤 deleted_at에 탈퇴 시각을 기록한다.
--- 로그인 가드에서 deleted_at IS NOT NULL이면 재로그인을 차단한다. 미탈퇴=null.

alter table public.users
  add column deleted_at timestamptz;
