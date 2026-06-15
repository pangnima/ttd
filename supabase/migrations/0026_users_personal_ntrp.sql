-- 0026_users_personal_ntrp.sql
--- 회원의 개인경기 기반 동적 개인 NTRP 캐시(온더플라이 레이팅의 스냅샷).
--- 개인경기 등록 폼에서 파트너/상대 회원을 고를 때 정적 users.ntrp 대신 이 값을 프리필한다.
--- 본인 개인경기 추가/수정/삭제 시 서버에서 재계산해 갱신한다. 미보유=null.

alter table public.users
  add column personal_ntrp numeric
  check (personal_ntrp is null or (personal_ntrp >= 1.0 and personal_ntrp <= 7.0));
