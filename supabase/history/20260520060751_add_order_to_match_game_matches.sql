-- 20260520060751 add_order_to_match_game_matches
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
-- match_game_matches 에 order 컬럼 추가
ALTER TABLE match_game_matches ADD COLUMN "order" integer NOT NULL DEFAULT 0;

-- 기존 데이터 백필: 시간→코트순서→id 기준 안정 시퀀스
WITH ordered AS (
  SELECT m.id,
         row_number() OVER (
           PARTITION BY m.match_game_id
           ORDER BY ts.start_at, c."order", m.id
         ) AS rn
  FROM match_game_matches m
  JOIN match_game_courts c ON c.id = m.court_id
  JOIN match_game_time_slots ts ON ts.id = m.time_slot_id
)
UPDATE match_game_matches m
SET "order" = ordered.rn
FROM ordered
WHERE m.id = ordered.id;

-- create_match_game: WITH ORDINALITY로 배열 위치를 order에 저장
CREATE OR REPLACE FUNCTION public.create_match_game(p_club_id uuid, p_name text, p_date date, p_courts jsonb, p_rounds jsonb, p_matches jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_mg_id     uuid := gen_random_uuid();
    v_court     jsonb;
    v_round     jsonb;
    v_ts        jsonb;
    v_match     jsonb;
    v_ord       int;
    v_court_id  uuid;
    v_round_id  uuid;
    v_ts_id     uuid;
    v_court_map jsonb := '{}'::jsonb;
    v_round_map jsonb := '{}'::jsonb;
    v_ts_map    jsonb := '{}'::jsonb;
BEGIN
    IF NOT is_club_approved_member(p_club_id, auth.uid()) THEN
        RAISE EXCEPTION 'permission denied: not a club member';
    END IF;

    INSERT INTO match_games (id, club_id, name, date)
    VALUES (v_mg_id, p_club_id, p_name, p_date);

    FOR v_court IN SELECT value FROM jsonb_array_elements(p_courts) LOOP
        v_court_id := gen_random_uuid();
        INSERT INTO match_game_courts (id, match_game_id, label, "order")
        VALUES (
            v_court_id,
            v_mg_id,
            v_court->>'label',
            (v_court->>'order')::int
        );
        v_court_map := v_court_map || jsonb_build_object(v_court->>'temp_id', v_court_id::text);
    END LOOP;

    FOR v_round IN SELECT value FROM jsonb_array_elements(p_rounds) LOOP
        v_round_id := gen_random_uuid();
        INSERT INTO match_game_rounds (id, match_game_id, label, "order")
        VALUES (
            v_round_id,
            v_mg_id,
            v_round->>'label',
            (v_round->>'order')::int
        );
        v_round_map := v_round_map || jsonb_build_object(v_round->>'temp_id', v_round_id::text);

        FOR v_ts IN SELECT value FROM jsonb_array_elements(v_round->'time_slots') LOOP
            v_ts_id := gen_random_uuid();
            INSERT INTO match_game_time_slots (id, round_id, start_at, end_at)
            VALUES (
                v_ts_id,
                v_round_id,
                v_ts->>'start_at',
                v_ts->>'end_at'
            );
            v_ts_map := v_ts_map || jsonb_build_object(v_ts->>'temp_id', v_ts_id::text);
        END LOOP;
    END LOOP;

    FOR v_match, v_ord IN
        SELECT value, ordinality
        FROM jsonb_array_elements(p_matches) WITH ORDINALITY
    LOOP
        INSERT INTO match_game_matches (
            id, match_game_id, round_id, court_id, time_slot_id, match_type,
            player1_id, player2_id, team1, team2, "order"
        ) VALUES (
            gen_random_uuid(),
            v_mg_id,
            (v_round_map->>(v_match->>'round_temp_id'))::uuid,
            (v_court_map->>(v_match->>'court_temp_id'))::uuid,
            (v_ts_map->>(v_match->>'time_slot_temp_id'))::uuid,
            v_match->>'match_type',
            NULLIF(v_match->>'player1_id', '')::uuid,
            NULLIF(v_match->>'player2_id', '')::uuid,
            CASE
                WHEN v_match->'team1' IS NOT NULL AND jsonb_array_length(v_match->'team1') > 0
                THEN ARRAY(SELECT value::text::uuid FROM jsonb_array_elements_text(v_match->'team1'))
                ELSE NULL
            END,
            CASE
                WHEN v_match->'team2' IS NOT NULL AND jsonb_array_length(v_match->'team2') > 0
                THEN ARRAY(SELECT value::text::uuid FROM jsonb_array_elements_text(v_match->'team2'))
                ELSE NULL
            END,
            v_ord
        );
    END LOOP;

    RETURN v_mg_id;
END;
$function$;

-- update_match_game: WITH ORDINALITY로 배열 위치를 order에 저장
CREATE OR REPLACE FUNCTION public.update_match_game(p_match_game_id uuid, p_name text, p_date date, p_courts jsonb, p_rounds jsonb, p_matches jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_club_id   uuid;
    v_caller    uuid := auth.uid();
    v_court     jsonb;
    v_round     jsonb;
    v_ts        jsonb;
    v_match     jsonb;
    v_ord       int;
    v_court_id  uuid;
    v_round_id  uuid;
    v_ts_id     uuid;
    v_court_map jsonb := '{}'::jsonb;
    v_round_map jsonb := '{}'::jsonb;
    v_ts_map    jsonb := '{}'::jsonb;
BEGIN
    SELECT club_id INTO v_club_id FROM match_games WHERE id = p_match_game_id;
    IF v_club_id IS NULL THEN RAISE EXCEPTION 'match_game_not_found'; END IF;
    IF NOT is_club_owner(v_club_id, v_caller) THEN RAISE EXCEPTION 'not_owner'; END IF;
    IF EXISTS (SELECT 1 FROM match_games WHERE id = p_match_game_id AND is_fixed = true) THEN
        RAISE EXCEPTION 'match_game_fixed';
    END IF;
    IF EXISTS (
        SELECT 1 FROM match_game_matches
        WHERE match_game_id = p_match_game_id AND status <> 'scheduled'
    ) THEN
        RAISE EXCEPTION 'has_results';
    END IF;

    DELETE FROM match_game_matches WHERE match_game_id = p_match_game_id;
    DELETE FROM match_game_time_slots WHERE round_id IN (
        SELECT id FROM match_game_rounds WHERE match_game_id = p_match_game_id
    );
    DELETE FROM match_game_rounds WHERE match_game_id = p_match_game_id;
    DELETE FROM match_game_courts WHERE match_game_id = p_match_game_id;

    UPDATE match_games SET name = p_name, date = p_date WHERE id = p_match_game_id;

    FOR v_court IN SELECT value FROM jsonb_array_elements(p_courts) LOOP
        v_court_id := gen_random_uuid();
        INSERT INTO match_game_courts (id, match_game_id, label, "order")
        VALUES (v_court_id, p_match_game_id, v_court->>'label', (v_court->>'order')::int);
        v_court_map := v_court_map || jsonb_build_object(v_court->>'temp_id', v_court_id::text);
    END LOOP;

    FOR v_round IN SELECT value FROM jsonb_array_elements(p_rounds) LOOP
        v_round_id := gen_random_uuid();
        INSERT INTO match_game_rounds (id, match_game_id, label, "order")
        VALUES (v_round_id, p_match_game_id, v_round->>'label', (v_round->>'order')::int);
        v_round_map := v_round_map || jsonb_build_object(v_round->>'temp_id', v_round_id::text);

        FOR v_ts IN SELECT value FROM jsonb_array_elements(v_round->'time_slots') LOOP
            v_ts_id := gen_random_uuid();
            INSERT INTO match_game_time_slots (id, round_id, start_at, end_at)
            VALUES (v_ts_id, v_round_id, v_ts->>'start_at', v_ts->>'end_at');
            v_ts_map := v_ts_map || jsonb_build_object(v_ts->>'temp_id', v_ts_id::text);
        END LOOP;
    END LOOP;

    FOR v_match, v_ord IN
        SELECT value, ordinality
        FROM jsonb_array_elements(p_matches) WITH ORDINALITY
    LOOP
        INSERT INTO match_game_matches (
            id, match_game_id, round_id, court_id, time_slot_id, match_type,
            player1_id, player2_id, team1, team2, "order"
        ) VALUES (
            gen_random_uuid(),
            p_match_game_id,
            (v_round_map->>(v_match->>'round_temp_id'))::uuid,
            (v_court_map->>(v_match->>'court_temp_id'))::uuid,
            (v_ts_map->>(v_match->>'time_slot_temp_id'))::uuid,
            v_match->>'match_type',
            NULLIF(v_match->>'player1_id', '')::uuid,
            NULLIF(v_match->>'player2_id', '')::uuid,
            CASE
                WHEN v_match->'team1' IS NOT NULL AND jsonb_array_length(v_match->'team1') > 0
                THEN ARRAY(SELECT value::text::uuid FROM jsonb_array_elements_text(v_match->'team1'))
                ELSE NULL
            END,
            CASE
                WHEN v_match->'team2' IS NOT NULL AND jsonb_array_length(v_match->'team2') > 0
                THEN ARRAY(SELECT value::text::uuid FROM jsonb_array_elements_text(v_match->'team2'))
                ELSE NULL
            END,
            v_ord
        );
    END LOOP;

    RETURN p_match_game_id;
END;
$function$;
