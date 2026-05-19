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

---

## 앞으로 개선해야할 점

### 단기: 배포 마무리 (Week 9 잔여)
- [ ] Vercel 배포 + 환경변수 등록 (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
- [ ] Supabase Dashboard → Auth → Security → `auth_leaked_password_protection` 활성화
- [ ] Supabase URL 화이트리스트 (Site URL, Redirect URLs)
- [ ] 도메인 설정 (선택)
- [ ] 프로덕션 빌드 후 핵심 플로우 회귀 점검 (로그인 → 대시보드 → 클럽 → 대진표 → 결과 입력)

<!-- ### 중기: 기술 부채 / 품질 개선
- [ ] **에러 바운더리** — App Router 각 라우트 그룹에 `error.tsx` 추가
- [ ] **로딩 상태 일관화** — `loading.tsx` + Suspense 패턴 (현재 일부 페이지 누락)
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
- [ ] **모바일 PWA** — 오프라인 캐시, 홈 화면 추가, 푸시 알림 -->
