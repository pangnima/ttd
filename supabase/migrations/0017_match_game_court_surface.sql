-- 0017_match_game_court_surface.sql
-- 목적: create_match_game / update_match_game RPC에서 match_game_courts.surface를
--       INSERT 시 반영하도록 두 함수를 재정의한다.
--       (surface 컬럼은 이미 테이블에 존재함 — DDL 변경 없음)
-- 변경 지점: FOR v_court LOOP 의 INSERT INTO match_game_courts 에 surface 컬럼 추가.

CREATE OR REPLACE FUNCTION public.create_match_game(
    p_club_id uuid,
    p_name    text,
    p_date    date,
    p_courts  jsonb,
    p_rounds  jsonb,
    p_matches jsonb
)
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
        INSERT INTO match_game_courts (id, match_game_id, label, "order", surface)
        VALUES (
            v_court_id,
            v_mg_id,
            v_court->>'label',
            (v_court->>'order')::int,
            NULLIF(v_court->>'surface', '')
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


CREATE OR REPLACE FUNCTION public.update_match_game(
    p_match_game_id uuid,
    p_name          text,
    p_date          date,
    p_courts        jsonb,
    p_rounds        jsonb,
    p_matches       jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_club_id       uuid;
    v_caller        uuid := auth.uid();
    v_court         jsonb;
    v_round         jsonb;
    v_ts            jsonb;
    v_match         jsonb;
    v_ord           int;
    v_court_id      uuid;
    v_round_id      uuid;
    v_ts_id         uuid;
    v_new_match_id  uuid;
    v_court_map     jsonb := '{}'::jsonb;
    v_round_map     jsonb := '{}'::jsonb;
    v_ts_map        jsonb := '{}'::jsonb;
    v_old_map       jsonb := '{}'::jsonb;
    v_old           jsonb;
BEGIN
    SELECT club_id INTO v_club_id FROM match_games WHERE id = p_match_game_id;
    IF v_club_id IS NULL THEN RAISE EXCEPTION 'match_game_not_found'; END IF;

    IF NOT is_club_approved_member(v_club_id, v_caller) THEN RAISE EXCEPTION 'not_member'; END IF;
    IF EXISTS (SELECT 1 FROM match_games WHERE id = p_match_game_id AND is_fixed = true)
       AND NOT is_club_owner(v_club_id, v_caller) THEN
        RAISE EXCEPTION 'match_game_fixed';
    END IF;

    -- 결과가 있는 기존 경기를 스냅샷해 두고, 재생성 후 구성이 동일한 경기에 점수를 복원한다.
    SELECT COALESCE(jsonb_object_agg(id::text, jsonb_build_object(
        'match_type',          match_type,
        'player1_id',          player1_id,
        'player2_id',          player2_id,
        'team1',               team1,
        'team2',               team2,
        'status',              status,
        'result_sets',         result_sets,
        'winner_id',           winner_id,
        'team1_ad_player_id',  team1_ad_player_id,
        'team2_ad_player_id',  team2_ad_player_id
    )), '{}'::jsonb)
    INTO v_old_map
    FROM match_game_matches
    WHERE match_game_id = p_match_game_id AND status <> 'scheduled';

    DELETE FROM match_game_matches WHERE match_game_id = p_match_game_id;
    DELETE FROM match_game_time_slots WHERE round_id IN (
        SELECT id FROM match_game_rounds WHERE match_game_id = p_match_game_id
    );
    DELETE FROM match_game_rounds WHERE match_game_id = p_match_game_id;
    DELETE FROM match_game_courts WHERE match_game_id = p_match_game_id;

    UPDATE match_games SET name = p_name, date = p_date WHERE id = p_match_game_id;

    FOR v_court IN SELECT value FROM jsonb_array_elements(p_courts) LOOP
        v_court_id := gen_random_uuid();
        INSERT INTO match_game_courts (id, match_game_id, label, "order", surface)
        VALUES (
            v_court_id,
            p_match_game_id,
            v_court->>'label',
            (v_court->>'order')::int,
            NULLIF(v_court->>'surface', '')
        );
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
        v_new_match_id := gen_random_uuid();
        INSERT INTO match_game_matches (
            id, match_game_id, round_id, court_id, time_slot_id, match_type,
            player1_id, player2_id, team1, team2, "order"
        ) VALUES (
            v_new_match_id,
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

        -- prev_match_id가 있고 구성(종류·선수)이 동일하면 기존 점수를 새 row에 복원
        v_old := v_old_map -> (v_match->>'prev_match_id');
        IF v_old IS NOT NULL AND (
            v_old->>'match_type' = v_match->>'match_type'
            AND (
                (v_match->>'match_type' = 'singles'
                    AND (v_old->>'player1_id') IS NOT DISTINCT FROM NULLIF(v_match->>'player1_id', '')
                    AND (v_old->>'player2_id') IS NOT DISTINCT FROM NULLIF(v_match->>'player2_id', ''))
                OR (v_match->>'match_type' <> 'singles'
                    AND v_old->'team1' = v_match->'team1'
                    AND v_old->'team2' = v_match->'team2')
            )
        ) THEN
            UPDATE match_game_matches SET
                status             = v_old->>'status',
                result_sets        = v_old->'result_sets',
                winner_id          = v_old->>'winner_id',
                team1_ad_player_id = NULLIF(v_old->>'team1_ad_player_id', '')::uuid,
                team2_ad_player_id = NULLIF(v_old->>'team2_ad_player_id', '')::uuid
            WHERE id = v_new_match_id;
        END IF;
    END LOOP;

    RETURN p_match_game_id;
END;
$function$;
