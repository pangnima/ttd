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

#### Week 8: 대진표 기능 Supabase 연결
- [ ] `lib/actions/match-games.ts` 신설 (MatchGame + matches 트랜잭션 저장, RPC 권장)
- [ ] 대진표 CRUD → Supabase `match_game_matches` 테이블 연동
- [ ] `match-game-store.ts` 제거 (localStorage → Supabase 교체)
- [ ] `guest-player-store.ts` 제거 → `public.users` (is_guest=true) 연동
- [ ] `dummy/users.ts` 제거 — Supabase 쿼리로 교체
- [ ] `members-content.tsx`, `club-members-preview.tsx` stats 연동 수정
- [ ] `dashboard/page.tsx` 통계 실제 데이터 연결 (현재 빈 배열 `[]` 하드코딩)
- [ ] 실시간 경기 결과 반영 (`revalidatePath` 또는 Supabase Realtime 구독)

### Phase 4: 통계 + 배포 (Week 9)

#### Week 9: 통계 연결 + 배포
- [ ] `/profile/[userId]` 페이지 구현 (현재 미구현)
- [ ] 플레이어 통계 → Supabase 쿼리 기반으로 교체 (`stats.ts` 리팩토링)
  - 클라이언트 `stats.ts` vs PostgreSQL view/RPC — 성능 측정 후 선택
- [ ] 게스트 선수 최종 모델 확정 (`users.is_guest` 컬럼 방식 검증)
- [ ] `auth_leaked_password_protection` 활성화 (Supabase Dashboard → Auth → Security)
- [ ] Vercel 배포 설정 + 환경변수 등록
- [ ] 빌드 최적화 확인 (`npm run build`)
- [ ] 도메인 설정 (선택)
