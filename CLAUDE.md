# 테니스 클럽 플랫폼 — CLAUDE.md

## 프로젝트 개요
테니스 클럽 운영자와 회원 모두를 위한 클럽 관리 + 경기 통계 플랫폼.
여러 클럽이 독립적으로 운영되는 커뮤니티 중심 플랫폼.

## 기술 스택
- Framework: Next.js 15 (App Router)
- Language: TypeScript (strict mode)
- UI: shadcn/ui + Tailwind CSS
- Backend/DB: Supabase (Auth + PostgreSQL + Storage)
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
│   ├── supabase.ts             # Supabase 클라이언트 (Week 5에서 생성 예정)
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
│   ├── stats.ts                # 경기 통계 계산 함수
│   ├── nav-items.ts            # 사이드바 네비게이션 설정
│   └── utils.ts                # 공통 유틸 함수 (cn)
└── types/
    └── index.ts                # 전역 타입 정의

## 페이지 구조 (사이트맵)
/ → 랜딩페이지
/login → 로그인
/signup → 회원가입
/dashboard → 메인 대시보드 (로그인 후)
/clubs → 클럽 리스트
/clubs/new → 클럽 생성
/clubs/[clubId] → 클럽 홈
/clubs/[clubId]/members → 회원 목록
/clubs/[clubId]/tournaments → 대진표 목록
/clubs/[clubId]/tournaments/new → 대진표 생성
/clubs/[clubId]/tournaments/[tournamentId] → 대진표 상세
/clubs/[clubId]/settings → 클럽 설정 (운영자 전용)
/profile/[userId] → 개인 프로필 + 통계 (미구현 — Week 9에서 구현 예정)
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
- [ ] Week 5: Supabase 세팅 + DB 스키마
- [ ] Week 6: 인증 연결
- [ ] Week 7: 클럽 기능 Supabase 연결
- [ ] Week 8: 대진표 기능 Supabase 연결
- [ ] Week 9: 통계 연결 + 배포

## 현재 작업 중인 주차
Week 5 — Supabase 세팅 + DB 스키마

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
- Supabase 클라이언트는 lib/supabase.ts 에서만 import
- 데이터 fetching은 Server Component에서 처리
- 민감한 작업은 Server Action 사용
- 환경변수는 .env.local 에서만 관리

## 타입 정의 (types/index.ts)

\`\`\`ts
// 사용자
type User = {
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
type Club = {
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
type ClubMember = {
  userId: string
  clubId: string
  role: 'owner' | 'member'
  status: 'pending' | 'approved' | 'rejected'
  joinedAt: string
}

// 경기 종류
type MatchType = 'singles' | 'men_doubles' | 'women_doubles' | 'mixed_doubles'

// 시간 슬롯
type TimeSlot = {
  id: string
  startAt: string  // "08:05"
  endAt: string    // "08:30"
}

// 라운드
type Round = {
  id: string
  label: string    // "1st", "2nd"
  order: number
  timeSlots: TimeSlot[]
}

// 코트
type Court = {
  id: string
  label: string    // "1코트", "2코트"
  order: number
}

// 경기 결과
type GameResult = {
  sets: Array<{ team1: number; team2: number }>
  winnerId: string  // 단식: playerId / 복식: 'team1' | 'team2'
}

// 경기
type Game = {
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
type Tournament = {
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

type MatchResult = {
  matchId: string
  sets: Array<{ player1: number; player2: number }>
  winnerId: string
}

type Match = {
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