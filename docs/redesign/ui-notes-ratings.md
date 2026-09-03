# UI 데이터 요구사항 — 클럽 레이팅 / 프로필 통계 (Step2d)

> Step1 domain-model.md §4(NTRP 4갈래 저장)·§5(클럽 레이팅 전체 리플레이) 참고. 이 문서는 화면이 실제로 필요로 하는 데이터 필드를 코드 레벨에서 확인한 결과이며, Step3(신규 ERD) 입력으로 사용한다.

## 완료한 작업

- `src/lib/redesign-fixtures/ratings.ts` 신규 작성: `ClubRatingRankingEntry[]`, `RatingHistoryPoint[]`, `Record<string, ClubRating>` 픽스처 (타입은 `lib/queries/ratings.ts`와 동일하게 맞춤 — Step3 이후 교체가 쉽도록).
- `src/app/(main)/profile/[userId]/page.tsx`: `fetchClubRatingHistory`/`fetchClubRatingRanking`/`fetchUserClubRatings` 3개 호출부(본인 프로필 club scope 분기, 통합 탭 클럽별 레이팅 요약, 타인 프로필 분기)를 더미 픽스처로 교체. `fetchUserById`/`fetchClubById`/`fetchMyClubs`는 그대로 유지(전자는 재설계 범위 밖인 `users` 테이블, 후자 둘은 Step2a 담당 영역이라 미변경).

## 확인된 사실 (코드 근거)

- `ClubRankingCard`, `ClubAceCard`, `activity-ranking-card`, `match-game-activity-card`(`src/components/club-dashboard/**`)는 **전부 순수 프레젠테이셔널 컴포넌트**로 Supabase를 직접 호출하지 않는다 — props로만 데이터를 받는다. 따라서 이 컴포넌트들 자체는 수정이 필요 없고, **더미데이터 주입은 이 카드들을 렌더링하는 `src/app/(main)/clubs/[clubId]/page.tsx`(Step2a 담당)에서 이뤄져야 한다.** Step2a 작업자에게 전달 필요.
- `ClubRatingRankingEntry`(요구 필드: `userId`, `user: User|null`, `rating`, `matchesPlayed`), `WinRateRankingEntry`(club-dashboard 쿼리, 미확인 — Step2a에서 조회 요망), `ClubMemberForm`(userId → 승/패/최근5 outcome)이 랭킹류 카드의 최소 데이터 요구사항.
- `lib/rating/tier.ts`(`getTier`, `TIER_LABELS`, `TIER_TEXT`), `lib/rating/display.ts`(`isProvisional`)는 순수 함수로 수정 없이 그대로 재사용 가능함을 확인(실제 profile 페이지에서 import 유지).
- `recalculate-ratings-button.tsx`는 Server Action(`lib/actions/ratings.ts` 추정)을 호출하는 것으로 보이며, Step4에서 `club_player_ratings`/`club_rating_history` 스키마가 바뀌면 해당 액션도 같이 재작성 필요(Step5 계약 검증 대상으로 등록 권장).

## 완료하지 못한 부분 (후속 필요)

- ~~`fetchAnalyticsBundle`(본인 프로필)은 여전히 실제 Supabase 쿼리에 의존~~ → **해소(Week 21, "개인-데이터있음" 픽스처)**: `src/lib/redesign-fixtures/personal-analytics.ts`의 `getDummyAnalyticsBundle({ userId, gender, scope, scenario })`가 `/profile/[userId]` 본인 분기의 호출부를 대체한다. 원본 `PersonalMatch[]`(`personal-analytics-data.ts`, 오늘 기준 상대 날짜)와 `userMap`만 손으로 만들고 `personalGames`/`stats`/`h2hList`는 실 쿼리와 같은 순수 함수(`explodePersonalMatchSets`·`aggregateByMatchType`→`toQuadStats`·`buildHeadToHeadList`)로 파생한다. `?fixture=empty`로 빈 상태 시나리오 전환(`_scenario.ts`). 카드 임계값(라이벌 45~55%·파트너 3세트·히트맵 28일·표면 진단 등)은 `personal-analytics.test.ts`가 고정한다.
  - 클럽 scope는 클럽 `Match[]` 픽스처가 없어 빈 번들을 돌려준다(클럽/통합 탭 활성화 시 후속). `NtrpDifferentialCard`는 `aggregateByNtrpDiff`가 클럽 매치만 집계해 개인 scope에서는 구조적으로 빈 카드(집계 로직 변경은 별도).
- `fetchPlayerStatsBundle`(타인 프로필)은 **여전히 실제 Supabase 쿼리에 의존**한다. 반환 타입(`PlayerStatsBundle`)이 RPC 4종(`get_user_match_stats_v2`/`get_user_doubles_court_stats`/`get_user_head_to_head`/`get_user_partner_stats`)의 집계 결과라 자동 파생이 안 되고 결과 자체를 손으로 작성해야 해 보류.
  - **Step3 ERD 제안**: 현재 `AnalyticsBundle`/`PlayerStatsBundle`처럼 "쿼리 함수 반환 타입을 그대로 화면 타입으로 재사용"하는 패턴은 재설계 후에도 유지할지 재검토 필요 — 화면이 필요로 하는 필드만 담은 더 단순한 뷰모델 타입을 두면 향후 더미데이터/테스트 작성이 쉬워진다.

## 불변식/규칙 재확인 (Step1 대조 — 모순 없음)

- 클럽 레이팅은 "전체 리플레이 후 스냅샷 교체" 구조(§5) — 화면(랭킹/추세 카드)은 이 스냅샷 결과만 읽으면 되므로 화면 요구사항에 영향 없음.
- `stats_hidden` 유저는 클럽 레이팅/순위를 노출하지 않는 기존 규칙(§4)이 profile page 분기(`showStats`)에 이미 반영되어 있음 — 재설계 후에도 유지 필요.
