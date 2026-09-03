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
│   │   │   ├── analytics/        # /profile/[userId]?scope=personal 리다이렉트
│   │   │   ├── personal-matches/ # 개인 경기 기록 CRUD
│   │   │   └── match-requests/   # 경기 확인 요청 허브 (받은/보낸 탭)
│   │   ├── profile/
│   │   │   ├── [userId]/         # 개인 프로필 (본인=분석 풀버전, 타인=공개 요약)
│   │   │   └── settings/
│   │   └── guide/               # 신규 사용자 사용 가이드 (정적, 개인 경기 1순위)
│   └── page.tsx                  # 랜딩페이지
├── components/
│   ├── ui/                       # shadcn/ui 자동 생성 컴포넌트 (직접 수정 금지)
│   ├── common/                   # 공통 (PageHeader 페이지 제목 블록(h1), Header, Sidebar, sidebar-context, BrandLogo, ProfileLink, TierIcon/TierEmblem, FieldToggle 라디오형 토글, RacketField 주력 라켓 입력 등)
│   ├── clubs/                    # 클럽 (ClubLogoField, LeaveClubButton, ClubInviteCard, InviteJoinButton 등)
│   ├── club-dashboard/           # 클럽 운영 전용 카드 (PendingMembers, Ranking, ClubAceCard 등)
│   ├── match-games/              # 대진표 (매트릭스/리스트 뷰, PlayerName, SpecialMatchBadge 등)
│   ├── personal-matches/         # 개인 경기 입력·목록 (PersonalMatchForm = use-personal-match-form-state + use-personal-match-submit 조립, PlayerPicker(필드별 전체 회원 검색 내장)+PlayerAutocomplete, PersonalMatchCard, MatchActions/MutualResultActions 카드 액션, MatchResultDialog 결과 입력·검토 팝업(복식 애드 포함) + use-set-scores/use-result-dialog 훅, RotationSessionCard/List + RotationGamesDialog 로테이션 게임 빌더 팝업, rotation/ 풀·게임 입력 등)
│   ├── match-requests/           # 경기 확인 요청 허브 (받은/보낸 카드, ResultConfirmCard 결과 확인 대기, RequestTeamLine 복식 팀 표시, 상태 뱃지)
│   ├── profile/                  # 프로필 헤더·통계 조합 (ProfileScopeTabs 개인/클럽/통합 탭 스캐폴드, ProfileSettingsForm + ProfileReadonlyFields 변경 불가 필드, DeleteAccountButton 등)
│   ├── onboarding/               # 신규 사용자 온보딩 (OnboardingChecklist, WelcomeDialog)
│   ├── stats/                    # 개인 통계 시각화 컴포넌트 (구 dashboard/ + analytics/ 통합)
│   ├── auth/                     # 인증 폼 (login/signup/forgot/reset, AvatarUploadField, SignupTennisSection 가입 테니스 정보)
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
│   │   ├── personal-matches.ts
│   │   ├── match-requests.ts     # 확인 요청 생성/취소/거절/수락(RPC)
│   │   ├── match-results.ts      # 상호 확인 경기 결과 제안/확인/이의 (RPC 3종)
│   │   ├── rotation-sessions.ts  # 로테이션 복식 세션 생성/삭제/확정(finalize RPC → 게임별 분해)
│   │   ├── profile.ts
│   │   ├── ratings.ts            # 클럽 레이팅 재계산 트리거
│   │   └── ai-coaching.ts
│   ├── queries/                  # Supabase read-only 쿼리
│   │   ├── _shared.ts            # buildUserMap 등 공용 헬퍼
│   │   ├── clubs.ts              # 클럽 조회 + 초대 미리보기(get_invite_preview)
│   │   ├── match-games.ts
│   │   ├── personal-matches.ts
│   │   ├── match-requests.ts     # 받은/보낸 요청·결과 확인 대기·뱃지 카운트(pending + 결과 제안)
│   │   ├── rotation-sessions.ts  # 결과 입력 대기 로테이션 세션 조회
│   │   ├── player-profile.ts     # fetchPlayerStatsBundle (타인 프로필용)
│   │   ├── analytics.ts          # fetchAnalyticsBundle (본인 분석용)
│   │   ├── club-dashboard.ts     # 클럽 운영 쿼리 (에이스·활동/승률 랭킹 등)
│   │   ├── ratings.ts            # 클럽 레이팅 랭킹·이력·재계산 입력 쿼리
│   │   ├── stats.ts              # RPC 호출 (get_user_match_stats, get_user_head_to_head)
│   │   └── users.ts              # mapUserRow 공용 매퍼 (is_guest·personal_ntrp·deleted_at 포함)
│   ├── analytics/                # 순수 함수 집계 모듈 (DB 접근 없음, vitest 테스트 다수). match-type.ts의 toQuadStats가 AnalyticsBundle.stats 형태 단일 출처
│   ├── redesign-fixtures/        # [임시] 정적 UI/목업 단계 더미 데이터 — 실 쿼리 호출부 대체 (_scenario.ts `?fixture=empty` 스위치, personal-analytics*.ts 개인 통계 데이터있음 픽스처 등). 실 연동 복원 시 제거
│   ├── dashboard/                # UI 토큰·스타일·outcome/surface/표시 헬퍼
│   │   ├── tokens.ts             # TYPO(시맨틱 타이포 조합: display/h1~h4/body/body2/caption/eyebrow/micro), CARD_BASE, EMPTY_BLOCK, FORM_* 폼 토큰, calcWinRate 등
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
│   ├── personal-matches/         # 개인 경기 매핑·세트 분해·승자 판정·로테이션 복식·상대 자동완성 후보
│   │   ├── map.ts / explode.ts / grouping.ts / winner.ts   # explode가 결과 미확정(winner NULL) 제외의 단일 초크포인트
│   │   ├── player-suggestions.ts # 상대 자동완성 그룹(만나본 사람/클럽 회원/전체 회원) 순수 빌더
│   │   ├── confirmation.ts       # match_requests 행 → viewer 관점 PersonalMatchConfirmation (perspective.ts 반전 재사용)
│   │   ├── perspective.ts        # invertSetScores — me/opp 스왑 + 복식 애드 교차 반전 (DB invert_set_scores와 동일 규칙)
│   │   ├── confirm-flow.ts       # resolveConfirmRep — 상대팀 회원 1명 대표 확인자 결정(상대1→상대2, 슬롯 스왑)
│   │   ├── labels.ts             # formatTeams/formatOpponents/buildAdLabels (카드·Dialog·요청 카드 공용 라벨)
│   │   ├── validate-input.ts     # PersonalMatchInput 검증(skipNtrpFor 필드별) + validateSetScores (DB validate_set_scores와 동일 규칙)
│   │   ├── rotation.ts           # 로테이션 복식 — 풀/게임 검증 분리(validateRotationPool/Games), 세션 players 직렬화, finalize 페이로드
│   │   └── validators.ts
│   ├── rating/                   # 레이팅 순수 엔진 (docs/rating-system.md)
│   │   ├── elo.ts / constants.ts # 클럽 ELO 엔진 (replayClubRatings)
│   │   ├── personal-rating.ts    # 개인 경기 기반 동적 개인 NTRP (온더플라이)
│   │   ├── tier.ts               # 8계급 밴딩 + 0~100 포인트 환산
│   │   └── display.ts            # formatClubRating·isProvisional 등 표시 헬퍼
│   ├── auth/                     # auth-error-messages.ts (Supabase 에러 한글 매핑)
│   ├── format/                   # phone.ts (연락처 하이픈), year-month.ts (년/월 파서·'YYYY-MM-01' 정규화·TZ 무관 라벨)
│   ├── profile/                  # signup-fields.ts (가입 선택지 상수: 성별·주력손·NTRP 1.0~4.0·라켓 브랜드 + resolveRacketBrand/splitRacketBrand/normalizeRacketModel/formatRacket)
│   ├── og/                       # brand.ts (OG 이미지 브랜딩 + 폰트)
│   ├── club-password.ts          # 클럽 삭제 비밀번호 scrypt 해시·검증
│   ├── default-images.ts         # 기본 아바타·클럽 로고 셔플
│   ├── avatar-color.ts           # 아바타 색상 생성
│   ├── format.ts                 # 날짜 등 포맷 헬퍼 (date-utils와 역할 구분)
│   ├── stats.ts                  # PlayerStats, HeadToHead, CourtStat 등 타입 전용
│   ├── onboarding.ts             # 신규 사용자 온보딩 단계 정의·완료 판정 (순수 함수)
│   ├── nav-items.ts              # 사이드바 네비게이션 (topNavItems: 사용 가이드 / buildPersonalNavItem: '개인' 단일 메뉴 / myMatchNavItems / clubNavItems: 클럽 찾기)
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
/clubs → 클럽 리스트
/clubs/new → 클럽 생성
/clubs/join/[token] → 초대 링크 가입 (비공개 클럽, 비로그인 미리보기 + 로그인 후 복귀)
/clubs/[clubId] → 클럽 홈 (owner/officer이면 하단에 운영 섹션 인라인)
/clubs/[clubId]/dashboard → /clubs/[clubId] 리다이렉트
/clubs/[clubId]/members → 회원 목록
/clubs/[clubId]/match-games → 대진표 목록
/clubs/[clubId]/match-games/new → 대진표 생성
/clubs/[clubId]/match-games/[matchGameId] → 대진표 상세
/clubs/[clubId]/settings → 클럽 설정 (owner 전용)
/profile/[userId] → 개인 통계 허브 (사이드바 '개인' 메뉴 = 로그인 후 기본 진입점, 본인 프로필 ?scope=personal)
  ├── 본인: 개인/클럽/통합 3탭 스캐폴드(ProfileScopeTabs — 현재 개인만 동작, scope 미지정=personal) + 심층 분석 풀버전 + AI 코칭. [임시] ?fixture=empty로 빈 상태 검수
  └── 타인: 공개 통계 요약 (프라이버시 설정 반영)
/profile/settings → 내 정보 수정
/me/analytics → /profile/[내id]?scope=personal 리다이렉트
/me/personal-matches → 개인 경기 기록 목록
/me/personal-matches/new → 개인 경기 추가 (세트 없이 결과 미확정으로 저장, 회원 상대 단식은 확인 요청 플로우로 전환)
/me/personal-matches/[id]/edit → 개인 경기 수정 (상호 확인 경기는 진입 차단, 기존 세트는 보존)
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
  - [x] 온보딩 체크리스트 (`lib/onboarding.ts`·`components/onboarding/`, 프로필 개인 탭, localStorage 닫기)
  - [x] 첫 로그인 환영 모달 + 정적 가이드 페이지 `/guide`
- [x] Week 17: 개인 경기 등록 폼 개편 (0034 마이그레이션)
  - [x] 경기 타입·코트 표면 라디오형 선택 (FieldToggle), 세트 스코어 입력 제거 → 결과 미확정(winner NULL) 저장
  - [x] 상대 단일 자동완성 입력 (base-ui Autocomplete) + 회원/만나본 사람 선택 시 손잡이·NTRP 자동 채움
  - [x] 확인 요청도 세트 없이 요청 (수락 시 양측 미확정 기록), 통계·레이팅은 미확정 제외
  - [x] 미확정 경기의 세트·결과 등록 플로우 (0037 마이그레이션)
    - 카드 '결과 입력' → 레이어 팝업(`MatchResultDialog`)에서 세트 추가/삭제 + 결과 미리보기. 자유 기록은 즉시 확정(`updatePersonalMatchSetsAction`)
    - 상호 확인 경기는 제안 → 상대 확인/이의 플로우 (`match_requests.result_status`, RPC `propose/confirm/dispute_match_result`). 확정 시 양측 `personal_matches` 2행을 RPC가 동시 갱신
    - 상대 알림: 개인 경기 카드 '결과 확인' + 확인 요청 허브 받은 탭 '결과 확인 대기' 섹션 + 사이드바/모바일 뱃지 합산
- [ ] Week 21: 정적 UI/목업 우선 진행 — 재설계 스키마(Week 20) 확정 후, 실 연동 복원 전까지 UI를 픽스처 데이터로 검증
  - [x] `src/lib/redesign-fixtures/`(clubs/match-games/match-requests/personal-matches/ratings) — 신규 ERD 기준 더미 데이터로 클럽·대진표·개인경기·확인요청·레이팅 화면 전량 임시 대체
  - [x] "내 전적" 메뉴 → 사이드바/모바일 **'개인' 단일 메뉴**로 통합(`buildPersonalNavItem`·`isPersonalNavActive`, 클럽 트리의 클럽별 '내 전적' 링크 제거) + 프로필 본인 화면 개인/클럽/통합 **3탭 스캐폴드**(`ProfileScopeTabs`, 개인만 동작·기본 scope personal, 온보딩 체크리스트도 개인 탭)
  - [x] 개인 통계 **'데이터 있음' 픽스처** — `redesign-fixtures/personal-analytics(-data).ts`가 `fetchAnalyticsBundle` 호출부 대체(원본 PersonalMatch만 작성, stats/h2h는 순수 함수 파생), `?fixture=empty`로 빈 상태 전환, 임계값 회귀 테스트(`personal-analytics.test.ts`)
  - [ ] 클럽/통합 탭 활성화 (클럽 `Match[]` 픽스처 + `ProfileScopeTabs` href 추가) · 타인 프로필 `fetchPlayerStatsBundle` 픽스처화(RPC 집계 결과 수작업)
  - [ ] 실 Supabase 쿼리 복원 — `lib/queries/*.ts`를 신규 참가자 테이블(`match_game_participants` 등) 기반으로 재작성해 픽스처 제거 (스키마·RPC는 Week 20에서 이미 재작성 완료, 화면 재연동만 잔여). 이때 `revalidatePath('/me/analytics')` 9곳도 `/profile/${userId}`로 교체
- [x] Week 20: DB 재설계 — 다형성-컬럼 정규화 (0039~0041 마이그레이션, `docs/redesign/*.md`)
  - [x] 도메인/상태 모델링(Step1) → 정적 UI 재검증(Step2) → 신규 ERD(Step3) → users/club_player_ratings 구조 제외 전체 초기화+재구축(Step4) → TS 계약 회귀 수정(Step5)
  - [x] `match_game_matches`/`personal_matches`/`match_requests`의 단식·복식 컬럼 → 참가자 테이블(`match_game_participants`/`personal_match_participants`/`match_request_participants`) 정규화
  - [x] `match_requests`의 요청상태(status)·결과협상(result_status) 2축을 `match_result_negotiations`로 분리, 요청 생성은 `create_match_request` RPC로 일원화
  - [x] `get_user_head_to_head`/`get_user_match_stats_v2`/`get_user_doubles_court_stats`/`get_user_partner_stats` 오버로드 2종 → `p_club_id` 선택 인자 단일 함수로 통합, 죽은 RPC 3종 제거
  - [x] `npx tsc --noEmit`·`npm run lint`·`npm run build` 전부 통과 확인
- [x] Week 19: 복식 등록을 단식과 동일 구성으로 개편 (0038 마이그레이션)
  - [x] 페어 고정 복식: 세트 없이 미확정 등록, 모든 선수 필드에 전체 회원 검색(PlayerPicker 내장) + 손잡이·NTRP 자동 채움
  - [x] 페어 고정 복식 상호 확인 — 상대팀 회원 1명이 대표 확인(`resolveConfirmRep`), `match_requests` 파트너/상대2 컬럼, 수락 시 요청자/대표 2행(슬롯 재배치·NTRP 파생)
  - [x] 결과 입력 팝업 복식 지원 — 세트별 애드/듀스 토글, 애드 관점 교차 반전을 DB(`invert_set_scores`)·클라(`invertSetScores`)·제안 정규화·저장 4곳에 일괄 적용
  - [x] 로테이션 복식: 등록 시 선수 풀만 `rotation_sessions`에 저장 → 목록 상단 '결과 입력 대기 로테이션' 카드 → 게임 빌더 팝업 → `finalize_rotation_session`이 게임별 `personal_matches`로 분해
  - [x] `personal-match-form.tsx` 분할 (state/submit 훅), `validatePersonalMatchInput` 필드별 `skipNtrpFor`
- [x] Week 18: 회원가입 폼 개편 (0035~0036 마이그레이션)
  - [x] 테니스 시작일 년/월 텍스트 입력 (`2025/07`·`2022/2` 등 파서) → `tennis_start_date`에 `YYYY-MM-01` 저장
  - [x] NTRP 1.0~4.0 0.5 단위 라디오 (FieldToggle), 프로필 설정에서 NTRP 수정 제거 (읽기 전용)
  - [x] 주력 라켓 라디오 (윌슨/헤드/요넥스/바볼랏/기타+직접 입력) + 라켓명 선택 입력 → `users.racket_brand`·`racket_model`, 설정에서 수정 가능 (`common/RacketField` 공유), `handle_new_user` 트리거 레포 편입
  - [x] `signupAction`이 `signUp` 호출 전 검증 (트리거 실패 = 가입 롤백 방지)
- [x] Week 22: 타이포그래피 8단계 시맨틱 토큰 체계 (`docs/typography.md`)
  - [x] `globals.css` @theme `text-display/h1~h4(clamp 유동)/body/body2/caption/micro` + 본문 줄간격 변수 스왑(모바일 1.65 → md 1.55) + 본문·폼 요소 16px(전 뷰포트, iOS 줌 방지)
  - [x] 구 `.type-*`/`TYPO` 하드코딩·`SECTION_LABEL` 폐기 → `TYPO` 신규 키, `PageHeader` 신설, 헤딩 41곳 태그/클래스 재배치(카드 제목 `<p>`→헤딩), 텍스트 사이즈 약 600곳 용도별 재분류(components/ui 제외 기본 `text-*` 사이즈 0건)
  - [x] `cn()` tailwind-merge 확장(`text-h1`이 색상으로 오인돼 삭제되던 문제) + `utils.test.ts`·`tokens.test.ts` 가드
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

> **2026-09 재설계**: `docs/redesign/` 참고(domain-model.md/erd.md). 다형성-컬럼 안티패턴(단식/복식, 요청원장+결과협상+팀구성 혼재)을 참가자 테이블로 정규화(0039~0041). `users`(계정/인증)·`club_player_ratings`/`club_rating_history`(구조)는 재설계 범위에서 구조 변경 없이 유지, 그 외 전 테이블 데이터 초기화 후 재구축.

| 테이블 | 주요 RLS 정책 |
|---|---|
| `users` | 본인만 UPDATE (`is_guest`·`personal_ntrp`·`deleted_at`·`racket_brand`·`racket_model` 컬럼 포함). 행 생성은 `handle_new_user` 트리거(0035·0036에 정의 편입) |
| `clubs` | is_public이면 전체 SELECT, owner만 UPDATE/DELETE (`court_schedule`·삭제 비밀번호 해시 포함) |
| `club_members` | approved 멤버만 SELECT, owner/officer만 승인/거절 |
| `match_games` | approved 멤버만 SELECT/INSERT, owner만 DELETE |
| `match_game_courts/rounds/time_slots` | 상위 match_game의 RLS를 따름 (courts.surface 포함) |
| `match_game_matches` | approved 멤버만 SELECT/INSERT/UPDATE, owner만 DELETE. 단식/복식 참가자 컬럼(player1_id 등) 제거 → `match_game_participants`로 정규화. `winner_id`(team1/team2/draw 리터럴)·`result_sets`·`status`는 그대로 유지 |
| `match_game_participants` | 상위 match와 동일 RLS. `{match_id, user_id, side, is_ad}` — 단식 2행/복식 4행, `unique(match_id, user_id)` |
| `personal_matches` | 본인(user_id)만 CRUD. `winner` NULL = 결과 미확정(집계 제외). `source_type`(direct/confirmation/rotation)으로 출처 명시. 상호확인(`source_type='confirmation'`)은 RESTRICTIVE 정책으로 수정/삭제 잠금. 참가자(opponent/partner/opponent2)는 `personal_match_participants`로 정규화 |
| `personal_match_participants` | 상위 경기(user_id)와 동일 RLS + 잠금. `{match_id, role, user_id, name, dominant_hand, ntrp_snapshot}` |
| `match_requests` | 당사자 둘만 SELECT, requester만 취소, opponent만 거절. **생성은 `create_match_request` RPC 전용**(직접 INSERT 정책 폐지 — 복식 참가자 원자적 삽입을 위해). `set_scores`는 요청 시점 원본값(빈 배열 허용). 수락은 RPC로만. 복식 파트너/상대2는 `match_request_participants`로, 결과 협상(`result_status`/`proposed_set_scores`/`proposed_by`/`proposed_at`/`dispute_reason`)은 `match_result_negotiations`로 분리(요청 상태축과 결과협상축이 별개 테이블) |
| `match_request_participants` | 당사자만 SELECT. `{request_id, role(partner/opponent2), user_id, name, dominant_hand, ntrp_snapshot}`. 쓰기는 `create_match_request` RPC 전용 |
| `match_result_negotiations` | 당사자만 SELECT(request_id 1:1). 쓰기는 `accept/propose/confirm/dispute_match_result` RPC 전용 |
| `rotation_sessions` | 본인(user_id)만 SELECT/INSERT/DELETE. 로테이션 복식 선수 풀(`players` jsonb ≥3)만 보관, 게임은 `finalize_rotation_session` RPC(security invoker)가 `personal_matches`+`personal_match_participants`로 분해 후 세션 삭제. 통계 밖 |
| `ai_coaching_cache` | 본인 통계 묶음 해시 기반 캐시 (24h) |
| `club_player_ratings` / `club_rating_history` | approved 멤버만 SELECT, 쓰기는 RPC로만. `club_rating_history.match_id`는 재설계 후에도 `match_game_matches(id)` FK 유지 |
| `club_invites` | owner만 관리, 미리보기·가입은 SECURITY DEFINER RPC로만 |

헬퍼 함수: `is_club_owner(club_id)`, `is_club_approved_member(club_id)`, `is_club_owner_or_officer(club_id)` (SECURITY DEFINER)
RPC: `create_match_game`, `update_match_game` (참가자 배열 `[{user_id,side,is_ad}]`로 단식/복식 통일 INSERT), `add_guest_player` (트랜잭션 단위)
RPC: `get_user_match_stats_v2`, `get_user_head_to_head`, `get_user_doubles_court_stats`, `get_user_partner_stats` (각 단일 함수, `p_club_id` 선택 인자로 기존 오버로드 2종 통합 — `match_game_participants` 기반 재작성)
RPC: `get_club_activity_ranking`, `get_club_win_rate_ranking`, `get_club_member_counts` (클럽 대시보드 집계, 참가자 테이블 기반)
RPC: `apply_club_rating_snapshot` (레이팅 영속화), `get_invite_preview`·`join_club_via_invite` (초대 링크)
RPC: `create_match_request` (요청 원장 + 복식 참가자 2행 원자적 생성 — 참가자 정규화로 직접 INSERT 폐지)
RPC: `accept_match_request` (상호 확인 대진 수락 — 양측 관점 personal_matches 2행 + participants + match_result_negotiations 1행 생성, 세트 없으면 양측 winner NULL)
RPC: `propose_match_result`·`confirm_match_result`·`dispute_match_result` (match_result_negotiations에 대해 제안/확인/이의 — confirm이 양측 personal_matches의 세트·winner를 동시 확정, 복식 애드 보존). helper `personal_match_winner`·`invert_set_scores`(애드 교차 반전)·`validate_set_scores`(애드 enum)·`normalize_set_scores`·`derive_public_ntrp`
RPC: `finalize_rotation_session` (로테이션 세션 → 게임별 personal_matches+participants 분해 + 세션 삭제, 한 트랜잭션)
View: `user_match_participations` (security_invoker=on, `match_game_participants` 기반 재작성 — 4-way UNION 제거)
마이그레이션: 0001~0041 (0016부터 로컬 `supabase/migrations/*.sql`로 버전관리, 0001~0015는 MCP `apply_migration` 이력, 0039~0041이 재설계)

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
| **통합/자가선언 NTRP** | `users.ntrp` — 가입 시 1.0~4.0(0.5 단위) 중 1회 선언하는 정적 값. 가입 후 변경 불가 (기존 4.5+ 값은 보존) |
| **테니스 시작일 / 주력 라켓** | `users.tennis_start_date`(년/월만 입력, `YYYY-MM-01` 저장) · `users.racket_brand`(프리셋 한글 라벨 또는 기타 직접 입력 ≤30자) + `racket_model`(라켓명, 선택 ≤40자). 시작일은 가입 시 1회, 라켓은 설정에서 수정 가능 |
| **클럽 NTRP** | `club_player_ratings` — 클럽별 독립 ELO, 확정 경기로 동적 변동 (2.5 시작) |
| **개인 NTRP** | `users.personal_ntrp` — 개인 경기(`personal_matches`) 승패 기반 온더플라이 동적 레이팅 캐시 |
| **티어(Tier)** | 클럽 레이팅(연속 rating)을 8계급(아이언~챌린저)으로 밴딩 + 계급당 0~100p. 표시 전용, `TIER_BANDS` 단일 출처 |
| **명승부 / 라이벌** | 대진표 특별매치 판정 — 접전(한 게임차 포함) / cross-pair 박빙 (`lib/match-games/special-match.ts`) |
| **탈퇴 회원** | `users.deleted_at` soft delete(익명화). 대진표 이름은 복원·'탈퇴' 배지, 레이팅 값 보존하되 랭킹 제외 |
| **초대 토큰** | `club_invites.token` — 비공개 클럽 가입용. SECURITY DEFINER RPC로만 미리보기·가입 |
| **로테이션 복식 / 로테이션 세션** | 4명 이상 파트너 교대(아메리칸) 복식. 등록 시 선수 풀만 `rotation_sessions`(세션)에 저장하고, 카드 '결과 입력' 게임 빌더에서 게임(파트너·상대1·상대2 + 세트)을 구성하면 게임별 개인 경기 레코드로 분해 저장. 상호 확인 없음(자유 기록) |
| **확인 요청 / 상호 확인 경기** | 회원 간 단식·페어 고정 복식 대진 요청(`match_requests`, pending→accepted/rejected/canceled — 생성은 `create_match_request` RPC 전용). 복식은 상대팀 회원 1명이 **대표 확인자**(`opponent_user_id`, 상대1→상대2 순 회원 자동 선택·슬롯 스왑), 파트너/상대2는 `match_request_participants`. 수락 시 요청자/대표 관점 `personal_matches` 2행 생성(`source_type='confirmation'`, `source_request_id` 표식, 수정/삭제 잠금) — 파트너·상대2가 회원이어도 그들 기록에는 생성하지 않음 |
| **결과 미확정** | `personal_matches.winner = NULL` — 세트 스코어 없이 등록된 개인 경기. 카드에 '미확정' 배지, 통계·레이팅·AI 코칭 집계에서 제외(`explodePersonalMatchSets`). 카드 '결과 입력' 팝업에서 세트가 등록되면 `winner`가 파생되어 확정 |
| **결과 제안 / 확인** | 상호 확인 경기의 사후 결과 등록. `match_result_negotiations.result_status`(request_id 1:1): none → proposed(한쪽이 세트 제안, 요청자 관점으로 정규화 저장) → confirmed(상대 확인 → 양측 `personal_matches` 확정) \| disputed(이의 제기 + 사유, 양측 누구든 재제안). 제안자 본인은 확인 불가, 제안 수정만 가능 |

## 코딩 규칙

### 기본 원칙
- 모든 파일은 TypeScript 사용. `any` 타입 절대 금지
- 컴포넌트는 반드시 named export 사용 (default export 금지)
- 파일명은 kebab-case (예: `club-card.tsx`)
- 컴포넌트명은 PascalCase (예: `ClubCard`)
- 함수명은 camelCase (예: `getClubById`)
- 폰트 사이즈는 시맨틱 토큰만 사용: `text-display` `text-h1`~`text-h4` `text-body` `text-body2` `text-caption` (+ 배지·카운트 전용 예외 `text-micro`). `text-sm`·`text-xs`·`text-[13px]` 같은 Tailwind 기본 사이즈·임의값 금지. 굵기·색상은 `lib/dashboard/tokens.ts`의 `TYPO`로 조합 (규칙·판정 기준: `docs/typography.md`)
- 헤딩은 태그=문서 아웃라인, 클래스=시각 레벨. 페이지 h1은 `common/PageHeader` 사용, 카드 제목은 `<p>`가 아닌 헤딩 태그 + `TYPO.h4`
- input/textarea/select는 전 뷰포트 16px(`globals.css` 레이어 밖 규칙이 강제, iOS 줌 방지). 폼 요소에 작은 사이즈 클래스를 주지 말고 폭·높이로 조정

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
- 시맨틱 타이포 토큰 외 폰트 사이즈 클래스(`text-sm`/`text-xs`/`text-[Npx]`/`sm:text-*`) 사용 금지 (components/ui 내부 제외)

## 작업 완료 후 체크리스트
- [ ] TypeScript 에러 없음 (`npx tsc --noEmit`)
- [ ] 린트 통과 (`npm run lint`)
- [ ] 빌드 성공 (`npm run build`)
- [ ] git commit (conventional commits 형식)
