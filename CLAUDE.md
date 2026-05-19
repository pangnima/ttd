# 테니스 클럽 플랫폼 — CLAUDE.md

## 프로젝트 개요
테니스 클럽 운영자와 회원 모두를 위한 클럽 관리 + 경기 통계 플랫폼.
여러 클럽이 독립적으로 운영되는 커뮤니티 중심 플랫폼.

## 기술 스택
- Framework: Next.js 16.2.6 (App Router)
- Runtime: React 19.2.4
- Language: TypeScript (strict mode)
- UI: shadcn/ui (@base-ui/react 기반) + Tailwind CSS v4
- Backend/DB: Supabase (Auth + PostgreSQL + Storage)
- 배포: Vercel (예정)

## 폴더 구조
```
src/
├── app/                          # Next.js App Router 페이지
│   ├── (auth)/                   # 비로그인 라우트 그룹
│   │   ├── login/
│   │   └── signup/
│   ├── (main)/                   # 로그인 후 라우트 그룹 (middleware 인증 가드)
│   │   ├── dashboard/
│   │   ├── clubs/
│   │   │   ├── page.tsx          # 클럽 리스트
│   │   │   ├── new/
│   │   │   └── [clubId]/
│   │   │       ├── page.tsx      # 클럽 홈
│   │   │       ├── members/
│   │   │       ├── match-games/  # 대진표 목록/생성/상세
│   │   │       └── settings/
│   │   └── profile/
│   │       ├── [userId]/         # 개인 프로필 + 통계
│   │       └── settings/
│   └── page.tsx                  # 랜딩페이지
├── components/
│   ├── ui/                       # shadcn/ui 자동 생성 컴포넌트 (직접 수정 금지)
│   ├── common/                   # 공통 컴포넌트 (Header, Sidebar 등)
│   ├── clubs/                    # 클럽 관련 컴포넌트
│   ├── match-games/              # 대진표 관련 컴포넌트
│   └── profile/                  # 프로필 관련 컴포넌트
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # 브라우저용 (Client Component 전용)
│   │   ├── server.ts             # Server Component / Server Action 전용
│   │   └── middleware.ts         # 세션 갱신 + 인증 가드 헬퍼
│   ├── actions/                  # Server Actions (entity별 파일)
│   │   ├── auth.ts
│   │   ├── clubs.ts
│   │   ├── club-members.ts
│   │   ├── match-games.ts
│   │   └── profile.ts
│   ├── queries/                  # Supabase read-only 쿼리
│   │   ├── clubs.ts
│   │   ├── match-games.ts
│   │   ├── stats.ts              # RPC 호출 (get_user_match_stats, get_user_head_to_head)
│   │   └── users.ts              # mapUserRow 공용 매퍼
│   ├── stats.ts                  # 클라이언트 유저 필터 헬퍼 (통계 본체는 RPC)
│   ├── nav-items.ts              # 사이드바 네비게이션 설정
│   └── utils.ts                  # 공통 유틸 함수 (cn)
├── middleware.ts                  # 루트 미들웨어 (세션 갱신 + 보호 라우트 가드)
└── types/
    ├── index.ts                   # 전역 도메인 타입 정의
    └── supabase.ts                # 자동 생성 DB 타입 (supabase gen types 으로 갱신)
```

## 페이지 구조 (사이트맵)
```
/ → 랜딩페이지
/login → 로그인
/signup → 회원가입
/dashboard → 메인 대시보드 (로그인 후)
/clubs → 클럽 리스트
/clubs/new → 클럽 생성
/clubs/[clubId] → 클럽 홈
/clubs/[clubId]/members → 회원 목록
/clubs/[clubId]/match-games → 대진표 목록
/clubs/[clubId]/match-games/new → 대진표 생성
/clubs/[clubId]/match-games/[matchGameId] → 대진표 상세
/clubs/[clubId]/settings → 클럽 설정 (owner 전용)
/profile/[userId] → 개인 프로필 + 통계
/profile/settings → 내 정보 수정
```

## 현재 개발 단계
- [x] Week 1–4: UI 구현 (더미데이터 기반)
- [x] Phase 2: localStorage 클라이언트 기능 구현
- [x] Week 5: Supabase 세팅 + DB 스키마 (0001~0005 마이그레이션)
- [x] Week 6: 이메일 인증 연결 + 회원가입 (0006~0008)
- [x] Week 7: 클럽 기능 Supabase 연결 (localStorage 전면 제거)
- [x] 리네이밍: tournament → match-game 전면 교체 (0009, 레거시 타입 제거)
- [x] Week 8: 대진표 기능 Supabase 연결 (0010~0012 포함)
- [x] Week 9 진행 중: 프로필/통계 구현, 배포 전 정리
  - [x] /profile/[userId] 페이지
  - [x] 통계 RPC 연결
  - [x] 게스트 선수 모델 확정
  - [ ] Vercel 배포
  - [ ] leaked password protection 활성화

## 데이터 흐름
```
Server Component (read)
  └── lib/queries/*.ts
        └── Supabase createServerClient → PostgreSQL (RLS 적용)

Server Action (mutation)
  └── lib/actions/*.ts
        ├── Supabase createServerClient → PostgreSQL (RLS + 명시적 권한 체크)
        ├── revalidatePath() → 캐시 무효화
        └── redirect() → 페이지 이동

Client Component (read-only)
  └── lib/supabase/client.ts (createBrowserClient)
        → RLS로 보호된 read-only 쿼리만 허용
```

## DB 스키마 현황
| 테이블 | 주요 RLS 정책 |
|---|---|
| `users` | 본인만 UPDATE |
| `clubs` | is_public이면 전체 SELECT, owner만 UPDATE/DELETE |
| `club_members` | approved 멤버만 SELECT, owner만 승인/거절 |
| `match_games` | approved 멤버만 SELECT/INSERT, owner만 DELETE |
| `match_game_courts/rounds/time_slots/matches` | 상위 match_game의 RLS를 따름 |

헬퍼 함수: `is_club_owner(club_id)`, `is_club_approved_member(club_id)` (SECURITY DEFINER)
RPC: `create_match_game`, `update_match_game`, `add_guest_player` (트랜잭션 단위 INSERT)
RPC: `get_user_match_stats`, `get_user_head_to_head` (통계 집계)
View: `user_match_participations` (security_invoker=on)

## 도메인 어휘 (코드·주석 일관성 기준)

| 용어 | 설명 |
|---|---|
| **MatchGame** | 하루 단위 대진표 (여러 경기 포함) |
| **Match** | 개별 경기 (1 코트 × 1 타임슬롯) |
| **is_fixed** | 결과 확정 상태 — true면 수정 잠금 + 통계 집계에 반영 |
| **winner_id** | 외래키가 아닌 사이드 식별자 리터럴 (`'team1'` \| `'team2'` \| `'draw'`). 단식에서 player1 = team1, player2 = team2 |
| **듀스코트(포)** | 포핸드 사이드 (라이트, 기본값). `team1AdPlayerId = null` |
| **애드코트(백)** | 백핸드 사이드 (레프트). `team1AdPlayerId = playerId` |
| **temp_id** | 대진표 생성 시 클라이언트가 부여하는 임시 UUID. RPC 내부에서 실제 DB ID로 교체됨 |
| **is_guest** | `public.users.is_guest = true` — Auth 계정 없는 임시 선수 (프로필 링크 비활성) |

## 코딩 규칙

### 기본 원칙
- 모든 파일은 TypeScript 사용. `any` 타입 절대 금지
- 컴포넌트는 반드시 named export 사용 (default export 금지)
- 파일명은 kebab-case (예: `club-card.tsx`)
- 컴포넌트명은 PascalCase (예: `ClubCard`)
- 함수명은 camelCase (예: `getClubById`)

### 컴포넌트 작성 규칙
- shadcn/ui 컴포넌트를 최대한 활용할 것
- 새 컴포넌트 만들기 전에 shadcn/ui에 있는지 먼저 확인
- 컴포넌트는 100줄 이내로 유지. 길어지면 분리
- props는 반드시 타입 정의

### 예시
```tsx
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
```

### Supabase 사용 규칙
- **읽기**: Server Component에서 `lib/supabase/server.ts`의 `createClient` 사용
- **쓰기**: `lib/actions/<entity>.ts` Server Action을 통해서만 (직접 client mutation 금지)
- **Client Component에서의 읽기**: `lib/supabase/client.ts`의 `createClient` — read-only + RLS 보호 데이터에만 한정
- **권한 판단**: 반드시 `club_members.role = 'owner'` 기준 (`clubs.owner_id` 직접 비교 금지)
- **환경변수**: `.env.local`에서만 관리. 코드 하드코딩 금지

## 타입 정의 요약 (src/types/index.ts)

```ts
// 신규 체계 (Week 8 이후 확정)

export type MatchResult = {
  sets: Array<{ team1: number; team2: number }>
  winnerId: 'team1' | 'team2' | 'draw'  // 사이드 식별자, 외래키 아님
}

export type Match = {
  id: string
  matchGameId: string
  matchType: MatchType
  // 단식 전용 (복식과 상호 배제)
  player1Id?: string
  player2Id?: string
  // 복식 전용 (단식과 상호 배제)
  team1?: string[]
  team2?: string[]
  // 복식 코트 배치 (null = 듀스코트 기본, undefined = 단식)
  team1AdPlayerId?: string
  team2AdPlayerId?: string
  status: 'scheduled' | 'finished'
  result?: MatchResult
}

export type MatchGame = {
  id: string
  clubId: string
  name: string
  date: string         // "2025-04-12"
  courts: Court[]
  rounds: Round[]
  matches: Match[]
  isFixed: boolean     // true = 결과 확정, 수정 잠금
  createdAt: string
}
```

## 자주 쓰는 커맨드
```bash
npm run dev          # 개발 서버 실행
npm run build        # 빌드 (배포 전 반드시 확인)
npm run lint         # 린트 검사
npx tsc --noEmit     # 타입 에러 확인
```

## 관리자 계정
admin@admin.com / 123123

## 절대 하지 말 것
- `any` 타입 사용 금지
- `components/ui/` 폴더 내 파일 직접 수정 금지 (shadcn 자동생성)
- 환경변수를 코드에 하드코딩 금지
- `console.log`를 커밋에 포함 금지

## 작업 완료 후 체크리스트
- [ ] TypeScript 에러 없음 (`npx tsc --noEmit`)
- [ ] 린트 통과 (`npm run lint`)
- [ ] 빌드 성공 (`npm run build`)
- [ ] git commit (conventional commits 형식)
