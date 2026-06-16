-- 클럽 정기 활동(고정코트) 시간. 자유 텍스트 1줄 (예: "매주 토·일 09:00~12:00, 강남테니스장").
-- 기존 클럽은 NULL (미설정 → 홈 화면에서 행 미표시)
alter table public.clubs
  add column court_schedule text;
