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

### Phase 3: Supabase 연동 (Week 5~8)

#### Week 5: Supabase 세팅 + DB 스키마
- [ ] Supabase 프로젝트 생성 + 환경변수 설정 (`.env.local`)
- [ ] `lib/supabase.ts` 클라이언트 생성 (server / client 분리)
- [ ] DB 스키마 설계 및 마이그레이션 파일 작성
  - `users` 테이블
  - `clubs` 테이블
  - `club_members` 테이블
  - `tournaments` 테이블 + 하위 정규화 테이블 설계
    - `tournament_courts`, `tournament_rounds`, `tournament_time_slots` (현재 Tournament 안에 중첩 저장 중)
    - `games` 테이블 + `game_players` 조인 테이블 (`team1/team2 string[]` 처리)
    - `game_results` 테이블 또는 `games` JSONB 컬럼 방식 결정
  - `guest_players` 별도 테이블 설계 (현재 `User` 타입 공유 중, `email`/`phone` 빈 문자열 문제)
- [ ] `Club.memberCount` 필드 처리 방식 결정 (DB trigger vs COUNT 집계 쿼리)
  - 현재 `club-store`와 `club-member-store` 간 동기화 로직 없음
- [ ] RLS(Row Level Security) 정책 기본 설정

#### Week 6: 인증 연결
- [ ] Supabase Auth 연결 (이메일 + 비밀번호)
- [ ] 로그인 / 회원가입 페이지 → Server Action으로 교체
- [ ] `middleware.ts` 세션 처리 (보호된 라우트 리다이렉트)
- [ ] 인증된 사용자 정보를 Server Component에서 조회
- [ ] `lib/store/auth-store.ts` → Supabase Auth로 교체
  - 사용처 13곳 일괄 교체 (`header.tsx`, `sidebar.tsx`, `mobile-nav.tsx` 외 10개 컴포넌트)
- [ ] `lib/store/user-store.ts` → Supabase `profiles` 테이블 upsert로 교체
  - 현재 `Partial<User>` 반환 → 타입 정리 필요

#### Week 7: 클럽 기능 Supabase 연결
- [ ] 클럽 CRUD → Supabase DB로 교체 (`club-store.ts` 제거)
- [ ] 클럽 멤버십 CRUD → Supabase DB로 교체 (`club-member-store.ts` 제거)
- [ ] 멤버 승인 / 거절 Server Action 구현
- [ ] `Club.memberCount` 필드 제거 → DB COUNT 집계로 교체
- [ ] 더미 클럽 / 멤버 데이터 → Supabase DB 시드로 전환
- [ ] `guest-player-store.ts` → `guest_players` 테이블 연동 또는 정리
  - 현재 ID 생성 방식 `Date.now().toString(36)` → UUID로 통일

#### Week 8: 대진표 기능 Supabase 연결
- [ ] 대진표 CRUD → Supabase DB로 교체 (`tournament-store.ts` 제거)
  - `tournament-store.ts` 전체 함수 async 전환 (5개 컴포넌트에서 사용 중)
  - `updateGameInTournament()` 패턴 교체
    → 현재: tournament 전체 읽기 → game 찾기 → 전체 저장
    → Supabase: `games` 테이블 직접 업데이트
- [ ] Game 결과 입력 → DB 업데이트 Server Action
- [ ] `match-store.ts` (레거시) 제거
- [ ] `Match` / `MatchResult` 레거시 타입 제거
- [ ] `stats.ts` `Match` 타입 → `Game` 타입으로 마이그레이션
  - `sets[].player1/player2` → `sets[].team1/team2`, `winnerId` 구조 변경
  - `club-members-preview.tsx`, `members-content.tsx` stats 연동 수정
  - `dashboard/page.tsx` 통계 실제 데이터 연결 (현재 빈 배열 `[]` 하드코딩 중)
- [ ] 실시간 경기 결과 반영 (Realtime 구독 또는 revalidatePath)

### Phase 4: 통계 + 배포 (Week 9)

#### Week 9: 통계 연결 + 배포
- [ ] 플레이어 통계 → Supabase 쿼리 기반으로 교체 (`stats.ts` 리팩토링)
- [ ] `/profile/[userId]` 페이지 구현 (현재 미구현)
- [ ] Vercel 배포 설정 + 환경변수 등록
- [ ] 빌드 최적화 확인 (`npm run build`)
- [ ] 도메인 설정 (선택)
