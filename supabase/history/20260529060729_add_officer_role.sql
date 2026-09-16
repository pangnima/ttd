-- 20260529060729 add_officer_role
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16

-- 1. role CHECK 제약 갱신: 'officer' 값 추가
ALTER TABLE public.club_members
    DROP CONSTRAINT club_members_role_check;

ALTER TABLE public.club_members
    ADD CONSTRAINT club_members_role_check
    CHECK (role = ANY (ARRAY['owner'::text, 'officer'::text, 'member'::text]));

-- 2. 헬퍼 함수: owner 또는 officer 여부 확인 (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_club_owner_or_officer(p_club_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.club_members
        WHERE club_id = p_club_id
          AND user_id = p_user_id
          AND role IN ('owner', 'officer')
          AND status = 'approved'
    );
$$;

-- 3. officer용 UPDATE 정책 추가
--    · USING: officer/owner만 member 행에 접근 가능
--    · WITH CHECK: role = 'member' 유지 강제 → officer가 role 변경 불가
--    (owner의 role 변경은 기존 club_members_update 정책이 담당)
CREATE POLICY club_members_update_officer ON public.club_members
FOR UPDATE TO authenticated
USING (
    is_club_owner_or_officer(club_id, auth.uid())
    AND role = 'member'
)
WITH CHECK (
    is_club_owner_or_officer(club_id, auth.uid())
    AND role = 'member'
);

