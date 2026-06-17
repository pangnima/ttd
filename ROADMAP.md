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
  - [ ] Redirect URLs에 `/auth/confirm` 경로 허용 추가 (`http://localhost:3000/**` + 배포 도메인)
- [ ] **비밀번호 재설정 메일 템플릿 설정** — Reset Password 템플릿 본문을 `<a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery">`로 교체 (코드는 구현 완료, 대시보드/Management API 설정만 남음)
  - 적용 방법: 대시보드 Authentication → Emails → Reset Password, 또는 Management API `PATCH /v1/projects/{ref}/config/auth`의 `mailer_templates_recovery_content` 필드
  - 미설정 시 `/forgot-password` → 메일 링크 → `/reset-password` 플로우가 동작하지 않음
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

### Week 14: 클럽 동적 레이팅 시스템 (NTRP ELO) ✅ (2026-06-10)

> 가입 시 자가 선언하는 정적 `users.ntrp`와 별개로, **클럽마다 독립적으로 운영되는 동적 레이팅(클럽 NTRP)** 신설.
> 클럽 가입 시 2.5에서 시작해 확정 경기 결과로 자동 변동. 알고리즘 단일 진실: `docs/rating-system.md`.

#### 알고리즘 / 엔진 (커밋 2b38d5e)
- [x] NTRP 스케일 ELO 설계 — 기대승률 `1/(1+10^((Rb-Ra)/D))` (D=1.0), 변동 `K·marginFactor·(S−E)`
  - 의외성 반영: 강자의 예상 승은 소폭, 약자의 이변승은 크게 상승 (ELO 기대값 항이 자동 처리)
  - 잠정기 차등 K(0.20/<10경기, 0.10 이후), 세트·게임 차 마진 가중(1.0~1.5), 경계 클램프 [1.0,7.0]
- [x] `src/lib/rating/` 순수 엔진 신설 — `constants.ts`, `elo.ts`(`expectedScore`/`marginFactor`/`replayClubRatings`)
- [x] `vitest` 도입 + `elo.test.ts` 16케이스(손계산 일치·결정성·경계·복식) 통과
- [x] `docs/rating-system.md` 명세서 작성 (알고리즘 + 참고 자료 + Worked Examples)

#### DB / 재계산 파이프라인 (커밋 98e99b9, a3972f9, 97326a6)
- [x] 마이그레이션 `0018_club_rating_system` 적용 (Supabase MCP)
  - `club_player_ratings` (club_id, user_id) PK — 게스트 포함, 기본 2.5
  - `club_rating_history` — 경기별 rating_before/after/delta (추세·감사·변동폭용)
  - RLS: approved 멤버만 SELECT, 쓰기는 SECURITY DEFINER RPC `apply_club_rating_snapshot`로만
- [x] 전체 결정적 재계산(Full Recompute) — `lib/queries/ratings.ts` 조회 → 순수 엔진 replay → RPC 영속화
  - `lib/actions/ratings.ts`의 `recalculateClubRatings` — 경기 확정/수정/삭제(확정 대진표 한정) 트리거 연결
- [x] owner용 수동 재계산 버튼 (클럽 설정) — 과거 경기 백필·문제 복구용

#### 레이팅 노출 (커밋 0d3465d, f574bec)
- [x] 클럽 홈 — "클럽 레이팅 랭킹" 카드(소수 3자리, 잠정 뱃지) + 멤버 미리보기 클럽 NTRP 병기
- [x] 멤버 목록 — 클럽+글로벌 NTRP 병기, 잠정 뱃지, 클럽 레이팅순 정렬 토글
- [x] 경기 상세 — 확정 경기 선수별 변동폭(▲/▼) + 상단 변동 요약 카드
- [x] 프로필 — 클럽 레이팅 추세 SVG 스파크라인 + 헤더 클럽 레이팅 뱃지
  - 비공개(`statsHidden`) 프로필은 타인에게 클럽 레이팅·추세 미노출
- [x] 공용: `ProvisionalBadge`, `formatClubRating`/`isProvisional`, `ClubRating` 타입(types/index.ts 승격)
- [x] `verify` 스킬로 전 화면 실제 구동 검증 (백필→랭킹·병기·정렬·변동폭·요약·추세 전부 확인, 콘솔 0 errors)

> **결정 기록 (Week 14)**
> - 통합(개인) NTRP는 수동 유지, 클럽 NTRP만 동적 — 둘을 별도 저장소로 분리(클럽별 독립)
> - 표시는 연속 소수 3자리(UTR·동적 NTRP 관행: 내부 연속값 운영 + 표시), 게스트도 포함·잠정
> - 알고리즘은 테스트 가능한 순수 TS, 영속화만 RPC — 기존 `lib/analytics/*` 순수함수 패턴과 정합
> - ELO 순차 의존성 + 확정 경기 편집 가능성 → 증분 대신 클럽 단위 전체 재계산(멱등·결정적)
> - 비공개 프로필 정책: 프로필 페이지에서만 클럽 레이팅 차단, 클럽 랭킹·멤버 목록 등 집계 뷰는 글로벌 NTRP와 동일하게 노출 유지

---

### 코드 점검 / 배포 전 정리 (브랜치 `chore/code-audit-cleanup`)

> 배포 직전 전면 점검 — **저위험·고확신 정리만** 수행. 고위험 대규모 작업은 아래 "기술 부채"로 이관.

- [x] **전적 표시 단일화** — `N승 M패 K무` 문자열 12곳 → `formatRecord`(`lib/dashboard/outcome.ts`)
- [x] **최근 폼 배지 공용화** — `RecentFormBadges`(size variant) 추출, `club-ranking-card`·`rival-row` 적용
- [x] **잠재 버그 3건 검증 — 모두 거짓 양성**(코드 변경 없음):
  - `ratings` 정렬 `date ?? ''` fallback → `match_games!inner` join이 행 존재를 보장
  - `elo.marginFactor` 0-0 세트 → `total === 0` 가드로 이미 방어
  - `auto-generate` mixed 팀 구성 → `selectCourtPlayers`가 남2·여2 보장 + `splitTeams`는 비공개 함수
- [x] **위생 재확인** — `any`/`console.log` 0건, 백업·임시 파일 0개, 미사용 export 0건(`extract*` 헬퍼 전부 사용 중)
- [x] **빈 `(main)/dashboard/` 폴더 제거** (리다이렉트는 `next.config`가 담당)
- [x] **CLAUDE.md 폴더 트리 정합화** — actions(+`match-game-courts`·`ratings`), queries(+`ratings`), components(+`landing`), lib(+`rating`·`personal-matches`)

> **판단 기록 (코드 점검)**
> - `calcWinRate`(`tokens.ts`: null / `analytics/shared.ts`: 0) 두 정의는 반환 시맨틱·레이어가 달라 **통합 보류** — null은 "경기 없음" 구분에 실사용(win-rate-ring)
> - 날짜 포맷 `format.ts`(ISO·로컬) vs `date-utils.ts`(YYYY-MM-DD·UTC 안전)는 역할이 달라 통합하지 않음
> - 행 컴포넌트(`RivalRow`/`PartnerChemistryRow`) 제네릭화는 props 폭발 위험으로 미진행 (핵심 중복은 `ProfileLink`/`GuestBadge`로 이미 공용화됨)

---

### Week 15: 개인 레이팅·티어 + 대진표 개편 + 배포 준비 기능군 ✅ (2026-06-15 ~ 06-17)

> 3일에 걸친 대규모 기능·UX 작업 묶음. 개인 경기 기반 동적 개인 NTRP·계급(티어) 도입,
> 대진표 상세 매트릭스 개편, 라이트 모드 접근성, 비밀번호 재설정·탈퇴·초대·OG 등 배포 직전 기능군.

#### 개인 경기 레이팅 + 계급(티어) 시스템 (커밋 4b5d576, adc3903, 2edef89)
- [x] 개인 경기(`personal_matches`) 승패 기반 **동적 개인 NTRP** — 온더플라이 계산(영속화 없음, 클럽 ELO primitive 재사용)
  - `src/lib/rating/personal-rating.ts` 신설 (+ `personal-rating.test.ts`) — '나' 시계열만 순차 재생, 상대 레이팅은 저장 추정치 → 등록상대 ntrp → 본인 ntrp → 기본 2.5 순으로 결정
  - 마이그레이션 `0026_users_personal_ntrp` — `users.personal_ntrp` 캐시(개인경기 추가/수정/삭제 시 서버 재계산, 폼 프리필용)
- [x] **계급(티어) 시스템** — 연속 rating(1.0~7.0)을 8계급(아이언~챌린저)으로 밴딩 + 계급당 0~100 포인트 환산
  - `src/lib/rating/tier.ts` (+테스트) — `getTier`/`getTierProgress`/`getTierDelta`, 경계는 `TIER_BANDS` 1곳에서 관리
  - `src/lib/rating/display.ts` (+테스트), `components/common/tier-icon.tsx`·`tier-emblem.tsx` 신설
  - `/tiers` 계급 아이콘 미리보기 페이지(noindex, 개발용) — `public/tiers/*.svg` 교체 확인
- [x] 개인 경기 고도화 마이그레이션 `0020~0025` — 상대 주력손(`0020`), 복식 선수(`0021`), 플레이 시간(`0022`), 상대 NTRP(`0023`), 복식 디테일(`0024`), match-level 애드 컬럼 제거(`0025`)
- [x] 클럽 멤버 카운트 RPC `0019_club_member_counts`

#### 대진표 상세 UI/UX 개편 — 매트릭스·티어·승패색·특별매치 (커밋 7af5364, 29b4c67, ea78d8e)
- [x] 기본 뷰를 **매트릭스(그리드)** 로 전환, 선수명 앞 **티어 아이콘**, 스코어·선수명에 **승/패 색** 적용
- [x] **특별매치 배지** — 명승부(접전)·라이벌(cross-pair 박빙) 판정. 명승부 기준에 한 게임차(6-5·5-4·7-6) 포함
  - `src/lib/match-games/special-match.ts` (+테스트), `match-view-helpers.ts` 신설
  - `components/match-games/player-name.tsx`(선수명 단일화), `special-match-badge.tsx`, 매트릭스 셀/리스트 뷰 컴포넌트 분리

#### 사이드바 rail + BASELINE 로고 (커밋 b49bb54)
- [x] 사이드바 **접기/펼침(rail) 토글** — `components/common/sidebar-context.tsx` 신설(context + 헤더 PanelLeft 버튼 + 플라이아웃), collapsed 상태 테마 토글·클럽 네비 트리 대응
- [x] **BASELINE 브랜드 로고**(라임 코트 아이콘 + Geist Mono 워드마크)로 사이드바·헤더·모바일 메뉴 통일 — `brand-logo.tsx`, `public/logo.svg`

#### 클럽 홈 개선 (커밋 0e185b8, b430f61)
- [x] 클럽 **탈퇴 버튼/다이얼로그**(`clubs/leave-club-button.tsx`), 운영진 **임원(officer)** 표기, **정기시간**(고정코트) 설정·표시, **우리 클럽 에이스**(타입별 승률 TOP3, `club-dashboard/club-ace-card.tsx`), 대진표 현황 타입별 고도화
- [x] 에이스·활동 랭킹 카드 링크에 누락된 `clubId` 전달, 운영진 이름 ProfileLink화
- [x] 마이그레이션 `0028_club_court_schedule` — `clubs.court_schedule`(자유 텍스트 1줄, NULL=미표시)

#### 클럽 생성 기본 로고 + 삭제 비밀번호 보호 (커밋 d7e1126)
- [x] 클럽 생성 시 기본 로고 셔플 선택(`clubs/club-logo-field.tsx`), 클럽 해체 시 비밀번호 scrypt 해시 저장·검증(`src/lib/club-password.ts`)
- [x] 마이그레이션 `0027_club_delete_password`

#### 로그인/회원가입 UX + 비밀번호 재설정 (커밋 d23d873, fdf8e13)
- [x] Supabase 영문 에러 **한글 매핑** — `src/lib/auth/auth-error-messages.ts`(`mapAuthError`), 랜딩 nav 인증 분기
- [x] **비밀번호 재설정 플로우** — `(auth)/forgot-password`·`(auth)/reset-password` 페이지 + `app/auth/confirm/route.ts` 핸들러 신설 (메일 템플릿 설정은 배포 체크리스트 참조)
- [x] 회원가입 `AvatarUploadField`(기본 아바타 셔플), 비밀번호 확인, 연락처 자동 하이픈(`src/lib/format/phone.ts`)

#### 내 정보 수정 정책 정비 (커밋 94eaf3f)
- [x] 이름·성별·주력손·테니스 시작일 **읽기 전용**화(서버 액션 update 대상에서도 제거)
- [x] 헤더를 layout props 기반으로 전환(클라이언트 fetch 제거), 저장 후 닉네임·아바타 **즉시 반영**(revalidatePath + router.refresh)

#### 탈퇴 회원 처리 (커밋 f0d5843, e098bdd)
- [x] **계정 탈퇴 soft delete**(익명화) — `users.deleted_at` 마킹 + 재로그인 차단, 과거 경기/레이팅 보존
- [x] 대진표에서 탈퇴 선수 **이름 복원 + '탈퇴' 배지**(`src/lib/match-games/former-members.ts`의 `augmentWithFormerMembers`), 이름 line-through, 클럽 레이팅 랭킹에서 탈퇴자 제외(ELO 값 보존)
- [x] 목록 페이지 탈퇴 회원 UUID 노출 수정
- [x] 마이그레이션 `0029_users_soft_delete`

#### 클럽 초대 링크 — 비공개 클럽 가입 (커밋 89df42a)
- [x] 운영자 초대 링크 발급(`components/clubs/club-invite-card.tsx`) → 링크 사용자가 즉시 approved 멤버로 가입
- [x] `club_invites` 테이블 + `get_invite_preview`/`join_club_via_invite` RPC(SECURITY DEFINER, RLS 우회)
- [x] **신규 라우트** `clubs/join/[token]` — 비로그인 진입 시 로그인 후 원래 링크 복귀(open-redirect 방지, `lib/supabase/middleware.ts`)
- [x] 마이그레이션 `0030_clubs_select_owner`(비공개 클럽 생성 RLS), `0031_club_invites`

#### OG 메타데이터 — 링크 공유 미리보기 (커밋 4b083e5)
- [x] 루트 메타 보강(siteName·twitter 카드) + **next/og 전역 동적 OG 이미지**(`app/opengraph-image.tsx`, `src/lib/og/brand.ts`)
- [x] 초대 링크 공개화 + 클럽별 `generateMetadata`·동적 OG 이미지(`clubs/join/[token]/opengraph-image.tsx`), 비로그인 초대 미리보기
- [x] 마이그레이션 `0032_invite_preview_anon`(`get_invite_preview` anon 허용)

#### 라이트 모드/WCAG 접근성 + 로테이션 복식 + 통계 카드 (커밋 66b99fa, dcb6347, 4e430aa, 1a62bec, d497397, 9d9a258, daa0ace, 0f6051b, aa47b30, acc8275)
- [x] **WCAG AA 시인성** — `muted-foreground` 명도 보정(대비 4.5:1↑), 배지 raw 팔레트 `text-X-600 dark:text-X-400` 이원화, input border 대비 강화
- [x] **라이트 모드** 빈 상태/카드/input·select·button을 채워진 surface(`bg-card`)로 — `lib/dashboard/tokens.ts` 토큰 중심
- [x] **로테이션(아메리칸) 복식 입력** — 4명 이상 파트너 교대를 게임별 레코드로 저장(`src/lib/personal-matches/rotation.ts`·`validators.ts`, DB/액션 변경 없이 배열 입력 활용)
- [x] 경기 입력 폼 공통화·섹션 분해(`MATCH_TYPE_OPTIONS`·`EnumSelect`·form-sections), 개인 경기 카드 모바일 UI, 승률추이·활동 히트맵 가독성, 1:1 맞대결 비교 카드 고도화(`lib/analytics/head-to-head.ts`의 `summarizeHeadToHead`), 3카드 행 디자인 통일(`StatBarRow`)

> **결정 기록 (Week 15)**
> - **3중 NTRP 체계 정리**: ① 통합/자가선언 NTRP(`users.ntrp`, 정적·수동) ② 클럽 NTRP(`club_player_ratings`, 클럽별 ELO·동적, Week 14) ③ 개인 NTRP(`users.personal_ntrp`, 개인경기 기반 온더플라이·동적). 셋은 저장소·산정 방식이 모두 다름
> - **티어는 클럽 레이팅 표시 레이어**: 내부는 연속 rating 유지, 표시만 8계급 + 0~100p 밴딩(rating 하락 시 자동 강등). 경계는 `TIER_BANDS` 단일 출처
> - **탈퇴 정책**: 물리 삭제는 과거 경기/레이팅 손상 → soft delete(익명화) + `deleted_at` 마킹 + 재로그인 차단. 대진표 이름은 복원, 레이팅 값은 보존하되 랭킹에서만 제외
> - **초대 링크**: 비공개 클럽은 RLS로 비멤버 접근 차단 → 미리보기·가입을 SECURITY DEFINER RPC로만 처리(RLS 우회). 비로그인은 로그인 후 원래 토큰 링크로 복귀

---

### Week 16: 신규 사용자 온보딩 (개인 경기 중심) ✅ (2026-06-17)

> 최초 회원가입 후 로그인하면 빈 화면(클럽 목록 + 클럽 만들기)만 보여 플랫폼을 인지하기 어려운 문제 해소.
> **개인 경기 기록을 1순위**로 두고 진입점·체크리스트·환영 모달·가이드 4종을 도입(클럽은 후순위).
> DB 변경 없음 — 기존 데이터(개인 경기 수·프로필 이미지·가입 클럽)만으로 판정.

#### Phase 1 — 진입점 정비 (가장 큰 갭 해소)
- [x] 사이드바·모바일 nav "내 전적" 블록에 **개인 경기 등록**(`/me/personal-matches`) 링크 추가 — 이전엔 이 페이지로 가는 메뉴가 전무했음(접힘 rail 플라이아웃·펼침·모바일 모두 반영)
- [x] `nav-items.ts` `mainNavItems`에 **사용 가이드**(`/guide`, BookOpen) 추가

#### Phase 2 — 온보딩 체크리스트 (내 전적 상단)
- [x] `src/lib/onboarding.ts` 신설 — 단계 정의·완료 판정 순수 함수(`buildOnboardingSteps`/`countCompletedSteps`/`isOnboardingComplete`)
- [x] `src/components/onboarding/onboarding-checklist.tsx` 신설 — 진행률 바 + 3단계(첫 경기 기록★ → 프로필 완성 → 클럽 둘러보기), 완료 자동 체크
- [x] 본인 프로필 **통합 탭**(`profile/[userId]`)에 통합 — 미완료 단계가 있을 때만 노출, localStorage(`onboarding:checklist-dismissed`)로 닫기 영속
- [x] 추가 쿼리 0건 — 이미 로드한 `bundle.personalMatches`·`target.profileImage`·`myClubs`로 판정

#### Phase 3 — 첫 로그인 환영 모달
- [x] `src/components/onboarding/welcome-dialog.tsx` 신설 — `ui/dialog`+`ui/progress` 3단계 위저드(개인 분석을 1번으로 배치), 마지막에 "첫 경기 기록하기" CTA + "사용 가이드 보기" 링크
- [x] `(main)/layout.tsx`에 마운트, localStorage(`onboarding:welcome-seen`) 1회 노출 게이팅

#### Phase 4 — 정적 가이드 페이지
- [x] `app/(main)/guide/page.tsx` 신설 — 개인 경기 기록(1순위) → 전적 분석 → 클럽 참여 순 3섹션, 단계별 설명 + 딥링크 CTA

> **결정 기록 (Week 16)**
> - 로그인 진입점(`/clubs`) 변경은 middleware 영향이 커서 제외 — 환영 모달 + 사이드바 진입점으로 대체
> - 체크리스트 노출 위치: 사용자 결정에 따라 **내 전적(통합 탭)만** (클럽 홈은 미적용)
> - "프로필 완성" 판정은 `users.ntrp`(가입 필수 시드라 항상 존재) 대신 `profileImage` 존재 여부 사용
> - localStorage hydration-safe 패턴은 `sidebar-context.tsx` 방식 재사용(mount 후 1회 보정, `set-state-in-effect` eslint-disable)
> - 클럽 가입자 유도 등 클럽 온보딩은 개인 온보딩 안정화 후 별도 단계로 이관

---

## 앞으로 개선해야할 점

### 중기: 기술 부채 / 품질 개선
<!-- 완료: d9c38e9 에러 바운더리·로딩 일관화, Week 13 레이아웃 통일·린트 정리 -->
- [ ] **통계 단일 소스화** — `lib/analytics/*`(순수함수) vs `lib/queries/stats.ts`(RPC) 이중 경로 통합. 현재 두 경로가 동일 수치를 내나 유지 비용과 불일치 리스크 잠재 (가장 큰 기술 부채)
- [ ] **SQL 마이그레이션 전면 버전관리** — 0001~0015를 `supabase/migrations/`로 backfill (0016부터 로컬 `.sql`로 버전관리, 현재 0032까지 편입)
- [x] **통계 단위 테스트** — `lib/analytics/*`(form·rival·head-to-head·partner-chemistry·hour-heatmap·doubles-court·trend-stats·date-utils) + `lib/personal-matches/*`(rotation·explode·grouping) + `lib/match-games/special-match` + `lib/rating/*`(elo·tier·display·personal-rating)에 Vitest 테스트 적용 완료 (Week 14~15). _잔여: 미적용 순수함수 일부만_
- [ ] **최근 폼 정렬 개선** — 클럽 경기는 일 단위 날짜만 있어 같은 날 경기 순서가 UUID에 의존. `match_game_matches.created_at` 컬럼 추가 시 더 정확한 정렬 가능
- [ ] **데드 RPC 정리** — `get_user_match_stats` v1 DROP 마이그레이션
- [ ] **폼 검증 라이브러리** — react-hook-form + zod 도입 검토 (현재 Server Action 직접 검증)
- [ ] **테스트 도입** — Playwright e2e (로그인, 클럽 생성, 대진표 생성·결과 입력 플로우)
- [ ] **접근성(a11y)** — 색 대비, ARIA 레이블, 키보드 네비게이션 점검
- [ ] **모니터링** — Sentry 에러 수집 / Vercel Analytics
- [ ] **DB 인덱스 점검** — `match_game_matches`의 `team1 @> ARRAY[userId]` 쿼리 성능
- [ ] **거대 컴포넌트 분할** — `match-game-create-form`(650줄)·`personal-match-form`(435줄) 등 100줄 규칙 초과 컴포넌트를 하위 입력 컴포넌트로 분리 (코드 점검에서 회귀 위험으로 이관)
- [ ] **auto-generate 비용 점검** — `improveRound` 4중 루프 + `selectCourtPlayers` 조합 탐색. 현재 정상 동작하나 대규모 클럽 대비 휴리스틱 경량화 검토

### 장기: Phase 5+ 신기능 로드맵
- [ ] **알림** — 가입 신청/승인, 결과 확정 알림 (Supabase Realtime 또는 Edge Function + push)
- [ ] **경기 일정 공유** — ICS 내보내기, 캘린더 연동
- [ ] **매칭 추천** — NTRP 기반 자동 페어링 알고리즘
- [ ] **리그/시즌** — 누적 랭킹, 시즌 단위 집계 (별도 테이블 또는 view)
- [ ] **클럽 게시판** — 공지/자유 게시판 (RLS: approved 멤버만 쓰기)
- [ ] **모바일 PWA** — 오프라인 캐시, 홈 화면 추가, 푸시 알림
