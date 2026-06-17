-- 0030_clubs_select_owner.sql
--- 비공개 클럽 생성 시 INSERT ... RETURNING 단계에서 SELECT 정책이 함께 평가되는데,
--- owner를 club_members로 등록하는 AFTER INSERT 트리거(handle_new_club)가 아직 실행되기 전이라
--- is_club_approved_member가 false → RLS 거부. clubs 컬럼인 owner_id로 즉시 평가 가능한 조건을
--- SELECT 정책에 추가해 owner가 항상 자기 클럽을 조회하도록 한다.

alter policy clubs_select on public.clubs
  using (
    is_public = true
    or owner_id = auth.uid()
    or is_club_approved_member(id, auth.uid())
  );
