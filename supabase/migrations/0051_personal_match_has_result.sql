-- 0051_personal_match_has_result.sql
--- '결과 확정' 술어를 DB 1급 컬럼으로 승격한다.
---
--- 개인 경기 화면이 "확정된 경기만", 경기 확인 요청 화면이 "미확정 전량"을 담게 되면서 두 화면이
--- 같은 술어(set_scores가 비어 있는지)로 집합을 분할한다. 특히 확인 요청 뱃지는 (main)/layout.tsx가
--- 매 화면 조회하므로, 전기간 개인 경기를 끌어와 앱에서 거르는 방식으로는 레이아웃 경로에 넣을 수 없다.
--- 생성 컬럼 + 부분 인덱스로 미확정 큐를 소형 쿼리로 만든다.
---
--- TS `hasResult`(lib/personal-matches/winner.ts)와 미러 규칙이다 —
--- validate_set_scores ↔ validateSetScores 선례와 같은 이중 정의.
--- `generated always ... stored`이므로 INSERT/UPDATE 경로 코드 변경은 없다(RPC의 set_scores 갱신에도 자동 반영).
--- match_rooms.has_result는 0049에서 is_settled로 개명됐으므로 이름 충돌은 없다.

-- ── 1) 생성 컬럼 ──
alter table public.personal_matches
  add column has_result boolean
  generated always as (jsonb_array_length(set_scores) > 0) stored;

comment on column public.personal_matches.has_result is
  '결과 확정 여부(set_scores 비어 있지 않음). 개인 경기 결과 ↔ 확인 요청 큐 분할 술어(0051). 생성 컬럼 — 직접 쓰지 않는다';

-- ── 2) 부분 인덱스 — 두 화면의 목록 쿼리가 각각 자기 쪽만 스캔한다 ──
create index personal_matches_pending_idx
  on public.personal_matches (user_id, played_at desc)
  where has_result = false;

create index personal_matches_settled_idx
  on public.personal_matches (user_id, played_at desc)
  where has_result = true;
