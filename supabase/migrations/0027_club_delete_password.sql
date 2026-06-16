-- 클럽 삭제(해체) 시 검증할 비밀번호 해시. 평문 저장 금지.
-- 기존 클럽은 NULL (해시 미설정 → 삭제 시 비밀번호 검증 생략, confirm만)
alter table public.clubs
  add column delete_password_hash text;
