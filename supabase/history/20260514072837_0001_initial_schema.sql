-- 20260514072837 0001_initial_schema
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16

-- ── Extensions ────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Tables (의존성 순서대로) ───────────────────────────────

-- 1. users
CREATE TABLE public.users (
  id             uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email          text NOT NULL,
  name           text NOT NULL,
  nickname       text NOT NULL,
  role           text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  profile_image  text,
  phone          text,
  gender         text CHECK (gender IN ('male', 'female')),
  dominant_hand  text CHECK (dominant_hand IN ('right', 'left')),
  ntrp           numeric(2,1),
  tennis_start_date date,
  is_guest       boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- 2. clubs
CREATE TABLE public.clubs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  description  text,
  region       text,
  is_public    boolean NOT NULL DEFAULT true,
  member_count int NOT NULL DEFAULT 0,
  owner_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- 3. club_members
CREATE TABLE public.club_members (
  user_id   uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  club_id   uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  role      text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  status    text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, club_id)
);
CREATE INDEX idx_club_members_club_status ON public.club_members (club_id, status);
CREATE INDEX idx_club_members_club_role   ON public.club_members (club_id, role);

-- 4. tournaments
CREATE TABLE public.tournaments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id    uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name       text NOT NULL,
  date       date NOT NULL,
  is_fixed   boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. tournament_courts
CREATE TABLE public.tournament_courts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  label         text NOT NULL,
  "order"       int NOT NULL
);
CREATE INDEX idx_tournament_courts_order ON public.tournament_courts (tournament_id, "order");

-- 6. tournament_rounds
CREATE TABLE public.tournament_rounds (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  label         text NOT NULL,
  "order"       int NOT NULL
);
CREATE INDEX idx_tournament_rounds_order ON public.tournament_rounds (tournament_id, "order");

-- 7. tournament_time_slots
CREATE TABLE public.tournament_time_slots (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES public.tournament_rounds(id) ON DELETE CASCADE,
  start_at text NOT NULL,
  end_at   text NOT NULL
);
CREATE INDEX idx_tournament_time_slots_round ON public.tournament_time_slots (round_id);

-- 8. tournament_games
CREATE TABLE public.tournament_games (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  round_id      uuid NOT NULL REFERENCES public.tournament_rounds(id) ON DELETE CASCADE,
  court_id      uuid NOT NULL REFERENCES public.tournament_courts(id) ON DELETE CASCADE,
  time_slot_id  uuid NOT NULL REFERENCES public.tournament_time_slots(id) ON DELETE CASCADE,
  match_type    text NOT NULL CHECK (match_type IN ('singles', 'men_doubles', 'women_doubles', 'mixed_doubles')),
  player1_id    uuid REFERENCES public.users(id) ON DELETE SET NULL,
  player2_id    uuid REFERENCES public.users(id) ON DELETE SET NULL,
  team1         uuid[],
  team2         uuid[],
  status        text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'finished')),
  result_sets   jsonb,
  winner_id     text
);
CREATE INDEX idx_tournament_games_tournament ON public.tournament_games (tournament_id);
CREATE INDEX idx_tournament_games_player1    ON public.tournament_games (player1_id);
CREATE INDEX idx_tournament_games_player2    ON public.tournament_games (player2_id);
CREATE INDEX idx_tournament_games_team1      ON public.tournament_games USING gin (team1);
CREATE INDEX idx_tournament_games_team2      ON public.tournament_games USING gin (team2);

-- ── Helper functions (테이블 생성 후) ────────────────────
-- RLS 정책에서 재귀 무한 루프를 방지하기 위해 SECURITY DEFINER 사용
CREATE OR REPLACE FUNCTION public.is_club_owner(p_club_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.club_members
    WHERE club_id = p_club_id
      AND user_id = p_user_id
      AND role = 'owner'
      AND status = 'approved'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_club_approved_member(p_club_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.club_members
    WHERE club_id = p_club_id
      AND user_id = p_user_id
      AND status = 'approved'
  );
$$;

-- 클럽 생성 시 owner를 club_members에 자동 추가
CREATE OR REPLACE FUNCTION public.handle_new_club()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.club_members (user_id, club_id, role, status)
  VALUES (NEW.owner_id, NEW.id, 'owner', 'approved');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_club_created
AFTER INSERT ON public.clubs
FOR EACH ROW EXECUTE FUNCTION public.handle_new_club();

-- ── RLS 활성화 ─────────────────────────────────────────────
ALTER TABLE public.users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_members        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_courts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_rounds   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_games    ENABLE ROW LEVEL SECURITY;

-- ── RLS Policies ──────────────────────────────────────────

-- users
CREATE POLICY users_select ON public.users
  FOR SELECT TO authenticated USING (true);
CREATE POLICY users_update ON public.users
  FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- clubs
CREATE POLICY clubs_select ON public.clubs
  FOR SELECT TO authenticated USING (
    is_public = true OR public.is_club_approved_member(id, auth.uid())
  );
CREATE POLICY clubs_insert ON public.clubs
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY clubs_update ON public.clubs
  FOR UPDATE TO authenticated USING (public.is_club_owner(id, auth.uid()));
CREATE POLICY clubs_delete ON public.clubs
  FOR DELETE TO authenticated USING (public.is_club_owner(id, auth.uid()));

-- club_members
CREATE POLICY club_members_select ON public.club_members
  FOR SELECT TO authenticated USING (
    user_id = auth.uid() OR public.is_club_approved_member(club_id, auth.uid())
  );
CREATE POLICY club_members_insert ON public.club_members
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid() AND status = 'pending' AND role = 'member'
  );
CREATE POLICY club_members_update ON public.club_members
  FOR UPDATE TO authenticated USING (public.is_club_owner(club_id, auth.uid()));
CREATE POLICY club_members_delete ON public.club_members
  FOR DELETE TO authenticated USING (
    user_id = auth.uid() OR public.is_club_owner(club_id, auth.uid())
  );

-- tournaments
CREATE POLICY tournaments_select ON public.tournaments
  FOR SELECT TO authenticated USING (public.is_club_approved_member(club_id, auth.uid()));
CREATE POLICY tournaments_insert ON public.tournaments
  FOR INSERT TO authenticated WITH CHECK (public.is_club_approved_member(club_id, auth.uid()));
CREATE POLICY tournaments_update ON public.tournaments
  FOR UPDATE TO authenticated USING (public.is_club_approved_member(club_id, auth.uid()));
CREATE POLICY tournaments_delete ON public.tournaments
  FOR DELETE TO authenticated USING (public.is_club_owner(club_id, auth.uid()));

-- tournament_courts
CREATE POLICY tournament_courts_select ON public.tournament_courts
  FOR SELECT TO authenticated USING (
    public.is_club_approved_member(
      (SELECT club_id FROM public.tournaments WHERE id = tournament_id), auth.uid()
    )
  );
CREATE POLICY tournament_courts_insert ON public.tournament_courts
  FOR INSERT TO authenticated WITH CHECK (
    public.is_club_approved_member(
      (SELECT club_id FROM public.tournaments WHERE id = tournament_id), auth.uid()
    )
  );
CREATE POLICY tournament_courts_update ON public.tournament_courts
  FOR UPDATE TO authenticated USING (
    public.is_club_approved_member(
      (SELECT club_id FROM public.tournaments WHERE id = tournament_id), auth.uid()
    )
  );
CREATE POLICY tournament_courts_delete ON public.tournament_courts
  FOR DELETE TO authenticated USING (
    public.is_club_owner(
      (SELECT club_id FROM public.tournaments WHERE id = tournament_id), auth.uid()
    )
  );

-- tournament_rounds
CREATE POLICY tournament_rounds_select ON public.tournament_rounds
  FOR SELECT TO authenticated USING (
    public.is_club_approved_member(
      (SELECT club_id FROM public.tournaments WHERE id = tournament_id), auth.uid()
    )
  );
CREATE POLICY tournament_rounds_insert ON public.tournament_rounds
  FOR INSERT TO authenticated WITH CHECK (
    public.is_club_approved_member(
      (SELECT club_id FROM public.tournaments WHERE id = tournament_id), auth.uid()
    )
  );
CREATE POLICY tournament_rounds_update ON public.tournament_rounds
  FOR UPDATE TO authenticated USING (
    public.is_club_approved_member(
      (SELECT club_id FROM public.tournaments WHERE id = tournament_id), auth.uid()
    )
  );
CREATE POLICY tournament_rounds_delete ON public.tournament_rounds
  FOR DELETE TO authenticated USING (
    public.is_club_owner(
      (SELECT club_id FROM public.tournaments WHERE id = tournament_id), auth.uid()
    )
  );

-- tournament_time_slots
CREATE POLICY tournament_time_slots_select ON public.tournament_time_slots
  FOR SELECT TO authenticated USING (
    public.is_club_approved_member(
      (SELECT t.club_id FROM public.tournaments t
       JOIN public.tournament_rounds r ON r.tournament_id = t.id
       WHERE r.id = round_id),
      auth.uid()
    )
  );
CREATE POLICY tournament_time_slots_insert ON public.tournament_time_slots
  FOR INSERT TO authenticated WITH CHECK (
    public.is_club_approved_member(
      (SELECT t.club_id FROM public.tournaments t
       JOIN public.tournament_rounds r ON r.tournament_id = t.id
       WHERE r.id = round_id),
      auth.uid()
    )
  );
CREATE POLICY tournament_time_slots_update ON public.tournament_time_slots
  FOR UPDATE TO authenticated USING (
    public.is_club_approved_member(
      (SELECT t.club_id FROM public.tournaments t
       JOIN public.tournament_rounds r ON r.tournament_id = t.id
       WHERE r.id = round_id),
      auth.uid()
    )
  );
CREATE POLICY tournament_time_slots_delete ON public.tournament_time_slots
  FOR DELETE TO authenticated USING (
    public.is_club_owner(
      (SELECT t.club_id FROM public.tournaments t
       JOIN public.tournament_rounds r ON r.tournament_id = t.id
       WHERE r.id = round_id),
      auth.uid()
    )
  );

-- tournament_games
CREATE POLICY tournament_games_select ON public.tournament_games
  FOR SELECT TO authenticated USING (
    public.is_club_approved_member(
      (SELECT club_id FROM public.tournaments WHERE id = tournament_id), auth.uid()
    )
  );
CREATE POLICY tournament_games_insert ON public.tournament_games
  FOR INSERT TO authenticated WITH CHECK (
    public.is_club_approved_member(
      (SELECT club_id FROM public.tournaments WHERE id = tournament_id), auth.uid()
    )
  );
CREATE POLICY tournament_games_update ON public.tournament_games
  FOR UPDATE TO authenticated USING (
    public.is_club_approved_member(
      (SELECT club_id FROM public.tournaments WHERE id = tournament_id), auth.uid()
    )
  );
CREATE POLICY tournament_games_delete ON public.tournament_games
  FOR DELETE TO authenticated USING (
    public.is_club_owner(
      (SELECT club_id FROM public.tournaments WHERE id = tournament_id), auth.uid()
    )
  );

