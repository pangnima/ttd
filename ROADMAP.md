# 테니스 클럽 플랫폼 — ROADMAP

## 완료된 단계

### Phase 1: UI 구현 (더미데이터 기반)
- [x] Week 1: 프로젝트 세팅 + 기본 레이아웃
- [x] Week 2: 더미데이터로 클럽 UI
- [x] Week 3: 더미데이터로 대진표 UI
- [x] Week 4: 더미데이터로 프로필 + 통계 UI

### Phase 2: 클라이언트 기능 구현 (localStorage)
- [x] Phase 2.1: 대진표 생성 + 결과 입력 (localStorage)
- [x] Phase 2.2: 경기 결과 입력 기능
- [x] Phase 2.3: 클럽 상세 멤버 정보 강화
- [x] Phase 2.4: 클럽 생성 기능 + 한글 기본값

### Phase 3-1: Supabase 세팅 + DB 스키마

#### Week 5: Supabase 세팅 + DB 스키마 ✅ (커밋 e63c115)
- [x] Supabase 프로젝트 연결 + 환경변수 설정 (`.env.local`)
- [x] `src/lib/supabase/` 클라이언트 3종 생성
  - `client.ts` — 브라우저용 (`createBrowserClient`)
  - `server.ts` — Server Component / Server Action용 (`createServerClient`)
  - `middleware.ts` — 세션 갱신 헬퍼
- [x] 루트 `middleware.ts` 신설 (세션 갱신 전용, 가드는 Week 6에서 추가)
- [x] DB 마이그레이션 4개 적용 (Supabase MCP `apply_migration`)
  - `0001`: 8개 테이블 스키마 + RLS 정책 + 헬퍼 함수
    - `users`, `clubs`, `club_members`, `tournaments`
    - `tournament_courts`, `tournament_rounds`, `tournament_time_slots`, `tournament_games`
    - 클럽 생성 시 owner 자동 등록 트리거 (`handle_new_club`)
    - RLS 헬퍼: `is_club_owner()`, `is_club_approved_member()` (SECURITY DEFINER)
  - `0002`: `handle_new_user` 트리거 — `auth.users` INSERT 시 `public.users` row 자동 생성
  - `0003`: admin 시드 — `장관우` (admin@tennis-club.com, ntrp 5.0)
  - `0004/0005`: SECURITY DEFINER 함수 직접 호출 권한 제거 (보안 강화)
- [x] `src/types/supabase.ts` 자동 생성 (MCP `generate_typescript_types`)
- [x] 빌드 성공 (`npm run build`), TypeScript 에러 없음

> **결정 사항 (Week 5 중 확정)**
> - 인증: 이메일 + 비밀번호 (이메일 확인 OFF, 개발 중)
> - 시드: admin 1명만 (`장관우`). 나머지 회원은 Week 6 회원가입 플로우로
> - 미들웨어 인증 가드: Week 6에서 추가 (Week 5는 세션 갱신만)
> - 게스트 선수: `public.users.is_guest` 컬럼 방식 (별도 테이블 없음)
> - `Club.memberCount`: DB 컬럼 유지, 클럽 생성 트리거로 owner 카운트 시작

---

## 진행 예정

### 사전 정리: Supabase 마이그레이션 준비 ✅

> localStorage → Supabase 전환 전에 해결해야 할 구조적 문제들

- [x] `Match`(레거시) vs `Game`(신규) 이중 구조 마이그레이션 전략 결정
  - `Game` 타입을 `Match`로 통합, 레거시 `Match`/`MatchResult` 제거 — 리네이밍 작업에서 완료
  - `stats.ts` `Match[]` 시그니처 재작성 (`set.player1/player2` → `set.team1/team2`) 완료
- [x] store 함수 시그니처 현황 파악 완료

---

### Phase 3: Supabase 연동 (Week 6~8)

#### Week 6: 인증 연결 ✅ (커밋 1769b02)
- [x] `/login` 페이지 → Supabase Auth (이메일 + 비밀번호) Server Action으로 교체
- [x] `/signup` 페이지 → 실제 가입 구현 (`supabase.auth.signUp` + `raw_user_meta_data` 전달)
  - `handle_new_user` 트리거가 `public.users` row 자동 생성 (전체 프로필 필드 포함)
  - 회원가입 폼: 이름, 닉네임, 이메일, 비밀번호, 전화번호, 성별, 주력손, 시작일, 사진
- [x] `middleware.ts`를 `src/`로 이동 + `(main)` 그룹 인증 가드 추가
  - 비로그인 → `/login` 리다이렉트, 로그인 상태 → `/dashboard` 리다이렉트
- [x] 14곳 `getCurrentUserId()` → `supabase.auth.getUser()` 전환
  - `auth-store.ts` 파일은 Week 7에서 물리 삭제 (현재 import 0건)
- [x] `lib/store/user-store.ts` 제거 + `profile-settings-form` → `updateProfileAction` 전환
- [x] Header 로그아웃 → `logoutAction` form action으로 교체
- [x] `lib/actions/auth.ts` 신설 (loginAction, signupAction, logoutAction)
- [x] `lib/actions/profile.ts` 신설 (updateProfileAction + 아바타 업로드)
- [x] Storage avatars 버킷 RLS 정책 4종 적용 (0007)
- [x] admin 시드 계정 NULL 토큰 수정 — GoTrue 로그인 오류 해결 (0008)

#### Week 7: 클럽 기능 Supabase 연결 ✅ (커밋 306b52d)
- [x] `lib/actions/clubs.ts` 신설 (createClub, updateClub, deleteClub Server Action)
- [x] `lib/actions/club-members.ts` 신설 (joinClub, approveRequest, rejectRequest)
- [x] `lib/actions/profile.ts` 신설 (updateProfile) ← Week 6에서 선행 완료
- [x] 더미 데이터 머지 로직 제거 (`[...dummy, ...stored]` 패턴 전부)
- [x] `/clubs/[clubId]/settings` 페이지 owner 권한 가드 추가
- [x] 제거: `auth-store.ts`, `user-store.ts`, `club-store.ts`, `club-member-store.ts`
- [x] 제거: `dummy/clubs.ts`, `dummy/club-members.ts`
- [x] Server Component 전환: `/dashboard`, `/clubs`, `/clubs/[clubId]`, `/clubs/[clubId]/members`
- [x] `Club.memberCount` 필드 제거 → DB COUNT 집계로 교체

#### 리네이밍: tournament → match-game 전면 교체 ✅ (커밋 62007e1)

> DB, 타입, 컴포넌트, 라우트, store 전체 명칭을 match-game으로 통일
> (Week 8 선행 작업 — 명칭 불일치 해소 + 레거시 타입 제거 병행)

- [x] DB 마이그레이션 적용 (`0009_rename_tournament_to_match_game`)
  - `tournaments` → `match_games`, `tournament_courts` → `match_game_courts`
  - `tournament_rounds` → `match_game_rounds`, `tournament_time_slots` → `match_game_time_slots`
  - `tournament_games` → `match_game_matches` (의미 중복 회피)
  - 컬럼 `tournament_id` → `match_game_id` (자식 테이블 3개)
  - FK 제약 10개 + RLS 정책 20개 RENAME
- [x] `src/types/supabase.ts` 재생성 (match_game_* 반영)
- [x] `src/types/index.ts` 전면 갱신
  - `Tournament` → `MatchGame`, `Tournament.games: Game[]` → `MatchGame.matches: Match[]`
  - `Game` → `Match` (신규), `GameResult` → `MatchResult` (신규)
  - 레거시 `Match` / `MatchResult` 타입 제거
- [x] `src/lib/stats.ts` 재작성 — `result.sets` 필드 `player1/player2` → `team1/team2`
- [x] `src/lib/store/tournament-store.ts` → `match-game-store.ts` (키: `tc_tournaments` → `tc_match_games`)
- [x] `src/lib/dummy/tournaments.ts` → `match-games.ts`
- [x] `src/components/tournaments/` → `src/components/match-games/` (6개 파일 리네이밍)
  - `tournament-table.tsx` → `match-game-table.tsx` (props: `MatchGame`, `matches`)
  - `tournament-create-form.tsx` → `match-game-create-form.tsx`
  - `tournament-detail-content.tsx` → `match-game-detail-content.tsx`
  - `tournaments-page-content.tsx` → `match-games-page-content.tsx`
- [x] 라우트 이동: `/clubs/[clubId]/tournaments` → `/clubs/[clubId]/match-games`
  - 동적 파라미터: `[tournamentId]` → `[matchGameId]`
- [x] `sidebar.tsx`, `mobile-nav.tsx` — 경로 문자열 + 상태명 갱신
- [x] `clubs/[clubId]/page.tsx`, `recent-matches.tsx` — 참조 갱신
- [x] Dead code 제거: `tournament-view.tsx` (import 0건), `match-store.ts` (write 0건)

#### Week 8: 대진표 기능 Supabase 연결 ✅ (커밋 237b652)
- [x] `lib/actions/match-games.ts` 신설 (createMatchGameAction, deleteMatchGameAction, saveMatchResultAction, addGuestPlayerAction)
- [x] `lib/queries/match-games.ts` 신설 (fetchMatchGamesByClubId, fetchMatchGameById, fetchMatchesByUser, fetchClubMembersWithGuests)
- [x] 대진표 CRUD → Supabase `match_game_matches` 테이블 연동
- [x] `match-game-store.ts` 제거 (localStorage → Supabase 교체)
- [x] `guest-player-store.ts` 제거 → `public.users` (is_guest=true) 연동
- [x] `members-content.tsx`, `club-members-preview.tsx` store 의존성 제거 완료
- [x] `dashboard/page.tsx` 통계 실제 데이터 연결 (fetchMatchesByUser 연결, 단식/복식 통계 분리)
- [x] 실시간 경기 결과 반영 (`revalidatePath` 적용)
- [x] `dummy/users.ts` 제거 — `recent-matches.tsx`, `head-to-head-table.tsx`에서 여전히 사용 중 (Week 9에서 정리)

### Phase 4: 통계 + 배포 (Week 9)

#### Week 9: 통계 연결 + 배포 (진행 중)
- [x] `/profile/[userId]` 페이지 구현 (Server Component)
  - `src/app/(main)/profile/[userId]/page.tsx` 신설
  - `profile-header.tsx`, `stats-scope-notice.tsx` 컴포넌트 신설
  - 헤더 아바타 → 프로필 링크 연결
  - 멤버 카드에서 프로필 진입 동선 확보 (기존 링크 확인)
- [x] 플레이어 통계 → Supabase 쿼리 기반으로 교체 (`stats.ts` 리팩토링)
  - 마이그레이션 `0012_user_match_stats_view_and_rpc` 적용
    - `user_match_participations` view (security_invoker=on)
    - `get_user_match_stats(p_user_id uuid)` RPC
    - `get_user_head_to_head(p_user_id uuid)` RPC
  - `src/lib/queries/stats.ts` 신설 (`fetchUserMatchStats`, `fetchUserHeadToHead`)
  - `src/lib/stats.ts` 슬림화 (`calcPlayerStats`, `calcHeadToHead` 제거, `getMatchesByUser`만 유지)
  - `dashboard/page.tsx` → RPC 호출로 교체
  - **결정 기록**: `winner_id`가 'team1'/'team2' 리터럴이라 SQL 집계가 복잡 → PostgreSQL view로 통일
- [x] 게스트 선수 최종 모델 확정 (`users.is_guest` 컬럼 방식 검증)
  - `User` 타입에 `isGuest: boolean` 추가 (`src/types/index.ts`)
  - `mapUserRow`에서 `is_guest` 매핑 (단일 출처: `src/lib/queries/users.ts`)
  - `player-select.tsx`의 `id.startsWith('guest-')` 휴리스틱 → `user.isGuest`로 교체
  - `guest-badge.tsx` 신설, 멤버 리스트/preview에 배지 노출
  - 게스트는 프로필 링크 비활성화
- [x] 인프라 정리
  - `src/lib/queries/users.ts` 신설 (`fetchUserById`, `fetchUsersByIds`, `mapUserRow`)
  - `clubs.ts`, `match-games.ts`의 중복 `mapUserRow` → `users.ts`에서 import로 통일
  - `src/lib/dummy/` 디렉토리 전체 삭제 (users.ts, clubs.ts, club-members.ts)
- [x] `next.config.ts` 이미지 도메인 화이트리스트 추가 (Supabase Storage)
- [x] 빌드 최적화 확인 (`npm run build`)
  - TypeScript 에러 없음
  - 빌드 성공, `/profile/[userId]` Dynamic 라우트 등록 확인
- [ ] `auth_leaked_password_protection` 활성화 (Supabase Dashboard → Auth → Security)
- [ ] Vercel 배포 설정 + 환경변수 등록
- [ ] 도메인 설정 (선택)

### Week 10: 개인 분석 페이지 ✅ (2026-05-27)

#### DB 마이그레이션 (Supabase MCP `apply_migration`)
- [x] `0013_court_surface`: `match_game_courts.surface` 컬럼 추가 (`hard|clay|indoor|omni`, NULL 허용)
- [x] `0014_personal_matches`: `personal_matches` 테이블 신설 (RLS 4종, user_id 기반)
- [x] `0015_ai_coaching_cache`: `ai_coaching_cache` 테이블 신설 (bundle_hash 기반 캐싱)

#### 새 라우트 & 페이지
- [x] `/me/analytics` — 개인 분석 대시보드 (Server Component, 전체 클럽 합산)
- [x] `/me/personal-matches` — 개인 경기 목록
- [x] `/me/personal-matches/new` — 경기 입력 폼
- [x] `/me/personal-matches/[id]/edit` — 경기 수정 폼

#### 사이드바
- [x] `nav-items.ts`에 `개인 분석 (BarChart3)` 메뉴 추가

#### 데이터 레이어
- [x] `src/lib/queries/personal-matches.ts` 신설
- [x] `src/lib/queries/analytics.ts` 신설 (`fetchAnalyticsBundle`)
- [x] `src/lib/queries/match-games.ts` 수정 — `fetchMatchesByUser`에 `court:match_game_courts(surface)` embed + `courtSurfaceByMatchId` 반환
- [x] `src/lib/queries/player-profile.ts` 수정 — `PlayerStatsBundle`에 `courtSurfaceByMatchId` 추가
- [x] `src/lib/analytics/aggregations.ts` 신설 (표면별/폼/세트분포/NTRP차이/컴백률/매치타입/월별 집계)

#### Server Actions
- [x] `src/lib/actions/personal-matches.ts` 신설 (create/update/delete)
- [x] `src/lib/actions/match-game-courts.ts` 신설 (`updateCourtSurfaceAction`)
- [x] `src/lib/actions/ai-coaching.ts` 신설 (Claude Sonnet API + `ai_coaching_cache` 24h 캐싱)
- [x] `@anthropic-ai/sdk` 의존성 추가

#### 컴포넌트 (`src/components/analytics/`)
- [ ] `SurfaceStatsCard` — 코트 표면별 승률 → **Week 11로 이관**
- [ ] `RecentFormCard` — 최근 10경기 폼 + 스트릭 → **Week 11로 이관**
- [ ] `StrengthWeaknessCard` — 룰 기반 강점·약점 진단 → **Week 11로 이관**
- [ ] `NtrpDifferentialCard` — 강자/동급/약자 상대별 승률 → **Week 11로 이관**
- [x] `AICoachingCard` — Claude AI 코칭 분석 (캐시 표시, 재분석 버튼) — **UI 임시 숨김 (향후 재활성화 가능)**
- [ ] `PersonalMatchesPreview` — 외부 경기 최근 5개 미리보기 → **Week 11로 이관**
- [x] `PersonalMatchListItem` — 목록 행 (수정/삭제)
- [x] `PersonalMatchForm` — 경기 입력/수정 폼
- [x] `AnalyticsModeTabs` — 2-모드 탭 (total/personal 쿼리스트링 기반)

#### 개인 분석 페이지 개선 (`/me/analytics`) ✅
- [x] **2-모드 토글 도입** — 전체(클럽+개인) / 개인경기 전환 UI (`AnalyticsModeTabs`)
- [x] **1:1 맞대결 비교 카드 추가** — `HeadToHeadCard` (셀렉트로 상대 선택, 승률·세트·최근 결과 비교)
- [x] **통계 모집단 통일** — `fetchMatchesByUser`에 `is_fixed=true` 필터 적용, `user_match_participations` 뷰 수정
- [x] **역전 지수 집계 함수 추가** — 첫 세트 패배 후 매치 승리 비율 (`aggregateComebackRate`)
- [x] **AI 코칭 카드 UI 임시 숨김** — 백엔드 코드(`ai-coaching.ts`)·DB 테이블(`ai_coaching_cache`) 보존
  - 재활성화 방법: `analytics/page.tsx` 상단에서 4줄 import 복구 + JSX 마운트 1줄 추가

> **결정 기록 (Week 10)**
> - 기존 RPC를 변경하지 않고 JS에서 personal_matches 합산 (dashboard/profile 회귀 없음)
> - `match_game_courts.surface`는 `is_fixed=true` 대진표도 소급 수정 허용 (통계 backfill)
> - AI 캐시 키: 통계 묶음 SHA-1 (매치 count 포함) → 매치 추가 시 cache miss
> - AI 모델: `claude-sonnet-4-6` (비용/품질 균형), 24시간 캐시
> - **2-모드 토글 구현**: 전체(클럽+개인 합산) / 개인경기 전환 (`?mode=total|personal`)
>   → `fetchAnalyticsBundle`의 scope 파라미터로 통계 RPC 분기, UI는 `AnalyticsModeTabs`로 처리
> - **is_fixed 필터 일원화**: 미확정 경기가 통계에 섞이는 문제 해소 → dashboard·profile·analytics 모두 동일 모집단
> - **AI 코칭 임시 숨김 배경**: 비용/UX 검증 보류, 백엔드는 유지하여 추후 토글로 부활 가능

---

### Week 11: 정리 + 잔여 카드 + 안정화 (부분 완료)

#### 미문서화 커밋 흡수 (2026-05-28 ~)
- [x] `d9c38e9` 배포 안전장치 — `error.tsx` 5종, `loading.tsx`, `global-error.tsx`, `not-found.tsx`, `app/layout.tsx` 메타데이터 보강
- [x] `2a59f68` 대형 컴포넌트 분리 + 대진표 폼 로직 lib 추출
  - `match-game-cell-components.tsx` 신설, `lib/match-games/form-mapping.ts` 신설, `lib/dashboard/match-type-style.ts` 신설
- [x] `5b54013` dashboard·profile 통계 데이터 페칭·레이아웃 공통화
  - `components/profile/player-stats-section.tsx` 신설, `lib/queries/player-profile.ts` 공통 fetch 추가
- [x] `7367070` 전체 뱃지 모서리 `rounded-full` → 4px 사각형으로 변경
- [x] `a193761` 대시보드 텍스트 위계 확대 및 폰트 색상 시인성 개선

#### Week 10 잔여 카드 5종 구현
- [x] `SurfaceStatsCard` — `aggregateBySurface` 소비, 코트 표면별 승률 시각화
- [x] `RecentFormCard` — `aggregateRecentForm` 소비, 최근 10경기 W/L 시퀀스 + 현재 스트릭
- [x] `StrengthWeaknessCard` — `diagnostics.ts` 신설 (룰 기반 진단) + 강점·약점 표시
- [x] `NtrpDifferentialCard` — `aggregateByNtrpDiff` 소비, 강자/동급/약자 3구간 승률
- [x] `PersonalMatchesPreview` — 개인 경기 최근 5개 미리보기 + "전체 보기" 링크

#### 정리 / 데드 코드 제거
- [x] `src/components/clubs/pending-members-card.tsx` 삭제 (import 0건 확인)
- [x] `src/lib/analytics/aggregations.ts` 도메인별 파일 분해
  - `shared.ts` / `surface.ts` / `form.ts` / `ntrp.ts` / `match-type.ts` / `head-to-head.ts`
  - 미사용 export 제거: `aggregateSetDistribution`, `aggregateMonthlyTrend`, `extractOpponentIds`, `aggregateHeadToHead`(비-Unified), 동반 타입들
- [x] 데드 export 정리
  - `src/lib/dashboard/tokens.ts`: `DIVIDER`, `TEXT_HEADING`, `TEXT_BODY_STRONG`, `TEXT_BODY`, `TEXT_DISABLED`
  - `src/lib/queries/player-profile.ts`: `createEmptyPlayerStatsBundle`
- [ ] `src/lib/queries/stats.ts` V2/Unified 중복 정리 — 매핑 함수 분리

#### 고위험·고가치 리팩토링
- [x] `src/components/profile/profile-settings-form.tsx` — Client `createClient` fetch → Server prefill 전환
- [x] `src/components/analytics/ai-coaching-card.tsx` — 파일 하단 `React` namespace import 위치 수정

#### 배포 (Week 9에서 이관)
- [ ] Vercel 배포 + 환경변수 등록 (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY`)
- [ ] Supabase Dashboard → Auth → Security → `auth_leaked_password_protection` 활성화
- [ ] Supabase URL 화이트리스트 (Site URL, Redirect URLs)
- [ ] `metadataBase` 환경변수화 (`src/app/layout.tsx` 하드코딩된 URL)
- [ ] 도메인 설정 (선택)

---

### Week 12: 클럽 대시보드 신설 & 개인 화면 역할 분리 ✅ (2026-05-29)

> 기존 `/dashboard`(개인 통계 중심)를 폐기하고, 클럽 단위 운영 도구로 재정의.
> 개인 통계는 `/me/analytics`로 일원화하여 화면 역할을 명확히 분리.

#### 라우트 재편
- [x] `/dashboard`(나의 대시보드) 폐기 — `/clubs`로 redirect, 사이드바에서 제거
- [x] `/clubs/[clubId]/dashboard` 신설 — owner + officer 전용 가드
- [x] 로그인 후 진입 경로 `/dashboard` → `/clubs` 통일 (`auth.ts`, `middleware.ts`)
- [x] 개인 통계는 `/me/analytics` 단독 담당으로 역할 명확화

#### 클럽 대시보드 위젯 4종 (`/clubs/[clubId]/dashboard`)
- [x] **가입 대기 승인 패널** — pending 회원 일괄 노출 + 승인/거절 액션
- [x] **회원 통계** — 총원·신규 가입·활동률 요약 카드
- [x] **대진표 활동 요약** — 최근 대진표 개수·확정 비율 등 운영 지표
- [x] **이번 달 활동도 랭킹** — `get_club_activity_ranking` RPC 소비

#### DB / RLS
- [x] RPC `get_club_activity_ranking` 신설 — 단식·복식 player 컬럼 unnest 후 매치 참여 횟수 집계
- [x] RLS 정책 추가 — officer도 pending 회원 승인/거절 가능 (`club_members_update_pending_by_officer`)

> **결정 기록 (Week 12 — 대시보드 재편)**
> - `/dashboard`는 "개인 통계 + 클럽 운영"이 섞여 정체성이 모호했음 → 클럽 단위 운영 도구로 분리, 개인 통계는 `/me/analytics`로 이관
> - officer 역할의 운영 권한 확대(승인/거절) — owner 단독 부담 해소
> - 활동도 랭킹은 RPC로 처리(단식 `player1/2_id` + 복식 `team1/2` 배열 unnest) — 클라이언트 집계 비용 회피

---

### Week 13: 레이아웃 통일 + 통계 검증 ✅ (2026-06-05)

#### 미문서화 커밋 흡수
- [x] `971b337` — 클럽 대시보드 승률 랭킹 카드 신설 (`WinRateRankingCard`, `get_club_win_rate_ranking` RPC)
- [x] `75b5543` — 중복 페이지 통합 + 컴포넌트/디렉토리 심플화 (`/me/analytics` → `/profile/[userId]` 통합, `stats/` 디렉토리 정리)
- [x] `c41ef16` — 사이드바 프로필 링크 직렬화 안전 방식 교체 (Client Component에 함수 전달 금지)
- [x] `a592361` — 내 분석 페이지 전면 개선 (scope 탭·헤더·카드 레이아웃·SelfAnalyticsSection 신설)

#### 레이아웃 통일
- [x] `src/components/common/page-container.tsx` 신설 — 페이지 루트 공용 컨테이너 (`space-y-6`, full-width)
- [x] 14개 페이지 루트를 `PageContainer`로 교체 (max-w-lg/3xl/4xl, mx-auto, w-full 제거)
  - clubs/page, clubs/new, clubs/[clubId], members, match-games 목록/new/상세/수정
  - clubs/settings, personal-matches 목록/new/edit, profile/[userId], profile/settings
- [x] `loading.tsx`의 `max-w-4xl` 제거
- [x] 린트 정리 — `set-state-in-effect` eslint-disable 3건, 미사용 `useSearchParams` import 제거

#### 통계 수치 검증
- [x] Supabase MCP로 RPC/뷰 SQL 본문 조회 및 분석
  - `is_fixed = true` 필터, `winner_id` 판정, 세트 집계, 코트 판정 모두 정상 확인
  - 실데이터(남자2, 14경기) 수기 기준값 vs RPC 결과 완전 일치
- [x] `supabase/migrations/0016_stats_baseline_snapshot.sql` — SQL 기준 스냅샷 레포 편입 (버전관리 시작)
- [x] `docs/stats-verification.md` 검증 리포트 작성
- [x] 코드 수정 3건
  - `lib/analytics/form.ts` — 날짜 동률 시 비결정적 정렬 → `id` 2차 키로 결정적 정렬
  - `lib/analytics/diagnostics.ts` — 컴백 진단 주석 (`>= 3`) 정합
  - `lib/analytics/form.ts` — `ComebackStats.total` JSDoc 명확화 (분모 불일치 명시)

> **결정 기록 (Week 13)**
> - 레이아웃 기준: 내 분석 페이지(`/profile/[userId]`) = full-width + `space-y-6` + 레이아웃 `p-4 md:p-6` 패딩 의존
> - 폼 페이지도 전부 full-width 통일 (사용자 결정)
> - 통계 검증 결과: SQL 로직 모두 정상, 코드 측 3건 수정. 핵심 수치 불일치 없음
> - SQL 버전관리: 0001~0015는 MCP apply_migration으로만 관리됐으나 0016부터 로컬 `.sql` 파일로 버전관리 시작
> - 데드 RPC `get_user_match_stats` v1은 서버에 존재하나 호출처 없음 — 향후 DROP 대상

---

## 앞으로 개선해야할 점

### 중기: 기술 부채 / 품질 개선
<!-- 완료: d9c38e9 에러 바운더리·로딩 일관화, Week 13 레이아웃 통일·린트 정리 -->
- [ ] **통계 단일 소스화** — `lib/analytics/*`(순수함수) vs `lib/queries/stats.ts`(RPC) 이중 경로 통합. 현재 두 경로가 동일 수치를 내나 유지 비용과 불일치 리스크 잠재 (가장 큰 기술 부채)
- [ ] **SQL 마이그레이션 전면 버전관리** — 0001~0015를 `supabase/migrations/`로 backfill (0016부터 시작됨)
- [ ] **통계 단위 테스트** — `lib/analytics/*` 순수함수에 고정 픽스처 Vitest 테스트 작성 (회귀 방지)
- [ ] **최근 폼 정렬 개선** — 클럽 경기는 일 단위 날짜만 있어 같은 날 경기 순서가 UUID에 의존. `match_game_matches.created_at` 컬럼 추가 시 더 정확한 정렬 가능
- [ ] **데드 RPC 정리** — `get_user_match_stats` v1 DROP 마이그레이션
- [ ] **폼 검증 라이브러리** — react-hook-form + zod 도입 검토 (현재 Server Action 직접 검증)
- [ ] **테스트 도입** — Playwright e2e (로그인, 클럽 생성, 대진표 생성·결과 입력 플로우)
- [ ] **접근성(a11y)** — 색 대비, ARIA 레이블, 키보드 네비게이션 점검
- [ ] **모니터링** — Sentry 에러 수집 / Vercel Analytics
- [ ] **DB 인덱스 점검** — `match_game_matches`의 `team1 @> ARRAY[userId]` 쿼리 성능

### 장기: Phase 5+ 신기능 로드맵
- [ ] **알림** — 가입 신청/승인, 결과 확정 알림 (Supabase Realtime 또는 Edge Function + push)
- [ ] **경기 일정 공유** — ICS 내보내기, 캘린더 연동
- [ ] **매칭 추천** — NTRP 기반 자동 페어링 알고리즘
- [ ] **리그/시즌** — 누적 랭킹, 시즌 단위 집계 (별도 테이블 또는 view)
- [ ] **클럽 게시판** — 공지/자유 게시판 (RLS: approved 멤버만 쓰기)
- [ ] **모바일 PWA** — 오프라인 캐시, 홈 화면 추가, 푸시 알림
