-- 20260515045141 0011_match_game_rpcs
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16

-- MatchGame 생성 RPC: courts/rounds/time_slots/matches 를 단일 트랜잭션으로 저장
-- p_courts:    [{"temp_id":"c0","label":"1코트","order":1}]
-- p_rounds:    [{"temp_id":"r0","label":"1st","order":1,"time_slots":[{"temp_id":"ts0","start_at":"09:00","end_at":"09:30"}]}]
-- p_matches:   [{"court_temp_id":"c0","round_temp_id":"r0","time_slot_temp_id":"ts0","match_type":"singles","player1_id":"uuid","player2_id":"uuid","team1":[],"team2":[]}]

CREATE OR REPLACE FUNCTION public.create_match_game(
    p_club_id        uuid,
    p_name           text,
    p_date           date,
    p_courts         jsonb,
    p_rounds         jsonb,
    p_matches        jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_mg_id     uuid := gen_random_uuid();
    v_court     jsonb;
    v_round     jsonb;
    v_ts        jsonb;
    v_match     jsonb;
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

    FOR v_match IN SELECT value FROM jsonb_array_elements(p_matches) LOOP
        INSERT INTO match_game_matches (
            id, match_game_id, round_id, court_id, time_slot_id, match_type,
            player1_id, player2_id, team1, team2
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
            END
        );
    END LOOP;

    RETURN v_mg_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_match_game TO authenticated;


-- 게스트 플레이어 추가 RPC: users + club_members 를 단일 트랜잭션으로 등록
CREATE OR REPLACE FUNCTION public.add_guest_player(
    p_club_id  uuid,
    p_nickname text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid := gen_random_uuid();
BEGIN
    IF NOT is_club_approved_member(p_club_id, auth.uid()) THEN
        RAISE EXCEPTION 'permission denied: not a club member';
    END IF;

    INSERT INTO public.users (
        id, email, name, nickname, role, is_guest,
        phone, gender, dominant_hand
    )
    VALUES (
        v_user_id, '', p_nickname, p_nickname, 'member', true,
        '', 'male', 'right'
    );

    INSERT INTO public.club_members (user_id, club_id, role, status)
    VALUES (v_user_id, p_club_id, 'member', 'approved');

    RETURN v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_guest_player TO authenticated;

