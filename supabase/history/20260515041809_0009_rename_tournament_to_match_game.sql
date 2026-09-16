-- 20260515041809 0009_rename_tournament_to_match_game
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16

-- 1. 테이블 이름 변경 (자식 → 부모 순서로, FK는 OID 기반이라 순서 무관하지만 명확성을 위해)
ALTER TABLE tournament_games    RENAME TO match_game_matches;
ALTER TABLE tournament_time_slots RENAME TO match_game_time_slots;
ALTER TABLE tournament_courts   RENAME TO match_game_courts;
ALTER TABLE tournament_rounds   RENAME TO match_game_rounds;
ALTER TABLE tournaments         RENAME TO match_games;

-- 2. tournament_id 컬럼 이름 변경 (자식 3개 테이블 — time_slots는 round_id만 존재)
ALTER TABLE match_game_matches RENAME COLUMN tournament_id TO match_game_id;
ALTER TABLE match_game_courts  RENAME COLUMN tournament_id TO match_game_id;
ALTER TABLE match_game_rounds  RENAME COLUMN tournament_id TO match_game_id;

-- 3. FK 제약 이름 변경
ALTER TABLE match_games          RENAME CONSTRAINT tournaments_club_id_fkey               TO match_games_club_id_fkey;
ALTER TABLE match_game_courts    RENAME CONSTRAINT tournament_courts_tournament_id_fkey    TO match_game_courts_match_game_id_fkey;
ALTER TABLE match_game_rounds    RENAME CONSTRAINT tournament_rounds_tournament_id_fkey    TO match_game_rounds_match_game_id_fkey;
ALTER TABLE match_game_time_slots RENAME CONSTRAINT tournament_time_slots_round_id_fkey   TO match_game_time_slots_round_id_fkey;
ALTER TABLE match_game_matches   RENAME CONSTRAINT tournament_games_tournament_id_fkey     TO match_game_matches_match_game_id_fkey;
ALTER TABLE match_game_matches   RENAME CONSTRAINT tournament_games_round_id_fkey          TO match_game_matches_round_id_fkey;
ALTER TABLE match_game_matches   RENAME CONSTRAINT tournament_games_court_id_fkey          TO match_game_matches_court_id_fkey;
ALTER TABLE match_game_matches   RENAME CONSTRAINT tournament_games_time_slot_id_fkey      TO match_game_matches_time_slot_id_fkey;
ALTER TABLE match_game_matches   RENAME CONSTRAINT tournament_games_player1_id_fkey        TO match_game_matches_player1_id_fkey;
ALTER TABLE match_game_matches   RENAME CONSTRAINT tournament_games_player2_id_fkey        TO match_game_matches_player2_id_fkey;

-- 4. RLS 정책 이름 변경 (테이블 RENAME 후에는 새 테이블명으로 참조)
ALTER POLICY tournaments_select  ON match_games RENAME TO match_games_select;
ALTER POLICY tournaments_insert  ON match_games RENAME TO match_games_insert;
ALTER POLICY tournaments_update  ON match_games RENAME TO match_games_update;
ALTER POLICY tournaments_delete  ON match_games RENAME TO match_games_delete;

ALTER POLICY tournament_courts_select ON match_game_courts RENAME TO match_game_courts_select;
ALTER POLICY tournament_courts_insert ON match_game_courts RENAME TO match_game_courts_insert;
ALTER POLICY tournament_courts_update ON match_game_courts RENAME TO match_game_courts_update;
ALTER POLICY tournament_courts_delete ON match_game_courts RENAME TO match_game_courts_delete;

ALTER POLICY tournament_rounds_select ON match_game_rounds RENAME TO match_game_rounds_select;
ALTER POLICY tournament_rounds_insert ON match_game_rounds RENAME TO match_game_rounds_insert;
ALTER POLICY tournament_rounds_update ON match_game_rounds RENAME TO match_game_rounds_update;
ALTER POLICY tournament_rounds_delete ON match_game_rounds RENAME TO match_game_rounds_delete;

ALTER POLICY tournament_time_slots_select ON match_game_time_slots RENAME TO match_game_time_slots_select;
ALTER POLICY tournament_time_slots_insert ON match_game_time_slots RENAME TO match_game_time_slots_insert;
ALTER POLICY tournament_time_slots_update ON match_game_time_slots RENAME TO match_game_time_slots_update;
ALTER POLICY tournament_time_slots_delete ON match_game_time_slots RENAME TO match_game_time_slots_delete;

ALTER POLICY tournament_games_select ON match_game_matches RENAME TO match_game_matches_select;
ALTER POLICY tournament_games_insert ON match_game_matches RENAME TO match_game_matches_insert;
ALTER POLICY tournament_games_update ON match_game_matches RENAME TO match_game_matches_update;
ALTER POLICY tournament_games_delete ON match_game_matches RENAME TO match_game_matches_delete;

