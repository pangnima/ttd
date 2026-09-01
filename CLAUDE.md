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
│   │   ├── signup/
│   │   ├── forgot-password/      # 비밀번호 재설정 메일 요청
│   │   └── reset-password/       # 새 비밀번호 입력
│   ├── auth/confirm/route.ts     # 인증 메일/재설정 토큰 핸들러 (Route Handler)
│   ├── opengraph-image.tsx       # 전역 동적 OG 이미지 (next/og)
│   ├── tiers/                    # 클럽 레이팅 8계급 아이콘 미리보기 (noindex, 개발용)
│   ├── (main)/                   # 로그인 후 라우트 그룹 (middleware 인증 가드)
│   │   ├── clubs/
│   │   │   ├── page.tsx          # 클럽 리스트
│   │   │   ├── new/
│   │   │   ├── join/[token]/     # 초대 링크 가입 (비공개 클럽, 동적 OG 포함)
│   │   │   └── [clubId]/
│   │   │       ├── page.tsx      # 클럽 홈 (운영자이면 운영 섹션 포함)
│   │   │       ├── dashboard/    # /clubs/[clubId]로 리다이렉트
│   │   │       ├── members/
│   │   │       ├── match-games/  # 대진표 목록/생성/상세
│   │   │       └── settings/
│   │   ├── me/
│   │   │   ├── analytics/        # /profile/[userId]?mode=total 리다이렉트
│   │   │   ├── personal-matches/ # 개인 경기 기록 CRUD
│   │   │   └── match-requests/   # 경기 확인 요청 허브 (받은/보낸 탭)
│   │   ├── profile/
│   │   │   ├── [userId]/         # 개인 프로필 (본인=분석 풀버전, 타인=공개 요약)
│   │   │   └── settings/
│   │   └── guide/               # 신규 사용자 사용 가이드 (정적, 개인 경기 1순위)
│   └── page.tsx                  # 랜딩페이지
├── components/
│   ├── ui/                       # shadcn/ui 자동 생성 컴포넌트 (직접 수정 금지)
│   ├── common/                   # 공통 (Header, Sidebar, sidebar-context, BrandLogo, ProfileLink, TierIcon/TierEmblem 등)
│   ├── clubs/                    # 클럽 (ClubLogoField, LeaveClubButton, ClubInviteCard, InviteJoinButton 등)
│   ├── club-dashboard/           # 클럽 운영 전용 카드 (PendingMembers, Ranking, ClubAceCard 등)
│   ├── match-games/              # 대진표 (매트릭스/리스트 뷰, PlayerName, SpecialMatchBadge 등)
│   ├── personal-matches/         # 개인 경기 입력·목록 (PersonalMatchCard, rotation/ 입력, use-user-search 등)
│   ├── match-requests/           # 경기 확인 요청 허브 (받은/보낸 카드, 상태 뱃지)
│   ├── profile/                  # 프로필 헤더·통계 조합 (DeleteAccountButton 등)
│   ├── onboarding/               # 신규 사용자 온보딩 (OnboardingChecklist, WelcomeDialog)
│   ├── stats/                    # 개인 통계 시각화 컴포넌트 (구 dashboard/ + analytics/ 통합)
│   ├── auth/                     # 인증 폼 (login/signup/forgot/reset, AvatarUploadField)
│   ├── landing/                  # 랜딩페이지 섹션 컴포넌트 (LandingNav 등)
│   └── theme/                    # 테마 관련
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # 브라우저용 (Client Component 전용)
│   │   ├── server.ts             # Server Component / Server Action 전용
│   │   └── middleware.ts         # 세션 갱신 + 인증 가드 + 초대 링크 복귀 헬퍼
│   ├── actions/                  # Server Actions (entity별 파일)
│   │   ├── auth.ts               # 로그인/가입/로그아웃/비밀번호 재설정/계정 탈퇴
│   │   ├── clubs.ts
│   │   ├── club-members.ts       # 가입 승인·거절·탈퇴·초대 링크 발급/가입
│   │   ├── match-games.ts
│   │   ├── match-game-courts.ts  # 복식 코트 사이드 저장
│   │   ├── personal-matches.ts
│   │   ├── match-requests.ts     # 확인 요청 생성/취소/거절/수락(RPC)
│   │   ├── profile.ts
│   │   ├── ratings.ts            # 클럽 레이팅 재계산 트리거
│   │   └── ai-coaching.ts
│   ├── queries/                  # Supabase read-only 쿼리
│   │   ├── _shared.ts            # buildUserMap 등 공용 헬퍼
│   │   ├── clubs.ts              # 클럽 조회 + 초대 미리보기(get_invite_preview)
│   │   ├── match-games.ts
│   │   ├── personal-matches.ts
│   │   ├── match-requests.ts     # 받은/보낸 요청·pending 뱃지 카운트
│   │   ├── player-profile.ts     # fetchPlayerStatsBundle (타인 프로필용)
│   │   ├── analytics.ts          # fetchAnalyticsBundle (본인 분석용)
│   │   ├── club-dashboard.ts     # 클럽 운영 쿼리 (에이스·활동/승률 랭킹 등)
│   │   ├── ratings.ts            # 클럽 레이팅 랭킹·이력·재계산 입력 쿼리
│   │   ├── stats.ts              # RPC 호출 (get_user_match_stats, get_user_head_to_head)
│   │   └── users.ts              # mapUserRow 공용 매퍼 (is_guest·personal_ntrp·deleted_at 포함)
│   ├── analytics/                # 순수 함수 집계 모듈 (DB 접근 없음, vitest 테스트 다수)
│   ├── dashboard/                # UI 토큰·스타일·outcome/surface/표시 헬퍼
│   │   ├── tokens.ts             # CARD_BASE, SECTION_LABEL, EMPTY_BLOCK, calcWinRate 등
│   │   ├── outcome.ts            # OUTCOME_STYLE/LABEL·formatRecord (승/패/무 통일)
│   │   ├── surface.ts            # SURFACE_LABELS (코트 표면 라벨 통일)
│   │   ├── match-type-style.ts   # MATCH_TYPE_LABELS, getMatchTypeStyle
│   │   └── match-display.ts      # 매치 표시 헬퍼
│   ├── match-games/              # 대진표 폼 매핑·자동 대진 생성·특별매치·탈퇴 회원 복원
│   │   ├── form-mapping.ts       # 폼 ↔ DB 매핑
│   │   ├── auto-generate.ts      # 자동 대진 생성 휴리스틱
│   │   ├── special-match.ts      # 명승부·라이벌 판정
│   │   ├── former-members.ts     # augmentWithFormerMembers (탈퇴 선수 이름 복원)
│   │   ├── match-view-helpers.ts # 매트릭스/리스트 뷰 헬퍼
│   │   └── attendance-stats.ts
│   ├── personal-matches/         # 개인 경기 매핑·세트 분해·승자 판정·로테이션 복식
│   │   ├── map.ts / explode.ts / grouping.ts / winner.ts
│   │   ├── rotation.ts           # 아메리칸(로테이션) 복식 게임 분해
│   │   └── validators.ts
│   ├── rating/                   # 레이팅 순수 엔진 (docs/rating-system.md)
│   │   ├── elo.ts / constants.ts # 클럽 ELO 엔진 (replayClubRatings)
│   │   ├── personal-rating.ts    # 개인 경기 기반 동적 개인 NTRP (온더플라이)
│   │   ├── tier.ts               # 8계급 밴딩 + 0~100 포인트 환산
│   │   └── display.ts            # formatClubRating·isProvisional 등 표시 헬퍼
│   ├── auth/                     # auth-error-messages.ts (Supabase 에러 한글 매핑)
│   ├── format/                   # phone.ts (연락처 하이픈 등)
│   ├── og/                       # brand.ts (OG 이미지 브랜딩 + 폰트)
│   ├── club-password.ts          # 클럽 삭제 비밀번호 scrypt 해시·검증
│   ├── default-images.ts         # 기본 아바타·클럽 로고 셔플
│   ├── avatar-color.ts           # 아바타 색상 생성
│   ├── format.ts                 # 날짜 등 포맷 헬퍼 (date-utils와 역할 구분)
│   ├── stats.ts                  # PlayerStats, HeadToHead, CourtStat 등 타입 전용
│   ├── onboarding.ts             # 신규 사용자 온보딩 단계 정의·완료 판정 (순수 함수)
│   ├── nav-items.ts              # 사이드바 네비게이션 (topNavItems: 사용 가이드 / clubNavItems: 클럽 찾기)
│   └── utils.ts                  # cn() 헬퍼
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
/forgot-password → 비밀번호 재설정 메일 요청
/reset-password → 새 비밀번호 입력 (메일 링크 진입)
/auth/confirm → 인증/재설정 토큰 핸들러 (Route Handler, UI 없음)
/clubs → 클럽 리스트 (로그인 후 기본 진입점)
/clubs/new → 클럽 생성
/clubs/join/[token] → 초대 링크 가입 (비공개 클럽, 비로그인 미리보기 + 로그인 후 복귀)
/clubs/[clubId] → 클럽 홈 (owner/officer이면 하단에 운영 섹션 인라인)
/clubs/[clubId]/dashboard → /clubs/[clubId] 리다이렉트
/clubs/[clubId]/members → 회원 목록
/clubs/[clubId]/match-games → 대진표 목록
/clubs/[clubId]/match-games/new → 대진표 생성
/clubs/[clubId]/match-games/[matchGameId] → 대진표 상세
/clubs/[clubId]/settings → 클럽 설정 (owner 전용)
/profile/[userId] → 개인 통계 허브
  ├── 본인: scope 탭(전체/개인) + 심층 분석 풀버전 + AI 코칭
  └── 타인: 공개 통계 요약 (프라이버시 설정 반영)
/profile/settings → 내 정보 수정
/me/analytics → /profile/[내id]?mode=total 리다이렉트
/me/personal-matches → 개인 경기 기록 목록
/me/personal-matches/new → 개인 경기 추가 (회원 상대 단식은 확인 요청 플로우로 전환)
/me/personal-matches/[id]/edit → 개인 경기 수정 (상호 확인 경기는 진입 차단)
/me/match-requests → 경기 확인 요청 허브 (받은/보낸 탭, 수락·거절·취소)
/guide → 신규 사용자 사용 가이드 (정적, 개인 경기 기록 1순위)
/tiers → 클럽 레이팅 8계급 아이콘 미리보기 (noindex, 개발용)
```

## 현재 개발 단계
- [x] Week 1–4: UI 구현 (더미데이터 기반)
- [x] Phase 2: localStorage 클라이언트 기능 구현
- [x] Week 5: Supabase 세팅 + DB 스키마 (0001~0005 마이그레이션)
- [x] Week 6: 이메일 인증 연결 + 회원가입 (0006~0008)
- [x] Week 7: 클럽 기능 Supabase 연결 (localStorage 전면 제거)
- [x] 리네이밍: tournament → match-game 전면 교체 (0009, 레거시 타입 제거)
- [x] Week 8: 대진표 기능 Supabase 연결 (0010~0012 포함)
- [x] Week 9: 프로필/통계 구현 + 배포 전 정리
  - [x] /profile/[userId] 페이지
  - [x] 통계 RPC 연결
  - [x] 게스트 선수 모델 확정
- [x] Week 10: 개인 분석 페이지 (0013~0015 마이그레이션, personal_matches, AI 코칭)
- [x] Week 11: 잔여 카드 5종 + 정리 + 고위험 리팩토링
- [x] Week 12: 클럽 대시보드 신설 + 개인 화면 역할 분리
- [x] Week 13: 레이아웃 full-width 통일 (PageContainer) + 통계 검증 + SQL 버전관리 시작 (0016)
- [x] Week 14: 클럽 동적 레이팅 시스템 (NTRP ELO, 0018 마이그레이션)
  - [x] 순수 엔진 `lib/rating/` + vitest (명세: docs/rating-system.md)
  - [x] club_player_ratings/club_rating_history + 전체 재계산 파이프라인
  - [x] 레이팅 노출 (랭킹·멤버 병기·경기 변동폭·프로필 추세, 비공개 차단)
- [x] Week 15: 개인 레이팅·티어 + 대진표 개편 + 배포 준비 기능군 (0019~0032 마이그레이션)
  - [x] 개인 경기 기반 동적 개인 NTRP + 8계급 티어 (`lib/rating/personal-rating.ts`·`tier.ts`)
  - [x] 대진표 상세 매트릭스 개편 (티어·승패색·특별매치)
  - [x] 사이드바 rail + BASELINE 로고, 라이트 모드 WCAG AA 시인성
  - [x] 비밀번호 재설정·탈퇴(soft delete)·클럽 초대 링크·OG 메타데이터
- [x] Week 16: 신규 사용자 온보딩 (개인 경기 중심, DB 변경 없음)
  - [x] 진입점 정비 — 사이드바·모바일 nav에 개인 경기 등록 링크, 사용 가이드 메뉴
  - [x] 온보딩 체크리스트 (`lib/onboarding.ts`·`components/onboarding/`, 내 전적 통합 탭, localStorage 닫기)
  - [x] 첫 로그인 환영 모달 + 정적 가이드 페이지 `/guide`
- [ ] 배포
  - [ ] Vercel 배포 + 환경변수 등록 (`NEXT_PUBLIC_SUPABASE_URL`, `..._ANON_KEY`, `ANTHROPIC_API_KEY`)
  - [ ] leaked password protection 활성화 + URL 화이트리스트 (`/auth/confirm` 포함)
  - [ ] 비밀번호 재설정 메일 템플릿 설정 (코드 완료, 대시보드/Management API 설정만 잔여)
  - [ ] metadataBase 환경변수화 (`src/app/layout.tsx`)

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
| `users` | 본인만 UPDATE (`is_guest`·`personal_ntrp`·`deleted_at` 컬럼 포함) |
| `clubs` | is_public이면 전체 SELECT, owner만 UPDATE/DELETE (`court_schedule`·삭제 비밀번호 해시 포함) |
| `club_members` | approved 멤버만 SELECT, owner/officer만 승인/거절 |
| `match_games` | approved 멤버만 SELECT/INSERT, owner만 DELETE |
| `match_game_courts/rounds/time_slots/matches` | 상위 match_game의 RLS를 따름 (courts.surface 포함) |
| `personal_matches` | 본인(user_id)만 CRUD. 상호 확인 경기(`source_request_id` 보유)는 RESTRICTIVE 정책으로 수정/삭제 잠금 |
| `match_requests` | 당사자 둘만 SELECT, requester만 INSERT/취소, opponent만 거절. 수락은 RPC로만 |
| `ai_coaching_cache` | 본인 통계 묶음 해시 기반 캐시 (24h) |
| `club_player_ratings` / `club_rating_history` | approved 멤버만 SELECT, 쓰기는 RPC로만 |
| `club_invites` | owner만 관리, 미리보기·가입은 SECURITY DEFINER RPC로만 |

헬퍼 함수: `is_club_owner(club_id)`, `is_club_approved_member(club_id)` (SECURITY DEFINER)
RPC: `create_match_game`, `update_match_game`, `add_guest_player` (트랜잭션 단위 INSERT)
RPC: `get_user_match_stats`, `get_user_head_to_head` (통계 집계)
RPC: `get_club_activity_ranking`, `get_club_win_rate_ranking`, `get_club_member_counts` (클럽 대시보드 집계)
RPC: `apply_club_rating_snapshot` (레이팅 영속화), `get_invite_preview`·`join_club_via_invite` (초대 링크)
RPC: `accept_match_request` (상호 확인 대진 수락 — 양측 관점 personal_matches 2행 생성 + 상태 전이)
View: `user_match_participations` (security_invoker=on)
마이그레이션: 0001~0033 (0016부터 로컬 `supabase/migrations/*.sql`로 버전관리, 0001~0015는 MCP `apply_migration` 이력)

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
| **통합/자가선언 NTRP** | `users.ntrp` — 가입 시 직접 선언하는 정적 값 (수동) |
| **클럽 NTRP** | `club_player_ratings` — 클럽별 독립 ELO, 확정 경기로 동적 변동 (2.5 시작) |
| **개인 NTRP** | `users.personal_ntrp` — 개인 경기(`personal_matches`) 승패 기반 온더플라이 동적 레이팅 캐시 |
| **티어(Tier)** | 클럽 레이팅(연속 rating)을 8계급(아이언~챌린저)으로 밴딩 + 계급당 0~100p. 표시 전용, `TIER_BANDS` 단일 출처 |
| **명승부 / 라이벌** | 대진표 특별매치 판정 — 접전(한 게임차 포함) / cross-pair 박빙 (`lib/match-games/special-match.ts`) |
| **탈퇴 회원** | `users.deleted_at` soft delete(익명화). 대진표 이름은 복원·'탈퇴' 배지, 레이팅 값 보존하되 랭킹 제외 |
| **초대 토큰** | `club_invites.token` — 비공개 클럽 가입용. SECURITY DEFINER RPC로만 미리보기·가입 |
| **로테이션 복식** | 4명 이상 파트너 교대(아메리칸) 복식을 게임별 개인 경기 레코드로 분해 저장 |
| **확인 요청 / 상호 확인 경기** | 회원 간 단식 대진 요청(`match_requests`, pending→accepted/rejected/canceled). 수락 시 양측 관점 `personal_matches` 2행 생성(`source_request_id` 표식, 수정/삭제 잠금) |

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
pangnima@gmail.com / 123123

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
