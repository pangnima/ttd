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

### 사전 정리: Supabase 마이그레이션 준비

> localStorage → Supabase 전환 전에 해결해야 할 구조적 문제들

- [ ] `Match`(레거시) vs `Game`(신규) 이중 구조 마이그레이션 전략 결정
  - `stats.ts`가 `Match` 타입에 의존 중 (`club-members-preview.tsx`, `members-content.tsx`에서 사용)
  - Week 8에서 `Game` 타입으로 통합 시 `stats.ts`도 함께 수정 예정
- [ ] store 함수 시그니처 현황 파악
  - 현재 모두 `void` 반환 (동기) → Supabase 교체 시 `async` + 에러 처리 필요

---

### Phase 3: Supabase 연동 (Week 6~8)

#### Week 6: 인증 연결
- [ ] `/login` 페이지 → Supabase Auth (이메일 + 비밀번호) Server Action으로 교체
- [ ] `/signup` 페이지 → 실제 가입 구현 (`supabase.auth.signUp` + `raw_user_meta_data` 전달)
  - `handle_new_user` 트리거가 `public.users` row 자동 생성
- [ ] `middleware.ts`에 `(main)` 그룹 인증 가드 추가 (미로그인 시 `/login` 리다이렉트)
- [ ] `lib/store/auth-store.ts` 제거 → `supabase.auth.getUser()` 전환
  - 사용처 15곳 일괄 교체 (`header.tsx`, `sidebar.tsx`, `mobile-nav.tsx` 외)
- [ ] `lib/store/user-store.ts` → Supabase `public.users` 조회/업데이트로 교체
- [ ] Header 로그아웃 → `supabase.auth.signOut()`

#### Week 7: 클럽 기능 Supabase 연결
- [ ] `lib/actions/clubs.ts` 신설 (createClub, updateClub, deleteClub Server Action)
- [ ] `lib/actions/club-members.ts` 신설 (joinClub, approveRequest, rejectRequest)
- [ ] `lib/actions/profile.ts` 신설 (updateProfile)
- [ ] 더미 데이터 머지 로직 제거 (`[...dummy, ...stored]` 패턴 전부)
- [ ] **`/clubs/[clubId]/settings` 페이지 owner 권한 가드 추가** (현재 보안 결함)
- [ ] 제거 대상: `auth-store.ts`, `user-store.ts`, `club-store.ts`, `club-member-store.ts`
- [ ] 제거 대상: `dummy/clubs.ts`, `dummy/club-members.ts`
- [ ] Server Component 전환: `/dashboard`, `/clubs`, `/clubs/[clubId]`, `/clubs/[clubId]/members`
- [ ] `Club.memberCount` 필드 제거 → DB COUNT 집계로 교체
- [ ] `guest-player-store.ts` → `public.users` (is_guest=true) 연동

#### Week 8: 대진표 기능 + 레거시 정리
- [ ] `lib/actions/tournaments.ts` 신설 (Tournament + games 트랜잭션 저장, RPC 권장)
- [ ] 대진표 CRUD → Supabase `tournament_games` 테이블 연동
- [ ] 제거 대상: `tournament-store.ts`, `guest-player-store.ts`, `dummy/tournaments.ts`
- [ ] **Match 타입 마이그레이션**
  - `stats.ts` `Match[]` → `Game[]` 시그니처로 재작성
  - `Match`, `MatchResult` 레거시 타입 제거
  - `match-store.ts` 제거 (write 호출 0건 dead pipeline)
  - `members-content.tsx`, `club-members-preview.tsx` stats 연동 수정
  - `dashboard/page.tsx` 통계 실제 데이터 연결 (현재 빈 배열 `[]` 하드코딩)
- [ ] **Dead code 정리**
  - `tournament-view.tsx` 제거 (import 0건)
  - `tournament-store.ts` 미사용 함수 제거 (`updateStoredTournament`, `updateGameInTournament`)
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
