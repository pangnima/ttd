# 신규 ERD 확정 (재설계 Step 3)

> `docs/redesign/domain-model.md`(Step1)와 4개 `ui-notes-*.md`(Step2)를 종합한 신규 스키마안. 범위는 승인된 계획대로 **users(계정/인증) 제외 전체** — `clubs`/`club_members`/`club_invites`/`match_games` 계열/`personal_matches`/`match_requests`/`rotation_sessions`/`ai_coaching_cache`/`club_player_ratings`/`club_rating_history`. 이 문서가 Step4 마이그레이션 작성의 직접 입력이다.

## 핵심 재설계 원칙 (Step1 §6 확정)

1. **다형성(단식/복식)은 컬럼이 아니라 참가자 테이블**로 표현한다 → `match_game_participants`, `personal_match_participants`, `match_request_participants` 신설
2. **경기 출처(직접기록/상호확인/로테이션)** 는 `personal_matches.source_type` enum 하나로 통일
3. **상태머신은 상태 컬럼 1개 + 별도 테이블**로 분리한다 → `match_requests`(요청 원장, 축A만) / `match_result_negotiations`(결과 협상, 축B만) 분리
4. 변경 최소화 원칙: `lib/queries/*`·`lib/actions/*` 함수 시그니처(입출력 타입)는 최대한 보존 — 내부 쿼리만 JOIN을 추가하는 방식으로 교체

---

## 1. `clubs` / `club_members` / `club_invites` — **구조 변경 없음**

Step2a 조사 결과 이 3개 테이블은 컬럼 파편화 문제가 없었다. 다만 **동작 방식 확정 사항** 2건:

- **클럽 홈 3단계 가시성**(`isApprovedMember`/`isOwner`/`isOfficerOrOwner`)은 새 컬럼이 필요 없다 — `club_members.status`/`role`에서 파생되는 **쿼리 레이어 계산**으로 유지한다(`lib/queries/clubs.ts`). 저장 데이터가 아니므로 ERD에는 영향 없음.
- **"승인대기 멤버" 타입 통일**: `PendingMemberWithUser`(club-dashboard)와 `MemberWithUser & {status:'pending'}`(members 페이지)가 같은 개념을 서로 다른 TS 타입으로 표현 — DB 변경 아님, Step4 이후 타입 레이어 정리 항목으로 이월(`src/types/index.ts`).

## 2. `match_games` / `match_game_courts` / `match_game_rounds` / `match_game_time_slots` — **구조 변경 없음**

## 3. `match_game_matches` — 참가자 정규화

**변경 전** (다형성-컬럼): `player1_id, player2_id, team1[], team2[], team1_ad_player_id, team2_ad_player_id`

**변경 후**:

```
match_game_matches (
  id, match_game_id, court_id, round_id, time_slot_id,
  match_type,              -- 'singles' | 'men_doubles' | 'women_doubles' | 'mixed_doubles'
  status,                  -- 'scheduled' | 'finished'
  winner_id,               -- 'team1' | 'team2' | 'draw' | null  (그대로 유지 — side 리터럴, FK 아님)
  set_scores jsonb,
  created_at
)

match_game_participants (
  id, match_id references match_game_matches(id) on delete cascade,
  user_id references users(id),      -- 게스트도 is_guest=true users 행이 있으므로 항상 not null
  side,                    -- 'team1' | 'team2'
  is_ad boolean not null default false,
  unique (match_id, user_id)
)
```

단식 = participants 2행(team1/team2, is_ad 항상 false), 복식 = 4행. `matchType`은 라벨링용으로 `match_game_matches`에 유지(참가자 수만으로 남/여/혼복 구분 불가하므로).

**근거(ui-notes-match-games.md)**: 그리드/리스트 뷰는 "참가자 id + side + ad 여부"만 필요, 컬럼이 단식/복식으로 나뉠 이유가 화면 관점에서 없음을 확인.

**RLS**: 부모 `match_game_matches`와 동일(승인 멤버만 SELECT), 쓰기는 기존처럼 `create_match_game`/`update_match_game` RPC를 참가자 다중 INSERT로 갱신.

**영향 없는 것**: `club_rating_history.match_id → match_game_matches.id` FK, `lib/match-games/special-match.ts`(`buildCrossPairH2H`)의 "클럽 전체 확정 경기 누적" 패턴 — 참가자 조회 쿼리만 JOIN 추가.

## 4. `personal_matches` — 출처 통일 + 참가자 정규화

**변경 전**: `opponent_name/opponent_user_id/opponent_dominant_hand/opponent_ntrp`(4) + `partner_*`(4) + `opponent2_*`(4) = 12개 다형성 컬럼, `source_request_id`로 출처 암시적 구분

**변경 후**:

```
personal_matches (
  id, user_id,
  source_type,             -- 'direct' | 'confirmation' | 'rotation'  (신규, 명시적 출처)
  source_request_id references match_requests(id) on delete set null,  -- confirmation일 때만 not null
  played_at, played_time,  -- played_time은 nullable 유지 (직접기록은 생략 가능 — 의도된 비대칭, 아래 §7 참고)
  match_type, surface,
  set_scores jsonb,        -- 빈 배열 = 결과 미확정. 세트 1개 = 게임 1개(행 단위 승자 없음, 0045)
  notes,
  created_at
)

personal_match_participants (
  id, match_id references personal_matches(id) on delete cascade,
  role,                    -- 'opponent' | 'partner' | 'opponent2'
  user_id references users(id),   -- null 허용 (비회원 상대)
  name not null,
  dominant_hand,
  ntrp_snapshot,           -- 기록 시점 스냅샷 (derive_public_ntrp 결과 복사)
  unique (match_id, role)
)
```

단식 = participants 1행(`role='opponent'`), 복식 = 3행. 소유자(`user_id`) 자신은 참가자 테이블에 넣지 않는다(행의 주인이므로 중복 불필요).

**불변식 유지**: "세트 없음 → 통계/레이팅/AI코칭 제외"(구 winner=NULL, 0045에서 컬럼 폐기)는 `personal_matches` 컬럼 구조 그대로라 `lib/personal-matches/explode.ts` 초크포인트 무변경. "상호확인 경기(source_type='confirmation') 수정/삭제 잠금"은 RESTRICTIVE 정책을 `source_type = 'confirmation'` 조건으로 갱신.

**근거(ui-notes-personal-matches.md)**: `sourceRequestId` 유무 + `confirmation` 서브객체 조인이 카드 배지 분기에 필수 확인됨 — `source_type` 명시 컬럼과 `match_result_negotiations` 조인(§5)으로 그대로 제공 가능.

## 5. `match_requests` — 요청 원장과 결과 협상 분리

Step1 §2에서 확인한 "두 개의 독립 상태 축"을 테이블로도 분리한다.

**변경 후**:

```
match_requests (                      -- 축 A: 요청 자체 상태만
  id, requester_id, opponent_user_id, -- opponent_user_id = 대표 확인자(복식 포함)
  played_at, played_time not null,    -- 상호확인 요청은 항상 시간 필수 (직접기록과의 의도된 비대칭, §7)
  match_type, surface, notes,
  status,                             -- 'pending' | 'accepted' | 'rejected' | 'canceled'
  created_at, responded_at
)

match_request_participants (          -- partner/opponent2만 (requester·대표는 위 컬럼으로 충분)
  id, request_id references match_requests(id) on delete cascade,
  role,                                -- 'partner' | 'opponent2'
  user_id references users(id),
  name not null, dominant_hand, ntrp_snapshot,
  unique (request_id, role)
)

match_result_negotiations (           -- 축 B: 결과 협상 (1:1, accepted 이후만 존재)
  request_id primary key references match_requests(id) on delete cascade,
  set_scores jsonb not null default '[]',      -- 수락 시점 최초값(요청자 관점)
  result_status not null default 'none',       -- 'none'|'proposed'|'confirmed'|'disputed'
  proposed_set_scores jsonb not null default '[]',
  proposed_by references users(id),
  proposed_at, dispute_reason
)
```

**근거(도메인모델 §2)**: `status`(pending/accepted/rejected/canceled)와 `result_status`(none/proposed/confirmed/disputed)는 서로 다른 시점·다른 당사자가 바꾸는 완전히 독립된 상태 축이라 분리가 자연스럽다. `match_result_negotiations`는 `accepted` 전이 시 1행 생성(RPC가 담당).

**RLS**: 두 신규 테이블 모두 부모 `match_requests`의 당사자 조건(`requester_id`/`opponent_user_id = auth.uid()`)을 그대로 상속하는 정책으로 재작성.

## 6. `rotation_sessions` — 변경 없음 (의도적)

Step2c 조사에서 별다른 파편화 문제가 발견되지 않았고, `players jsonb` 풀은 확정 전 임시 스테이징 데이터라 과잉 정규화할 이유가 없다(finalize 즉시 삭제됨). `finalize_rotation_session`이 게임별로 `personal_matches` + `personal_match_participants`(신규 구조)로 분해하도록 RPC 본문만 갱신.

## 7. `club_player_ratings` / `club_rating_history` — 구조 유지, 검증만

Step2d 조사 결과 랭킹/추세 화면은 "전체 리플레이 후 스냅샷 교체"(§5) 결과만 읽으므로 테이블 구조 자체는 변경할 이유가 없다. `club_rating_history.match_id → match_game_matches.id` FK는 §3 참가자 분리와 무관하게 유효.

**후속 조치**: `recalculate-ratings-button.tsx` → `lib/actions/ratings.ts` Server Action은 Step4 이후 재검증 대상으로 Step5 체크리스트에 등록(레이팅 계산 자체는 `lib/rating/elo.ts` 순수 함수 무변경).

## 8. `ai_coaching_cache` — 변경 없음 (단순 초기화만)

## 9. `users.personal_ntrp` — 컬럼 유지, 값만 초기화

테이블·컬럼 구조는 유지(회원가입 범위와 별개로 컬럼 자체는 인증 테이블 소속). `personal_matches`가 전부 초기화되므로 값은 자연히 무의미해짐 — Step4에서 `UPDATE users SET personal_ntrp = NULL`로 명시 초기화.

---

## 신규 발견사항 처리 방침 (스키마 결정 필요했던 항목)

| 발견 (출처) | 결정 |
|---|---|
| 클럽 홈 3단계 가시성 뷰모델 (ui-notes-clubs) | 저장 안 함, 쿼리 레이어 계산 유지 (§1) |
| "승인대기" 타입 이원화 (ui-notes-clubs) | DB 변경 아님, TS 타입 정리로 이월 |
| 라이벌 판정의 클럽 전체 의존성 (ui-notes-match-games) | 스키마 변경 불필요 — §3 참가자 정규화 후에도 동일 쿼리 패턴(클럽 전체 확정 경기 스캔) 유지 |
| 상대 후보 소스 이원화: 클럽회원검색 vs 과거상대이름 (ui-notes-personal-matches) | `personal_match_participants` 정규화로 "과거 상대"를 `SELECT DISTINCT name/user_id FROM personal_match_participants WHERE match_id IN (내 경기)`로 통합 조회 가능해짐 — `fetchPastOpponents`를 이 쿼리로 교체 권장(Step5) |
| `playedTime` 필수성 비대칭 (ui-notes-personal-matches) | 버그 아님, 의도된 규칙으로 확정: 직접기록은 생략 가능(nullable 유지), 상호확인 요청은 항상 필수(not null 유지) — §4/§5에 명시 |
| `AnalyticsBundle`/`PlayerStatsBundle` 과도한 중첩 타입 (ui-notes-ratings) | DB 스키마 변경 대상 아님(뷰모델 타입 이슈) — Step5에서 새 참가자 테이블 기반으로 쿼리를 재작성할 때 단순화 여부 재검토 |

## 컬럼 매핑표 (기능 누락 확인용)

| 기존 컬럼/테이블 | 신규 위치 | 비고 |
|---|---|---|
| `match_game_matches.player1_id/player2_id/team1/team2/team1_ad_player_id/team2_ad_player_id` | `match_game_participants(user_id, side, is_ad)` | 단식 2행/복식 4행 |
| `personal_matches.opponent_*`(4)/`partner_*`(4)/`opponent2_*`(4) | `personal_match_participants(role, user_id, name, dominant_hand, ntrp_snapshot)` | role별 1행 |
| `personal_matches.source_request_id`(암시적 출처 판단) | `personal_matches.source_type`(명시) + `source_request_id` 유지 | 명시화만, 컬럼 자체는 보존 |
| `match_requests.partner_*`(4)/`opponent2_*`(4) | `match_request_participants(role, user_id, name, dominant_hand, ntrp_snapshot)` | |
| `match_requests.result_status/proposed_set_scores/proposed_by/proposed_at/dispute_reason` | `match_result_negotiations`(신규 테이블, request_id 1:1) | 축B 전체 이전 |
| `match_requests.set_scores` | `match_result_negotiations.set_scores`(수락 시점 초기값) | |
| 그 외 모든 컬럼(`clubs`~`ai_coaching_cache`, `club_player_ratings`~`club_rating_history`) | 변경 없음 | §1/§2/§6/§7/§8 |

## RPC 영향 범위 (Step5 회귀 검증 대상 예고)

`accept_match_request`, `propose_match_result`, `confirm_match_result`, `dispute_match_result`, `finalize_rotation_session`, `invert_set_scores`, `validate_set_scores`, `normalize_set_scores`, `derive_public_ntrp`, `create_match_game`, `update_match_game`, `add_guest_player` — 전부 §3~§5 테이블 구조 변경에 맞춰 본문 재작성 필요. `apply_club_rating_snapshot`, `get_club_activity_ranking`, `get_club_win_rate_ranking`, `get_club_member_counts`, `get_invite_preview`, `join_club_via_invite`, `handle_new_user`은 무변경.

---

**다음 단계**: Step4에서 이 문서 §3~§5·§9를 `supabase/migrations/0039_reset_*.sql`(초기화) + `0040_participants_*.sql`(신규 테이블) 순으로 구현한다.
