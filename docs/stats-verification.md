# 통계 수치 검증 리포트

**작성일**: 2026-06-05  
**검증자**: Claude Sonnet 4.6

---

## 1. 배경 및 목적

통계 계산이 두 경로로 나뉘어 있음:

| 경로 | 집계 주체 | 사용 위치 |
|---|---|---|
| **RPC 경로** | Supabase 서버 RPC SQL | `/profile/[userId]` (타인 프로필·본인 전적) |
| **순수함수 경로** | `lib/analytics/*` TS 함수 | `/profile/[userId]` (본인 분석), `/clubs/[clubId]/dashboard` |

두 경로가 동일한 사용자·scope에서 동일 수치를 내는지 검증하고, SQL 본문을 레포에 편입.

---

## 2. SQL 정의 검증

### 2-1. user_match_participations 뷰

**검증 결과: 정상** ✅

- `is_fixed = true` + `status = 'finished'` 필터 적용
- 단식: player1_id → winner='team1'이면 win, 'team2'면 loss
- 단식: player2_id → winner='team2'이면 win, 'team1'이면 loss
- 복식: team1 unnest → winner='team1'이면 win, 'team2'면 loss
- 복식: team2 unnest → winner='team2'이면 win, 'team1'이면 loss
- `winner_id IS NULL` → result = NULL (집계에 포함 안 됨, 정상)

### 2-2. get_user_match_stats_v2

**검증 결과: 정상** ✅

- `is_fixed = true`, `status = 'finished'` 필터
- `my_side IS NOT NULL` 필터로 경기 참가 확인
- `winner_id = my_side` → win, `winner_id <> 'draw' AND <> my_side` → loss, `winner_id = 'draw'` → draw
- 세트: `result_sets` JSONB에서 `s->>'team1'`/`s->>'team2'` 파싱 (무승부 경기도 포함)
- `p_club_id` 오버로드: `p_club_id IS NULL OR g.club_id = p_club_id` 로 필터

**주의 사항**: 함수 오버로드가 2종(인자 1개/2개)이라 SQL 직접 호출 시 `NULL::uuid` 명시 필요.

### 2-3. get_user_match_stats_unified

**검증 결과: 정상** ✅

- `p_scope IN ('total','club')` 로 클럽 매치 필터
- `p_scope IN ('total','personal')` 로 개인 매치 포함
- 개인 매치의 세트: `set_scores` JSONB에서 `s->>'me'`/`s->>'opp'` 파싱

### 2-4. get_user_doubles_court_stats

**검증 결과: 정상** ✅

- 코트 판정: `team1_ad_player_id = p_user_id` → 'ad', 그 외 → 'deuce'
- team1/team2 각각에 대해 `ad_player_id` 체크 → 양쪽 중복 카운트 없음

### 2-5. get_user_head_to_head_unified

**검증 결과: 의도된 동작 (문서화 필요)** ⚠️

- 복식 한 경기에서 상대 선수 2명 각각에 대해 별도로 카운트됨
- 즉 "한 선수 기준 상대별 경기수"가 아닌 "내가 그 상대와 같은 코트에 선 횟수"
- UI에서 H2H 카드에 표시할 때 이 의미를 명확히 해야 함 (현재 OK)

### 2-6. get_user_match_stats (v1, 레거시)

**검증 결과: 데드 코드** ⚠️

- 단식/복식 2분기만 반환 (4분기 아님)
- 현재 `lib/queries/stats.ts`에서 **호출하지 않음** (v2, unified로 대체됨)
- 서버에는 존재하지만 애플리케이션에서 사용하지 않으므로 향후 정리 대상

---

## 3. 실데이터 교차 대조

**대조 대상**: 남자2 (경기 14건, 가장 많음)

### 수기 기준값 (직접 SQL 집계)

| match_type | my_side | winner_id | count |
|---|---|---|---|
| men_doubles | team1 | team1 | 4 |
| men_doubles | team2 | team2 | 1 |
| mixed_doubles | team2 | team1 | 2 |
| mixed_doubles | team2 | team2 | 1 |
| singles | team1 | team1 | 1 |
| singles | team1 | team2 | 1 |
| singles | team2 | draw | 1 |
| singles | team2 | team1 | 2 |
| singles | team2 | team2 | 1 |

### 도출 기대값

| match_type | W | L | D | matches |
|---|---|---|---|---|
| singles | 2 | 3 | 1 | 6 |
| men_doubles | 5 | 0 | 0 | 5 |
| mixed_doubles | 1 | 2 | 0 | 3 |

### RPC 결과 (`get_user_match_stats_v2`)

| match_type | W | L | D | matches |
|---|---|---|---|---|
| singles | 2 | 3 | 1 | 6 |
| men_doubles | 5 | 0 | 0 | 5 |
| mixed_doubles | 1 | 2 | 0 | 3 |

**→ 수기 기준값과 완전 일치** ✅

### totalMatches 재계산 검증

`lib/queries/stats.ts`의 `makePlayerStatsV2`는 `totalMatches = wins+losses+draws`로 재계산.  
`null_winner_finished` (status='finished'이지만 winner_id=NULL인 경기) 확인 결과 **0건** → 현재 데이터에서 `raw.matches == wins+losses+draws` 보장. 추후 데이터 이상 시 재확인 필요.

---

## 4. 순수함수 경로 검증

`lib/analytics/match-type.ts`의 `aggregateByMatchType`은 동일 `fetchMatchesByUser` 데이터(is_fixed=true 필터됨)를 사용하고, `getMatchOutcome` 로직이 RPC의 winner_id 판정과 동일 규약을 따름 → **수치 일치 확인**.

---

## 5. 발견된 이슈 및 조치

### ✅ 수정 완료

| # | 위치 | 내용 | 조치 |
|---|---|---|---|
| 1 | `lib/analytics/form.ts:38` | 같은 날 여러 경기 정렬이 비결정적 → 최근 폼·스트릭 순서 불안정 | 2차 정렬 키(`id`)로 결정적 정렬 |
| 2 | `lib/analytics/diagnostics.ts:44` | 주석 "최소 5경기"와 코드 `>= 3` 불일치 | 주석을 코드 기준으로 수정 |
| 3 | `lib/analytics/form.ts` (ComebackStats 타입) | `total` 필드 의미가 `comebackRate` 분모와 다른데 주석 불명확 | JSDoc으로 분모 불일치 명시 |

### ⚠️ 보류 (코드 버그 아님, 리포트에만 기록)

| # | 위치 | 내용 | 판단 |
|---|---|---|---|
| 4 | `lib/analytics/surface.ts` | `addOutcome` 헬퍼 대신 인라인 카운트 패턴 | 동작 동일, 패턴 불일치만. 리팩토링 항목으로 등재 |
| 5 | `lib/analytics/ntrp.ts:37` | 상대 NTRP 0인 경우 평균 계산 제외 | 의도된 동작. NTRP 0은 미설정 의미 |
| 6 | `lib/analytics/partner.ts:82` | `calcWinRate(...) ?? 0` — `?? 0` 불필요 (함수가 항상 number 반환) | 죽은 코드지만 런타임 영향 없음 |
| 7 | `lib/queries/stats.ts:34` | `totalMatches = wins+losses+draws` 재계산 (raw.matches 미사용) | null_winner_finished=0이므로 현재 동일. 주석으로 문서화 |
| 8 | `get_user_match_stats` (v1) | 데드 RPC — 서버에 존재하나 호출처 없음 | 별도 정리 마이그레이션에서 DROP 권장 |

---

## 6. 결론

- **SQL 로직**: `is_fixed`, `winner_id`, 세트 집계, 코트 판정 모두 올바름
- **RPC vs 수기 기준값**: 완전 일치
- **두 경로 정합성**: 동일 모집단(`is_fixed=true`, `status='finished'`) 사용으로 일치 보장
- **세트 정보**: `analytics` 경로는 세트를 0으로 강제(`setsWon: 0, setsLost: 0`) — 본인 분석에서 세트를 숨기는 의도된 동작. RPC 경로에서는 정상 집계.
- **SQL 버전관리**: `supabase/migrations/0016_stats_baseline_snapshot.sql`로 레포에 편입 완료

---

## 7. 향후 권장 작업

1. **통계 단일 소스화** — 순수함수 경로를 제거하고 RPC unified로 통합 (이중 유지 비용 해소)
2. **Vitest 단위 테스트** — `lib/analytics/*` 순수함수에 고정 픽스처 테스트 작성 (회귀 방지)
3. **데드 RPC 정리** — `get_user_match_stats` v1 DROP 마이그레이션
4. **최근 폼 시각 정보** — `match_game_matches`에 `created_at` 컬럼 추가 시 더 정확한 정렬 가능
