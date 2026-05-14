# 테니스 클럽 플랫폼 — CLAUDE.md

## 프로젝트 개요
테니스 클럽 운영자와 회원 모두를 위한 클럽 관리 + 경기 통계 플랫폼.
여러 클럽이 독립적으로 운영되는 커뮤니티 중심 플랫폼.

## 기술 스택
- Framework: Next.js 16.2.6 (App Router)
- Runtime: React 19.2.4
- Language: TypeScript (strict mode)
- UI: shadcn/ui + Tailwind CSS
- Backend/DB: Supabase (Auth + PostgreSQL + Storage) ← **미설치** — Week 5에서 추가 예정
- 배포: Vercel

## 폴더 구조
src/
├── app/                        # Next.js App Router 페이지
│   ├── (auth)/                 # 인증 관련 라우트 그룹
│   │   ├── login/
│   │   └── signup/
│   ├── (main)/                 # 로그인 후 라우트 그룹
│   │   ├── dashboard/
│   │   ├── clubs/
│   │   │   ├── page.tsx        # 클럽 리스트
│   │   │   ├── new/
│   │   │   └── [clubId]/
│   │   │       ├── page.tsx    # 클럽 홈
│   │   │       ├── members/
│   │   │       ├── tournaments/
│   │   │       └── settings/
│   │   └── profile/
│   │       ├── [userId]/
│   │       └── settings/
│   └── page.tsx                # 랜딩페이지
├── components/
│   ├── ui/                     # shadcn/ui 자동 생성 컴포넌트 (수정 금지)
│   ├── common/                 # 공통 컴포넌트 (Header, Sidebar 등)
│   ├── clubs/                  # 클럽 관련 컴포넌트
│   ├── tournaments/            # 대진표 관련 컴포넌트
│   └── profile/                # 프로필 관련 컴포넌트
├── lib/
│   ├── supabase.ts             # Supabase 클라이언트 (미존재 — Week 5에서 생성 예정)
│   ├── actions/                # Server Actions (비어있음 — Week 6 이후 구현)
│   ├── dummy/                  # 더미데이터 (기본 seed 데이터)
│   │   ├── clubs.ts
│   │   ├── club-members.ts
│   │   ├── tournaments.ts
│   │   └── users.ts
│   ├── store/                  # localStorage CRUD (Phase 2, Week 7~8에서 Supabase로 교체)
│   │   ├── auth-store.ts
│   │   ├── club-store.ts
│   │   ├── club-member-store.ts
│   │   ├── tournament-store.ts
│   │   ├── match-store.ts      # 레거시 — Week 8에서 제거 예정
│   │   ├── guest-player-store.ts
│   │   └── user-store.ts
│   ├── stats.ts                # 경기 통계 계산 (⚠️ 레거시 Match 타입 사용 중 — Game 타입 마이그레이션 필요)
│   ├── nav-items.ts            # 사이드바 네비게이션 설정
│   └── utils.ts                # 공통 유틸 함수 (cn)
└── types/
    └── index.ts                # 전역 타입 정의

## 페이지 구조 (사이트맵)
/ → 랜딩페이지
/login → 로그인
/signup → 회원가입 (스텁만 존재 — Week 6 Supabase 인증 연결 후 구현)
/dashboard → 메인 대시보드 (로그인 후)
/clubs → 클럽 리스트
/clubs/new → 클럽 생성
/clubs/[clubId] → 클럽 홈
/clubs/[clubId]/members → 회원 목록
/clubs/[clubId]/tournaments → 대진표 목록
/clubs/[clubId]/tournaments/new → 대진표 생성
/clubs/[clubId]/tournaments/[tournamentId] → 대진표 상세
/clubs/[clubId]/settings → 클럽 설정 (운영자 전용)
/profile/[userId] → 개인 프로필 + 통계 (❌ 페이지 파일 없음 — Week 9에서 구현)
/profile/settings → 내 정보 수정

## 현재 개발 단계
- [x] Week 1: 프로젝트 세팅 + 기본 레이아웃
- [x] Week 2: 더미데이터로 클럽 UI
- [x] Week 3: 더미데이터로 대진표 UI
- [x] Week 4: 더미데이터로 프로필 + 통계 UI
- [x] Phase 2: 클라이언트 기능 구현 (서버 없이 동작)
  - [x] Phase 2.1: 대진표 생성 + 결과 입력 (localStorage)
  - [x] Phase 2.2: 경기 결과 입력 기능
  - [x] Phase 2.3: 클럽 상세 멤버 정보 강화
  - [x] Phase 2.4: 클럽 생성 기능 + 한글 기본값
- [x] Week 5: Supabase 세팅 + DB 스키마
- [x] Week 6: 인증 연결
- [x] Week 7: 클럽 기능 Supabase 연결
- [ ] Week 8: 대진표 기능 Supabase 연결
- [ ] Week 9: 통계 연결 + 배포

## 현재 작업 중인 주차
Week 7 완료 — Week 8: 대진표 기능 Supabase 연결 예정

## Supabase 마이그레이션 로드맵

### 아키텍처 전환 방향
- **현재**: localStorage 7개 키 (`tc_*`) + 더미 데이터 클라이언트 머지 (`'use client'` + useEffect)
- **목표**: Supabase Auth (이메일+비밀번호) + PostgreSQL + RLS, Server Component 우선

### DB 스키마 매핑 (localStorage → Supabase)

| localStorage 키 | Supabase 테이블 | 비고 |
|---|---|---|
| `tc_current_user_id` | `auth.users` (Supabase 기본) | `supabase.auth.getUser()` 사용 |
| `tc_profile` | `public.users` | id = auth.uid() 1:1 |
| `tc_clubs` | `public.clubs` | RLS 적용 |
| `tc_club_members` | `public.club_members` | PK: (user_id, club_id) |
| `tc_tournaments` | `public.tournaments` | games / rounds / courts 정규화 |
| `tc_tournaments[].games` | `public.tournament_games` | 별도 테이블 (FK: tournament_id) |
| `tc_guest_players` | `public.users` (is_guest=true) 또는 별도 | Week 9에 최종 결정 |
| `tc_matches` | ❌ 제거 | `tournament_games`로 통합 |

### 핵심 원칙
1. **Owner 단일 진실 출처**: `club_members.role = 'owner'`로 통일. `clubs.owner_id` 직접 비교 코드 제거
2. **모든 mutation은 Server Action 통과** + RLS double-defense
3. **Read 쿼리는 Server Component에서** `createServerClient` 사용
4. **클라이언트 SDK 직접 호출은 read-only**만, 항상 RLS로 보호

### Week 5: Supabase 세팅 + DB 스키마
- `npm install @supabase/supabase-js @supabase/ssr`
- `.env.local` 생성 (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- `lib/supabase/` 구조: `client.ts` (브라우저), `server.ts` (RSC/Action), `middleware.ts` (세션 갱신)
- 루트 `middleware.ts` 신설 (`(main)` 그룹 인증 가드)
- DB 마이그레이션 SQL: `users`, `clubs`, `club_members`, `tournaments`, `tournament_rounds`, `tournament_courts`, `tournament_time_slots`, `tournament_games`
- 각 테이블 RLS 정책 작성 (Supabase MCP `apply_migration` 활용)

### Week 6: 인증 연결 (이메일 + 비밀번호)
- `/login` Supabase Auth UI 교체
- `/signup` 실제 가입 + `auth.users` insert 트리거로 `public.users` row 자동 생성
- `auth-store.ts` 제거, `getCurrentUserId()` 호출 15곳 → `supabase.auth.getUser()` 전환
- Header 로그아웃 → `supabase.auth.signOut()`

### Week 7: 클럽 기능 Supabase 연결
- `lib/actions/clubs.ts`, `lib/actions/club-members.ts`, `lib/actions/profile.ts` 신설
- 더미 데이터 머지 로직 제거 (`[...dummy, ...stored]` 패턴 전부)
- **`/clubs/[clubId]/settings` 페이지에 owner 권한 가드 추가** (현재 누락, 보안 결함)
- 제거 대상: `auth-store.ts`, `user-store.ts`, `club-store.ts`, `club-member-store.ts`, `dummy/clubs.ts`, `dummy/club-members.ts`
- `/dashboard`, `/clubs`, `/clubs/[clubId]`, `/clubs/[clubId]/members` → Server Component 전환

### Week 8: 대진표 기능 + 레거시 정리
- `lib/actions/tournaments.ts`: Tournament + games 트랜잭션 저장 (RPC 권장)
- 제거 대상: `tournament-store.ts`, `guest-player-store.ts`, `dummy/tournaments.ts`
- **Match 타입 마이그레이션**:
  - `stats.ts`를 `Game` 기반으로 재작성 (`Match[]` → `Game[]` 시그니처)
  - `Match`, `MatchResult` 타입 제거
  - `match-store.ts` 제거 (write 호출이 0건인 dead pipeline)
  - `members-content.tsx`, `club-members-preview.tsx`의 `getStoredMatches()` → `tournament_games` 쿼리
- **Dead code 정리**: `tournament-view.tsx` 제거 (import 0건)

### Week 9: 통계 + 프로필 + 배포
- `/profile/[userId]` 페이지 신설 (Server Component)
- 통계 계산: 클라이언트 `stats.ts` vs PostgreSQL view/RPC — 성능 측정 후 선택
- 게스트 선수 최종 모델 확정 (`users.is_guest` 또는 `guest_players` 별도 테이블)
- Vercel 배포 (환경변수 설정, Supabase URL 화이트리스트)

### RLS 정책 예시
```sql
-- clubs: public이면 모두 조회, approved 멤버는 비공개 클럽도 조회
CREATE POLICY clubs_select ON clubs FOR SELECT USING (
  is_public OR EXISTS (
    SELECT 1 FROM club_members
    WHERE club_id = clubs.id AND user_id = auth.uid() AND status = 'approved'
  )
);
-- club_members INSERT (가입 신청): user_id = auth.uid() AND status = 'pending'
-- club_members UPDATE (승인/거절): club owner만 (club_members role = 'owner' 조인)
-- tournament_games SELECT/INSERT/UPDATE: approved 멤버만 / DELETE: owner만
```

## 코딩 규칙

### 기본 원칙
- 모든 파일은 TypeScript 사용. any 타입 절대 금지
- 컴포넌트는 반드시 named export 사용 (default export 금지)
- 파일명은 kebab-case (예: club-card.tsx)
- 컴포넌트명은 PascalCase (예: ClubCard)
- 함수명은 camelCase (예: getClubById)

### 컴포넌트 작성 규칙
- shadcn/ui 컴포넌트를 최대한 활용할 것
- 새 컴포넌트 만들기 전에 shadcn/ui에 있는지 먼저 확인
- 컴포넌트는 100줄 이내로 유지. 길어지면 분리
- props는 반드시 타입 정의

### 예시
\`\`\`tsx
// ✅ 올바른 예시
type ClubCardProps = {
  club: Club
  onClick: () => void
}

export function ClubCard({ club, onClick }: ClubCardProps) {
  return (...)
}

// ❌ 잘못된 예시
export default function ClubCard({ club, onClick }: any) {
  return (...)
}
\`\`\`

### 더미데이터 규칙
- 모든 더미데이터는 lib/dummy/ 폴더에만 위치
- 더미데이터 파일은 실제 타입과 동일한 구조로 작성
- DB 연결 시 import 경로만 바꾸면 되도록 구조 유지
- 컴포넌트 안에 하드코딩 금지

### 예시
\`\`\`ts
// lib/dummy/clubs.ts
import type { Club } from '@/types'

export const dummyClubs: Club[] = [
  {
    id: '1',
    name: '강남 테니스 클럽',
    description: '강남구 테니스 동호회',
    region: '서울 강남구',
    isPublic: true,
    memberCount: 24,
    createdAt: '2024-01-15',
  },
]
\`\`\`

### localStorage 규칙 (Phase 2)
- localStorage 접근은 `lib/store/` 폴더에서만 처리
- 키 이름에 반드시 `tc_` 접두사 사용 (예: `tc_tournaments`, `tc_matches`, `tc_clubs`)
- localStorage 데이터와 더미 데이터는 항상 병합하여 사용 (더미 데이터가 기본 seed)
- Supabase 연결 시 `lib/store/` 파일만 교체하면 되도록 인터페이스를 유지할 것
- 컴포넌트에서 직접 `localStorage.getItem()` 호출 금지

### Supabase 규칙 (Week 5 이후 적용)
**Week 5 시작 전 설치 필요:**
```bash
npm install @supabase/supabase-js @supabase/ssr
```
`.env.local` 파일 생성 후 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 추가

- Supabase 클라이언트는 `lib/supabase/client.ts` (브라우저), `lib/supabase/server.ts` (RSC/Action)에서만 import
- 데이터 fetching은 Server Component에서 `createServerClient` 사용
- 민감한 mutation은 Server Action 사용 (`lib/actions/<entity>.ts`, 파일당 한 entity)
- 클라이언트 SDK 직접 쿼리는 read-only, RLS로 보호되는 데이터에만 한정
- Owner/권한 판단은 항상 `club_members.role = 'owner'` 기준 (`Club.ownerId` 직접 비교 금지)
- 환경변수는 .env.local 에서만 관리

## 타입 정의 (types/index.ts)

\`\`\`ts
// 사용자
export type User = {
  id: string
  email: string
  name: string
  nickname: string
  role: 'admin' | 'member'
  profileImage?: string
  phone: string
  gender: 'male' | 'female'
  dominantHand: 'right' | 'left'
  ntrp: number
  tennisStartDate: string
  createdAt: string
}

// 클럽
export type Club = {
  id: string
  name: string
  description: string
  region: string
  isPublic: boolean
  memberCount: number
  ownerId: string
  createdAt: string
}

// 클럽 멤버
export type ClubMember = {
  userId: string
  clubId: string
  role: 'owner' | 'member'
  status: 'pending' | 'approved' | 'rejected'
  joinedAt: string
}

// 경기 종류
export type MatchType = 'singles' | 'men_doubles' | 'women_doubles' | 'mixed_doubles'

// 시간 슬롯
export type TimeSlot = {
  id: string
  startAt: string  // "08:05"
  endAt: string    // "08:30"
}

// 라운드
export type Round = {
  id: string
  label: string    // "1st", "2nd"
  order: number
  timeSlots: TimeSlot[]
}

// 코트
export type Court = {
  id: string
  label: string    // "1코트", "2코트"
  order: number
}

// 경기 결과
export type GameResult = {
  sets: Array<{ team1: number; team2: number }>
  winnerId: string  // 단식: player1Id or player2Id / 복식: 'team1' | 'team2'
}

// 경기
export type Game = {
  id: string
  tournamentId: string
  roundId: string
  courtId: string
  timeSlotId: string
  matchType: MatchType
  player1Id?: string   // 단식
  player2Id?: string   // 단식
  team1?: string[]     // 복식 [userId, userId]
  team2?: string[]     // 복식 [userId, userId]
  status: 'scheduled' | 'finished'
  result?: GameResult
}

// 대진표
export type Tournament = {
  id: string
  clubId: string
  name: string
  date: string         // "2025-04-12"
  courts: Court[]
  rounds: Round[]
  games: Game[]
  isFixed: boolean
  createdAt: string
}

// ── 레거시 타입 — Week 8 Supabase 연동 시 제거 예정 ──
// stats.ts / profile / dashboard 에서 사용 중

export type MatchResult = {
  matchId: string
  sets: Array<{ player1: number; player2: number }>
  winnerId: string
}

export type Match = {
  id: string
  tournamentId: string
  player1Id: string
  player2Id: string
  round: number
  status: 'scheduled' | 'finished'
  result?: MatchResult
  court?: number
  startAt?: string
  endAt?: string
  player1Team?: string[]
  player2Team?: string[]
  matchType?: MatchType
}
\`\`\`

## 자주 쓰는 커맨드
\`\`\`bash
npm run dev          # 개발 서버 실행
npm run build        # 빌드 (배포 전 반드시 확인)
npm run lint         # 린트 검사
npx tsc --noEmit     # 타입 에러 확인
\`\`\`

## 알려진 이슈 (Supabase 마이그레이션 시 해결)
- `/clubs/[clubId]/settings` 페이지에 권한 가드 없음 — URL 직접 접근 시 누구나 폼 접근 가능 → **Week 7**
- `match-store.ts`는 write 호출이 0건이라 통계가 항상 0승 0패 — `Tournament.games`와 연결 안 됨 → **Week 8** (Game 기반 재작성)
- `tournament-view.tsx`는 어디서도 import되지 않는 dead code → **Week 8** 제거

## 절대 하지 말 것
- any 타입 사용 금지
- components/ui/ 폴더 내 파일 직접 수정 금지 (shadcn 자동생성)
- 환경변수를 코드에 하드코딩 금지
- console.log 를 커밋에 포함 금지
- 더미데이터를 컴포넌트 안에 직접 작성 금지

## 작업 완료 후 체크리스트
- [ ] TypeScript 에러 없음 (npx tsc --noEmit)
- [ ] 린트 통과 (npm run lint)
- [ ] 빌드 성공 (npm run build)
- [ ] git commit (conventional commits 형식)