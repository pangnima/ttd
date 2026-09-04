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
│   │   │   └── match-requests/   # 경기 확인 요청 허브 (받은/보낸 탭, 받은 탭 상단 '경기 리스트 초대')
│   │   ├── match-rooms/          # 경기 리스트 (리스트에 노출된 경기 방 목록 예정/지난 탭, [roomId] 상세 = 비밀번호 게이트(입장=참가) → 참가자·게임, 참가자 누구나 '게임 추가')
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
│   ├── personal-matches/         # 개인 경기 입력·목록 (PersonalMatchForm = use-personal-match-form-state + use-personal-match-submit 조립, PlayerPicker(필드별 전체 회원 검색 내장)+PlayerAutocomplete, CourtNameAutocomplete 코트명 '최근 코트' 재선택, PersonalMatchCard(경기 1건 카드, 게임 1개 WIN/LOSS·2개 이상 'N승 M패') + MatchGroupList/RotationGroupHeader(같은 로테이션 세션 카드들을 일시·코트명·참여 멤버·전적 헤더 행으로 묶음) + MatchDateColumn/MatchMetaLine(시각·코트명·메모) 카드 공용 조각, MatchActions/MutualResultActions 카드 액션, MatchResultDialog 결과 입력·검토 팝업(복식 애드 포함) + use-set-scores/use-result-dialog 훅, RotationSessionCard/List + RotationGamesDialog 로테이션 게임 빌더 팝업(게임당 스코어 1줄), rotation/ 풀·게임 입력 등)
│   ├── match-requests/           # 경기 확인 요청 허브 (받은/보낸 카드, ResultConfirmCard 결과 확인 대기, RoomInviteCard 경기 리스트 초대 수락/거절, RequestTeamLine 복식 팀 표시, 상태 뱃지)
│   ├── match-rooms/              # 경기 리스트(경기 방): MatchRoomCard 목록 행, RoomPasswordGate 비밀번호 입장, RoomDetailHeader, RoomMembersSection+RoomMemberRow 참가자 명단(방장/참가/초대 대기/비회원), RoomGamesSection+RoomGameRow 방의 대표 게임 목록(작성자 관점 팀 라인, 모집 중·결과 미입력·결과 확인 대기·이의 제기 칩, 참가자 '게임 추가'(`/me/personal-matches/new?room=`)·작성자 '참가자 채우기'·당사자 '결과 입력·확인' 링크), RoomHostActions 비밀번호 변경·리스트에서 내리기, RoomInviteBanner 초대 응답, RoomLink 카드→방 링크
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
│   │   ├── match-rooms.ts        # 경기 방 입장(비밀번호 = 참가)·초대 응답·비밀번호 변경·리스트에서 내리기 + createRoomGameAction(방 게임 등록, create_room_game RPC — 0049). 비회원 상대 방 게임만 personal-matches.ts createPersonalMatchesAction(…, {roomId})
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
│   │   ├── match-rooms.ts        # 경기 리스트 목록(공개 메타+인원+내 상태)·게이트용 요약·상세(get_match_room_detail RPC → parse-detail)·방 초대 목록/건수
│   │   ├── player-profile.ts     # fetchPlayerStatsBundle (타인 프로필용)
│   │   ├── analytics.ts          # fetchAnalyticsBundle (본인 분석용)
│   │   ├── club-dashboard.ts     # 클럽 운영 쿼리 (에이스·활동/승률 랭킹 등)
│   │   ├── ratings.ts            # 클럽 레이팅 랭킹·이력·재계산 입력 쿼리
│   │   ├── stats.ts              # RPC 호출 (get_user_match_stats, get_user_head_to_head)
│   │   └── users.ts              # mapUserRow 공용 매퍼 (is_guest·personal_ntrp·deleted_at 포함)
│   ├── analytics/                # 순수 함수 집계 모듈 (DB 접근 없음, vitest 테스트 다수). match-type.ts의 toQuadStats가 AnalyticsBundle.stats 형태 단일 출처
│   ├── redesign-fixtures/        # [임시] 정적 UI/목업 단계 더미 데이터 — 실 쿼리 호출부 대체 (clubs/match-games/match-requests/ratings, _scenario.ts `?fixture=empty` 스위치, personal-analytics*.ts 개인 통계 데이터있음 픽스처). 개인 경기 화면은 실 쿼리로 복원 완료(personal-matches 픽스처 제거). 나머지도 실 연동 복원 시 제거
│   ├── dashboard/                # UI 토큰·스타일·outcome/surface/표시 헬퍼 (colors.test.ts = 컬러 회귀 가드)
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
│   │   ├── lineup.ts             # 라인업 판정 (0047) — isSlotEmpty/isSlotOk(모집형에서 닫힌 슬롯만 비움 허용 — 열린 슬롯은 NTRP까지 필수), isLineupComplete(+ByRoles), isRecruiting. 폼 검증·결과 입력 차단·카드 배지 단일 출처
│   │   ├── map.ts / explode.ts / grouping.ts / winner.ts   # explode가 결과 미확정(세트 없음, hasResult) 제외의 단일 초크포인트(통계·레이팅 입력 = SettledPersonalMatch 분해본). winner.ts hasResult·resolveSetWinner·tallySets = 게임 단위 승패 규칙(행 단위 승자 없음)
│   │   ├── match-groups.ts       # buildMatchGroups — 목록 표시 그룹(로테이션 세션 묶음: 일시·코트명·참여 멤버·전적 / 레코드 1건). 표시 전용, explode와 분리
│   │   ├── player-suggestions.ts # 상대 자동완성 그룹(만나본 사람/클럽 회원/전체 회원) 순수 빌더
│   │   ├── confirmation.ts       # match_requests 행 → viewer 관점 PersonalMatchConfirmation (perspective.ts 반전 재사용)
│   │   ├── perspective.ts        # invertSetScores — me/opp 스왑 + 복식 애드 교차 반전 (DB invert_set_scores와 동일 규칙)
│   │   ├── confirm-flow.ts       # resolveConfirmRep — 상대팀 회원 1명 대표 확인자 결정(상대1→상대2, 슬롯 스왑)
│   │   ├── labels.ts             # formatTeams/formatOpponents/buildAdLabels (카드·Dialog·요청 카드 공용 라벨)
│   │   ├── validate-input.ts     # PersonalMatchInput 검증(skipNtrpFor 필드별, 파트너 NTRP도 필수, allowMissingPlayers = 모집형·세트 없을 때만 참가자 생략) + validateCourtName(≤40자) + validateSetScores (DB validate_set_scores와 동일 규칙)
│   │   ├── rotation-pool.ts      # buildBuilderPool — 빌더 풀 = 세션 풀 ∪ 방 참가자(joined) ∪ 소유자 − 나 (앵커=입력자, 0050)
│   │   ├── rotation-rep.ts       # resolveRotationRep — 방 로테이션 게임의 상대팀 대표 결정(상대1→상대2, 없으면 즉시 확정). SQL finalize·confirm-flow와 같은 규칙
│   │   ├── rotation.ts           # 로테이션 복식 — 풀/게임 검증 분리(validateRotationPool({allowEmpty})/Games), isPoolRowEmpty·compactPool(빈 행 제거), 세션 players 직렬화, finalize 페이로드
│   │   └── validators.ts
│   ├── match-rooms/              # 경기 리스트(경기 방) 순수 함수 + server-only 헬퍼 (0046·0048·0049)
│   │   ├── password.ts           # validateRoomPassword(4~20자·공백 금지) + RoomListingInput 타입 (클라·액션 공용, RPC와 3중 방어)
│   │   ├── title.ts / split.ts / headcount.ts / members-view.ts   # 자동 제목(일시·코트명·타입) / 예정·지난 분리(todayIsoKst) / 참가 인원('참가 N명', 정원 없음)·상태 칩 / 상세 명단 행 빌더 (vitest)
│   │   ├── parse-detail.ts       # get_match_room_detail jsonb → MatchRoomDetail 런타임 가드 파서
│   │   ├── room-context.ts       # RoomGameContext(방 게임 추가 폼 컨텍스트: 방 메타 고정 + 참가자 후보 + viewerIsHost) + canAddRoomGame(출처만 판정 — 단독 사용 금지) + canViewerAddRoomGame(방 참가자면 추가 가능) + buildRoomGameContext
│   │   ├── game-status.ts        # 방 상세 게임 행 표시 규칙 (roomGameStatusLabel 상태 칩·canEditRoomGame 작성자 수정·isRoomGameParty 결과 입력 자격, vitest)
│   │   └── create-room.ts        # listRecordAsRoom — 출처 저장 후 create_match_room RPC 호출 (세 등록 액션 공용, server-only)
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
│   ├── avatar-color.ts           # 아바타 색상 생성 (cat-1~8 팔레트, 길이 8 고정)
│   ├── format.ts                 # 날짜 등 포맷 헬퍼 (date-utils와 역할 구분) + 경기 시각 시 단위(HOUR_OPTIONS·toHourValue·formatHourLabel)
│   ├── stats.ts                  # PlayerStats, HeadToHead, CourtStat 등 타입 전용
│   ├── onboarding.ts             # 신규 사용자 온보딩 단계 정의·완료 판정 (순수 함수)
│   ├── nav-items.ts              # 사이드바 네비게이션 (topNavItems: 사용 가이드 / buildPersonalNavItem: '개인' 단일 메뉴 / myMatchNavItems: 개인 경기 등록·경기 리스트(/match-rooms)·경기 확인 요청 / clubNavItems: 클럽 찾기)
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
/me/match-requests → 경기 확인 요청 허브 (받은/보낸 탭, 수락·거절·취소, 받은 탭 상단 경기 리스트 초대)
/match-rooms → 경기 리스트 (리스트에 노출된 경기 방 전체, 예정 기본 + ?tab=past 지난 경기)
/match-rooms/[roomId] → 경기 방 상세 (방장·초대 수락자·비밀번호 입장자(=참가자) = 참가자·메모·게임 목록, 그 외 = 공개 메타 + 비밀번호 게이트)
/me/personal-matches/new?room=[roomId] → 방 게임 추가 (방에 참가한 회원 누구나, 메타는 방 값으로 고정, 참가자 자동완성 '방 참가자' 최상단, 회원 상대는 상호 확인 게임·비회원 상대는 방장의 자유 기록)
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
  - [x] 개인 경기 화면(목록/등록/편집) 실 쿼리 복원 — `personal_match_participants` 기반 `lib/queries/personal-matches.ts`·`rotation-sessions.ts`·`users.ts` 재연결, `redesign-fixtures/personal-matches.ts` 제거 (픽스처 세션이 uuid도 아니고 비회원 손잡이도 없어 로테이션 '결과 입력' 저장이 불가능했던 문제 해소) + `finalize_rotation_session`이 실 세션에도 `session_not_found`를 내던 RLS 잠금 결함 수정(0042)
  - [ ] 실 Supabase 쿼리 복원(잔여: 클럽·대진표·확인 요청·프로필 통계) — `lib/queries/*.ts`를 신규 참가자 테이블(`match_game_participants` 등) 기반으로 재작성해 픽스처 제거 (스키마·RPC는 Week 20에서 이미 재작성 완료, 화면 재연동만 잔여). 이때 `revalidatePath('/me/analytics')` 9곳도 `/profile/${userId}`로 교체
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
- [x] Week 24: 세트=게임 표시 통일 + 로테이션 그룹핑 (0044 마이그레이션)
  - [x] 로테이션 게임 = 스코어 1줄 고정(세트 추가 제거, 클라·액션·RPC 3중 방어), `personal_matches.rotation_session_id`·`group_seq`로 세션 게임 카드들을 목록에서 헤더 행(일시·코트명·참여 멤버·전적, `RotationGroupHeader`)으로 묶어 노출 + 레거시 로테이션 행 백필
  - [x] 멀티세트 레코드는 DB·카드 구성 그대로 두되 다수결 색 바 제거(게임 1개 WIN/LOSS, 2개 이상 중립 바 + 'N승 M패', `tallySets` 단일 규칙), 결과 입력 UI 용어 '세트'→'게임'
  - [x] 경기 시각 셀렉트를 `EnumSelect`(base-ui)로 교체해 날짜 input과 높이(48px) 정렬
  - [x] 세트 다수결 승패 로직 폐기(0045): `personal_matches.winner`·`personal_match_winner`·`resolveMatchWinner` 제거, 미확정 = `set_scores` 빈 배열(`hasResult`) 단일 규칙, RPC 3종은 세트만 기록. 로테이션 그룹 헤더는 일시를 앞세워 여백 없이 경계 구분
  - [ ] 2차: 로테이션 그룹 단위 삭제 액션(현재는 게임별 삭제만)
- [x] Week 23: 개인 경기 등록 폼 사용성 개선 (0043 마이그레이션)
  - [x] 코트명(선택, ≤40자) — `personal_matches`·`rotation_sessions`·`match_requests` `court_name` + RPC 3종 스레딩(수락 시 양측 복사, finalize 시 게임에 상속), 본인 과거 코트명을 '최근 코트'로 재선택(`CourtNameAutocomplete`·`fetchRecentCourtNames`)
  - [x] 목록 카드에 시각·코트명·메모 노출(`MatchMetaLine`), 날짜 컬럼을 `MatchDateColumn`으로 공용화(로테이션 세션 카드 포함)
  - [x] 복식 기본값 로테이션, 경기 시각 00~23시 select(분 제거, 저장 포맷 `HH:00`), 파트너 NTRP 필수(페어 고정 + 로테이션 풀 전원)
- [x] Week 22: 타이포그래피 8단계 시맨틱 토큰 체계 (`docs/typography.md`)
  - [x] `globals.css` @theme `text-display/h1~h4(clamp 유동)/body/body2/caption/micro` + 본문 줄간격 변수 스왑(모바일 1.65 → md 1.55) + 본문·폼 요소 16px(전 뷰포트, iOS 줌 방지)
  - [x] 구 `.type-*`/`TYPO` 하드코딩·`SECTION_LABEL` 폐기 → `TYPO` 신규 키, `PageHeader` 신설, 헤딩 41곳 태그/클래스 재배치(카드 제목 `<p>`→헤딩), 텍스트 사이즈 약 600곳 용도별 재분류(components/ui 제외 기본 `text-*` 사이즈 0건)
  - [x] `cn()` tailwind-merge 확장(`text-h1`이 색상으로 오인돼 삭제되던 문제) + `utils.test.ts`·`tokens.test.ts` 가드
- [x] Week 25: 경기 리스트(경기 방) — 사이드바 메뉴 신설 (0046 마이그레이션)
  - [x] 개인 경기 등록 폼 '리스트에 노출' 토글 + 비밀번호(4~20자) — 신규 등록 3갈래(자유 기록/확인 요청/로테이션) 모두 출처 저장 후 `create_match_room` RPC로 방 생성(`lib/match-rooms/create-room.ts`), 폼 좌/우 열을 `who-column`/`when-column`으로 분리
  - [x] `match_rooms`(공개 메타 전원 SELECT) + `match_room_secrets`(정책 0개, pgcrypto 해시) + `match_room_members`(host/player/viewer × invited/joined/declined/requested), 출처 3테이블 `room_id` FK, 트리거로 메타·`has_result` 동기화 및 거절/삭제 시 방 정리
  - [x] 기록에 입력된 회원 전원 자동 초대(확인 요청 대표는 `accept_match_request`가 곧바로 참가), 확인 요청 허브 받은 탭 '경기 리스트 초대' 섹션 + 사이드바/모바일 뱃지 합산(모바일 nav 중복 클라이언트 쿼리 제거 → props)
  - [x] `/match-rooms` 목록(예정/지난 탭) + `/match-rooms/[roomId]` 상세(비밀번호 게이트 → 참가자 명단·방장 관점 결과, 로테이션 풀 합류 신청/승인, 방장 비밀번호 변경·리스트에서 내리기)
  - [x] 모집형 방 (0047): '리스트에 노출'을 켜면 참가자(단식 상대/복식 3명/로테이션 풀)를 **비운 채 저장** 가능 — 빈 자리는 방장이 수정 폼에서 채우고(채운 회원은 `personal_match_participants` INSERT 트리거가 방에 초대, 비밀번호로 먼저 입장한 viewer는 invited로 승격), 결과 입력은 라인업 완성 후에만(클라 버튼 + `updatePersonalMatchSetsAction`). 확인 요청은 라인업이 다 찼을 때만 생성. `rotation_sessions.players` ≥3 제약 완화 + 로테이션 정원 `greatest(4, 1+풀)` 재계산
  - [x] 정원 없는 방 + 입장=참가 + 방장 게임 다건 구성 (0048): 비밀번호 입장이 곧 `player/joined`(미확정 로테이션은 `rotation_sessions.players`에도 append), viewer 역할·풀 합류 신청(requested/승인/거절 RPC 3종·`RoomJoinButton`·`RoomJoinRequestActions`)·`match_rooms.capacity` 폐지. 방 상세 '게임 추가' → 등록 폼 `?room=`(메타는 방 값으로 고정 `RoomMetaSummaryCard`, 확인 요청 플로우 없이 자유 기록, `createPersonalMatchesAction(…, {roomId})`가 `room_id` insert) → 한 방에 방장 기록 여러 건(`RoomGamesSection`), 자유 기록 삭제 시 방은 마지막 참조 행이 사라질 때만 삭제. 자동완성에 '방 참가자' 그룹(`fetchRoomParticipantCandidates`, 최상단·클럽/전체 회원에서 중복 제외 — 방 게임 추가·모집형 수정 폼). 등록 폼 모집형은 빈 슬롯을 미리 그리지 않고 `RecruitingPlayersSection`('+ 참가자 추가', 복식은 역할 선택 메뉴, 행 '삭제')으로 연 슬롯만 렌더 — 노출 전환 시 빈 슬롯·풀 행 제거(`openSlots`·`compactEmptyRows`), 열린 슬롯·풀 행은 NTRP까지 필수(`validateRotationPool(allowEmpty)`는 최소 3명만 면제)
  - [x] 참가자 게임 등록 + 참가자 전원 기록 + 정산 시 지난 경기 (0049): 방에 참가한 회원 누구나 '게임 추가'(`canViewerAddRoomGame`), 회원 상대는 `create_room_game` RPC가 요청을 `accepted`로 만들고(방 입장 = 참여 동의, 수락 단계 없음) `materialize_accepted_request`가 회원 참가자 전원(복식 4명)에게 관점 행을 만든다. 결과는 기존 제안→확인 플로우로 확정되며 `confirm_match_result`가 4행을 동시 갱신. 로테이션 방 `finalize`도 회원 전원에게 관점 복사본(security definer 전환). `has_result`→`is_settled`(대표 게임 전부 확정 + 대기 요청·미확정 세션 없음)로 재정의하고 `splitRooms`가 '정산 완료 또는 날짜 경과 = 지난 경기'로 분리. 방 상세 게임 목록은 작성자 무관 대표 게임 한 벌 + 작성자 이름·상태 칩(`game-status.ts`)
  - [x] 미확정 로테이션 방 = 참가자 공유 자원 (0050): 방에 입장(joined)한 회원 전원의 개인 경기 기록에 '결과 입력 대기 로테이션' 카드가 뜨고(`rotation_sessions_select` 방 참가자 개방 + `fetchPendingRotationSessions` 2단 조회), **누구나 자기 기준으로 결과를 입력**한다. 빌더 앵커가 세션 소유자 → 입력자로 바뀌면서 풀도 `buildBuilderPool`(세션 풀 ∪ 방 참가자 − 나)로 파생. 입력한 세트는 즉시 확정이 아니라 게임마다 `match_requests`(accepted) + `propose_match_result`로 **제안 → 상대 대표 확인**(상대팀 전원 비회원인 게임만 즉시 확정). 부수로 primary 게임 술어를 `is_perspective` 컬럼으로 통일(방장 가정 제거), finalize가 방 세션을 지우지 않도록 바꾸고 종료를 방장 '게임 입력 종료'(`close_rotation_room`)로 분리, `group_seq`를 `max`에서 이어붙이며, 세션 삭제 시 게임이 있으면 방을 남긴다. 초대 수락도 `join_match_room_as_player`를 재사용해 풀에 자동 추가되고, NTRP가 없어도 입장이 롤백되지 않는다
  - [ ] 2차: 파트너·상대2의 결과 협상 상태 열람(`match_requests`/`negotiations` SELECT를 참가자까지 확장 — 지금은 '대표 확인 대기' 배지만), 확인 요청 허브 실 연동 시 방 게임(생성 즉시 accepted) 표시 규칙, 방 게임 카드의 목록 그룹핑(`room_id` 기준), 자유 기록 수정 폼의 노출 on/off, 방장 '닫기', 경기 타입·표면 필터, 비밀번호 시도 제한, 로테이션 빌더 풀 편집의 세션 영속 저장, 슬롯에서 빠진 회원의 stale 초대 정리, 확정 시 참가자 `personal_ntrp` 캐시 lazy 갱신
- [x] Week 26: 컬러 시스템 전면 교체 — 쿨 블루/민트 (`docs/color-system.md`, DB 변경 없음)
  - [x] `globals.css` 3계층 재작성 — L1 원시 브랜드 팔레트(`--brand-*`) → L2 시맨틱(`:root`/`.dark`) → L3 `@theme inline`. 웜 페이퍼(#f3f2ec)+라임(#c8f24e) → 쿨 그레이(#f4f7f9)/다크 네이비(#0b1319) + 블루(라이트 primary)/민트(다크 primary) 스위칭. 데드 토큰 `--chart-1~5`·`--sidebar-*` 13개 제거
  - [x] 악센트 3역할 분리 — `--X`(표면 위 텍스트, WCAG AA 4.5:1) / `--X-solid`(브랜드 비비드 채움) / `--X-foreground`. 사양 hex는 solid에 그대로, 텍스트용은 같은 hue의 대비 확보 변형
  - [x] 라임 시그니처 → 스팟 옐로우(`--spot`, #ffd166) 승계. `--accent-lime`은 `components/ui`(수정 금지) 전용 별칭으로만 잔존. 오렌지/앰버 상태 칩 21곳이 `spot`으로 흡수
  - [x] `--destructive` = `--loss` 코랄 통합 — warm 대역을 코랄(부정·위험·패배)/옐로우(주의·대기)로 정리
  - [x] 카테고리 팔레트 `--cat-1~8` 신설 — 경기 타입·코트 표면·손잡이·듀스/애드·아바타·메달을 승패 시맨틱에서 분리(`surface.ts`·`match-type-style.ts`·`avatar-color.ts`·`rank-badge`). Tailwind 팔레트 하드코딩 72건 → 0건, `dark:` 색상 분기 소멸
  - [x] `colors.test.ts` 회귀 가드 — 금지 클래스·임의값·hex 리터럴 0건 + 라이트/다크 대비율 단언 + `og/brand.ts`·`layout.tsx themeColor` 미러 드리프트 검출. `public/logo.svg`·`empty/*.svg` 브랜드 색 동기화
  - [ ] 2차: 티어 8계급 색상(`lib/rating/tier.ts`·`public/tiers/*.svg`) 리마스터 — 챌린저 `red-600`이 새 destructive 코랄과 인접
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
| `personal_matches` | 본인(user_id)만 CRUD. `set_scores` 빈 배열 = 결과 미확정(집계 제외). 행 단위 승자 컬럼 없음 — 세트 1개 = 게임 1개로 게임마다 승패(0045에서 세트 다수결 `winner` 폐기). `source_type`(direct/confirmation/rotation)으로 출처 명시. 상호확인(`source_type='confirmation'`)은 RESTRICTIVE 정책으로 수정/삭제 잠금. 참가자(opponent/partner/opponent2)는 `personal_match_participants`로 정규화. `court_name`(≤40자, 선택, 0043)은 세 출처 모두에서 채워짐. `rotation_session_id`(FK 없는 세션 tombstone id)·`group_seq`(세션 내 순번, 0044)로 로테이션 게임을 목록에서 묶음. `is_perspective`(0050) = 다른 참가자 기록에서 파생된 관점 복사본 표식 — 방의 primary 게임 판정 단일 기준 |
| `personal_match_participants` | 상위 경기(user_id)와 동일 RLS + 잠금. `{match_id, role, user_id, name, dominant_hand, ntrp_snapshot}`. 이름/회원이 있는 슬롯만 행이 생긴다(모집형은 0~3행). INSERT 트리거 `invite_room_member_from_participant`(0047)가 노출된 자유 기록의 회원 참가자를 방에 초대 |
| `match_requests` | 당사자 둘만 SELECT, requester만 취소, opponent만 거절. **생성은 `create_match_request` RPC 전용**(직접 INSERT 정책 폐지 — 복식 참가자 원자적 삽입을 위해). `set_scores`는 요청 시점 원본값(빈 배열 허용). 수락은 RPC로만. 복식 파트너/상대2는 `match_request_participants`로, 결과 협상(`result_status`/`proposed_set_scores`/`proposed_by`/`proposed_at`/`dispute_reason`)은 `match_result_negotiations`로 분리(요청 상태축과 결과협상축이 별개 테이블). `court_name`은 수락 시 양측 기록에 복사(notes는 요청자만) |
| `match_request_participants` | 당사자만 SELECT. `{request_id, role(partner/opponent2), user_id, name, dominant_hand, ntrp_snapshot}`. 쓰기는 `create_match_request` RPC 전용 |
| `match_result_negotiations` | 당사자만 SELECT(request_id 1:1). 쓰기는 `accept/propose/confirm/dispute_match_result` RPC 전용 |
| `rotation_sessions` | SELECT는 본인 **또는 방 참가자**(`is_room_participant`, 0050), INSERT/DELETE는 본인. UPDATE 정책은 없다(풀 조작은 SECURITY DEFINER 함수 전용). 로테이션 복식 선수 풀(`players` jsonb)만 보관하고, 게임은 `finalize_rotation_session` RPC(security definer)가 `personal_matches`+`personal_match_participants`로 분해한다(`notes`는 세션 소유자가 입력할 때만, `court_name`·`room_id`는 모든 게임에 상속). 통계 밖. **방 세션은 finalize가 세션을 지우지 않는다**(0050) — 참가자 여러 명이 각자 입력해야 하므로, 종료는 방장의 `close_rotation_room`이 한다. 개인 세션(room_id null)은 종전대로 finalize가 삭제. `room_id`(0046)가 있으면 경기 리스트 방 — 세션 행이 남아 있는 동안 입장자가 `players`에 자동 append(`join_match_room_as_player`, 0048; NTRP가 없으면 명단만 참가하고 풀 append는 건너뛴다, 0050) |
| `match_rooms` | 경기 리스트의 방(0046). 로그인 회원 전원 SELECT(공개 메타: 일시·타입·표면·코트명·메모·`is_settled` — 정원 `capacity`는 0048에서 제거), DELETE는 `host_user_id` 본인. INSERT/UPDATE 정책 없음 — 생성은 `create_match_room` RPC, 메타는 `personal_matches` 트리거(direct·방장만 복사), `is_settled`는 `recompute_match_room_settled`가 재계산(0049). 출처 3테이블(`personal_matches`/`match_requests`/`rotation_sessions`)의 `room_id` FK(on delete set null)가 역참조한다. `room_id`를 붙인 INSERT는 여전히 방장만 가능하고(참가자의 방 게임은 `create_room_game` RPC 전용), UPDATE는 방 참가자면 허용(`is_room_participant` — 로테이션 관점 복사본 수정). 기록 삭제 시 방은 참조 행이 하나도 남지 않을 때만 트리거가 삭제 |
| `match_room_secrets` | `room_id` 1:1 + bcrypt(pgcrypto) `password_hash`. RLS on·정책 0개 — SECURITY DEFINER RPC(`create_match_room`/`enter_match_room`/`update_match_room_password`)만 접근 |
| `match_room_members` | `{room_id, user_id, role(host/player), status(invited/joined/declined), source_role}` unique(room_id,user_id) — viewer 역할·requested 상태는 0048에서 폐지(비밀번호 입장 = `player/joined`). 전원 SELECT(id·상태만, 이름은 `get_match_room_detail` 게이트), 쓰기는 RPC·트리거 전용. 확인 요청 대표는 초대 행 없이 `accept_match_request`가 `player/joined` insert, 거절/취소는 트리거가 방 삭제. 참가자 프로필(NTRP·손잡이)은 `fetchRoomParticipantCandidates`가 users 조인으로 읽어 게임 구성 자동완성에 쓴다. `create_room_game`은 상대·복식 회원 참가자가 전부 `joined`인지 확인한다(0049) |
| `ai_coaching_cache` | 본인 통계 묶음 해시 기반 캐시 (24h) |
| `club_player_ratings` / `club_rating_history` | approved 멤버만 SELECT, 쓰기는 RPC로만. `club_rating_history.match_id`는 재설계 후에도 `match_game_matches(id)` FK 유지 |
| `club_invites` | owner만 관리, 미리보기·가입은 SECURITY DEFINER RPC로만 |

헬퍼 함수: `is_club_owner(club_id)`, `is_club_approved_member(club_id)`, `is_club_owner_or_officer(club_id)` (SECURITY DEFINER)
RPC: `create_match_game`, `update_match_game` (참가자 배열 `[{user_id,side,is_ad}]`로 단식/복식 통일 INSERT), `add_guest_player` (트랜잭션 단위)
RPC: `get_user_match_stats_v2`, `get_user_head_to_head`, `get_user_doubles_court_stats`, `get_user_partner_stats` (각 단일 함수, `p_club_id` 선택 인자로 기존 오버로드 2종 통합 — `match_game_participants` 기반 재작성)
RPC: `get_club_activity_ranking`, `get_club_win_rate_ranking`, `get_club_member_counts` (클럽 대시보드 집계, 참가자 테이블 기반)
RPC: `apply_club_rating_snapshot` (레이팅 영속화), `get_invite_preview`·`join_club_via_invite` (초대 링크)
RPC: `create_match_request` (요청 원장 + 복식 참가자 2행 원자적 생성 — 참가자 정규화로 직접 INSERT 폐지. 0043에서 `p_court_name` 인자 추가, 9인자 구버전 drop)
RPC: `accept_match_request` (상호 확인 대진 수락 — 양측 관점 personal_matches 2행 + participants + match_result_negotiations 1행 생성, 세트 없으면 양측 결과 미확정)
RPC: `propose_match_result`·`confirm_match_result`·`dispute_match_result` (match_result_negotiations에 대해 제안/확인/이의 — confirm이 양측 personal_matches의 세트를 동시 확정, 상대 행은 `invert_set_scores`로 관점 반전, 복식 애드 보존). helper `invert_set_scores`(애드 교차 반전)·`validate_set_scores`(애드 enum)·`normalize_set_scores`·`derive_public_ntrp` (`personal_match_winner` 세트 다수결은 0045에서 제거)
RPC: `finalize_rotation_session` (로테이션 세션 → 게임별 기록 분해, 한 트랜잭션. **페이로드의 기준 '나'는 세션 소유자가 아니라 호출자**(0050) — 방 세션이면 참가자 누구나 자기 기준으로 넣고, 상대팀에 회원이 있으면 `match_requests`(accepted) + `materialize_accepted_request` + `propose_match_result`로 제안→확인 경기가 되며, 상대팀 전원 비회원일 때만 즉시 확정 폴백으로 남는다. `group_seq`는 `max(group_seq)`에서 이어붙이고(세션 행 `for update` 락이 동시 저장을 직렬화) 회원 슬롯은 세션 풀 ∪ 방 참가자 ∪ 소유자 allowlist로 위조를 막는다. 개인 세션(room_id null)은 호출자=소유자 강제 + 세션 삭제로 종전 동작 유지. 0044부터 게임당 세트 배열 길이 1만 허용), `close_rotation_room(room_id)` (0050 — 방장이 게임 입력을 종료: 세션 삭제 + 정산 재계산)
RPC: `create_match_room(kind, source_id, password)` (출처 행에서 메타·초대 대상 파생, secrets 해시, host+invited 멤버, 출처 `room_id` set — `search_path = public, extensions`), `enter_match_room` (bcrypt 비교 → 내부 헬퍼 `join_match_room_as_player`: `player·joined` upsert + 미확정 로테이션이면 세션 `players` jsonb append, 권한 전부 회수), `respond_room_invite`, `update_match_room_password`, `get_match_room_detail` (멤버 게이트 후 방·방장·멤버·출처·방의 대표 게임 jsonb — 작성자·출처·결과 상태 포함, 세트 없는 게임 포함). 풀 합류 신청 RPC 3종(`request/approve/reject_room_join`)은 0048에서 drop. 트리거 `sync_match_room_from_personal_match`(insert/update/delete 3개 트리거 — 메타 복사 + 정산 재계산)·`sync_match_room_from_request`·`cleanup_match_room_on_personal_match_delete`(참조 행이 없을 때만 방 삭제)·`cleanup_match_room_on_request_close`·`invite_room_member_from_participant`(이미 참가 중인 회원은 `source_role`만 갱신). 새 RPC는 anon EXECUTE를 명시 회수(Supabase 기본 권한이 자동 부여)
RPC: `create_room_game(room_id, opponent_user_id, partner, opponent2, replace_match_id)` (0049 — 방 참가자가 만드는 방 게임: 참가 자격·상대 검증 후 `match_requests`를 `accepted`로 insert → `materialize_accepted_request` → 모집 중이던 내 seed 자유 기록 치환. **순서 고정** — seed를 먼저 지우면 cleanup 트리거가 방을 지운다), `materialize_accepted_request(request_id, rotation_session_id?, group_seq?)` (수락된 요청 → 관점 행들. `accept_match_request`에서 추출해 공용화, 방 게임이면 회원 파트너·상대2 행까지 4행. 로테이션 그룹 키는 인자로 받아 insert 시점에 심는다 — 사후 UPDATE는 방 정산 트리거를 행마다 깨운다, 0050), `copy_personal_match_perspective`·`swap_partner_perspective`(팀 안쪽 관점 반전 — `invert_set_scores`가 팀을 가로지르는 반전이라면 이쪽은 나↔파트너)·`swap_opponent_perspective`(상대팀 안쪽 반전 — 대표가 상대2라 슬롯을 스왑할 때 애드 교차, 0050)·`resolve_rotation_player`(페이로드 선수를 users에서 재해석해 위조 무력화, 0050)·`is_room_participant`·`is_active_member`·`recompute_match_room_settled` (정산 재계산). `confirm_match_result`는 방 게임의 파트너·상대2 관점 행까지 함께 확정
View: `user_match_participations` (security_invoker=on, `match_game_participants` 기반 재작성 — 4-way UNION 제거)
마이그레이션: 0001~0050 (0016부터 로컬 `supabase/migrations/*.sql`로 버전관리, 0001~0015는 MCP `apply_migration` 이력, 0039~0041이 재설계, 0042는 finalize_rotation_session RLS 잠금 결함 수정, 0043은 코트명 `court_name` 3테이블 + RPC 3종 스레딩, 0044는 로테이션 그룹 키 `rotation_session_id`·`group_seq` + 레거시 백필, 0045는 세트 다수결 `winner` 컬럼·`personal_match_winner` 제거 + RPC 3종 재정의, 0046은 경기 리스트 `match_rooms`/`match_room_secrets`/`match_room_members` + 출처 `room_id` + RPC 8종·트리거 3종, 0047은 모집형 방(`rotation_sessions.players` ≥3 완화, `invite_room_member_from_participant` 트리거), 0048은 정원 없는 방(`capacity` 컬럼·viewer/requested·합류 RPC 3종 제거, `join_match_room_as_player` 헬퍼, 게임 다건 대응 cleanup 트리거), 0049는 방 게임 상호 확인화(`create_room_game`·`materialize_accepted_request` 추출·`swap_partner_perspective`·관점 복사본, `has_result`→`is_settled` + `recompute_match_room_settled`, finalize security definer 전환, `personal_matches_update` RLS 참가자 완화), 0050은 미확정 로테이션 방의 참가자 공유화(`personal_matches.is_perspective` + primary 술어 통일, finalize 앵커를 호출자로·제안→확인 경로·세션 보존, `close_rotation_room`, `rotation_sessions_select` 방 참가자 개방, `respond_room_invite`가 풀 append 재사용, `ntrp_missing` 입장 롤백 완화))

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
| **로테이션 복식 / 로테이션 세션** | 4명 이상 파트너 교대(아메리칸) 복식. 등록 시 선수 풀만 `rotation_sessions`(세션)에 저장하고, 카드 '결과 입력' 게임 빌더에서 게임(파트너·상대1·상대2 + 스코어 1줄)을 구성하면 게임별 개인 경기 레코드로 분해 저장(`rotation_session_id`·`group_seq`로 목록에서 한 묶음). 상호 확인 없음(자유 기록) |
| **게임(세트)** | 동호인 경기는 세트 1개 = 게임 1개. DB `set_scores` 배열 원소 하나가 게임 하나이며 통계·레이팅·월별 전적·카드 표시 모두 게임 단위(`resolveSetWinner`·`tallySets`). 행 단위 승자(세트 다수결)는 없다 — 0045에서 `winner` 컬럼·`personal_match_winner`·`resolveMatchWinner` 폐기. UI 용어는 '게임'(코드 식별자 `setScores`·`validateSetScores`는 유지) |
| **확인 요청 / 상호 확인 경기** | 회원 간 단식·페어 고정 복식 대진 요청(`match_requests`, pending→accepted/rejected/canceled — 생성은 `create_match_request` RPC 전용). 복식은 상대팀 회원 1명이 **대표 확인자**(`opponent_user_id`, 상대1→상대2 순 회원 자동 선택·슬롯 스왑), 파트너/상대2는 `match_request_participants`. 수락 시 요청자/대표 관점 `personal_matches` 2행 생성(`source_type='confirmation'`, `source_request_id` 표식, 수정/삭제 잠금) — 파트너·상대2가 회원이어도 그들 기록에는 생성하지 않음 |
| **코트명 / 경기 시각** | `court_name`(선택, ≤40자, 자유 텍스트) — 대진표 `match_game_courts.label`과 별개. 등록 폼에서 본인 과거 코트명을 '최근 코트'로 재선택. 경기 시각(`played_time`)은 시 단위만 입력(`HH:00` 저장, 카드에 'N시' 표시) |
| **결과 미확정** | `personal_matches.set_scores`가 빈 배열(`hasResult` false) — 게임 스코어 없이 등록된 개인 경기. 카드에 '미확정' 배지, 통계·레이팅·AI 코칭 집계에서 제외(`explodePersonalMatchSets`). 카드 '결과 입력' 팝업에서 게임 스코어가 등록되면 확정 |
| **경기 리스트 / 경기 방** | 개인 경기 등록 폼에서 '리스트에 노출'을 켠 기록이 방(`match_rooms`) 1개가 된다. 로그인 회원 전원이 목록(자동 제목 = 일시·코트명·경기 타입, 방장, '참가 N명')을 보고, **비밀번호**(4~20자, `match_room_secrets`에 bcrypt)를 아는 회원만 상세(참가자·메모·게임)에 **입장**(= 참가, 재입장 시 생략). **정원은 없다**(0048) — 단식 방에 4명이 들어와 단식을 돌아가며 칠 수도 있다. 방 제목 필드 없음. 방 삭제('리스트에서 내리기')는 기록을 남기고 `room_id`만 푼다. 목록의 예정/지난 분리는 `is_settled`(정산 완료) 또는 날짜 경과 기준이다(0049) |
| **방 게임** | 방에 참가한 회원이 함께 친 게임을 올린 기록(0048 도입, 0049에서 참가자 전원 개방). 방 상세 '게임 추가' → 등록 폼(`?room=`, 메타는 방 값으로 고정, 자동완성 최상단 '방 참가자')에서 참가자만 입력한다. 상대가 회원이면 **상호 확인 게임**(`create_room_game`)이 되어 회원 참가자 전원(복식은 4명)의 기록에 미확정으로 남고, 결과는 한쪽이 제안하고 상대 대표가 확인하면 동시에 확정된다 — 방 입장이 곧 참여 동의라 요청 수락 단계는 없다. 비회원 상대는 방장만 자유 기록으로 남길 수 있다. 최초 노출 기록(모집 중)은 수정 폼('참가자 채우기')에서 채우며, 회원으로 채우면 그 seed는 상호 확인 게임으로 치환된다. 미확정 로테이션 방은 게임 빌더가 담당 — 입장자가 풀에 자동 추가되고, 방에 참가한 회원 누구나 개인 경기 기록의 '결과 입력 대기 로테이션' 카드에서 **자기 기준으로** 게임을 넣는다. 상대팀에 회원이 있으면 그 게임도 제안→확인을 거치고, 전원 비회원인 게임만 즉시 확정된다(0050) |
| **모집 중 경기** | 리스트에 노출하면서 참가자를 비워 둔 기록(0047). 카드 배지 '모집 중'(`isRecruiting`), 결과 입력 불가. 참가자를 비울 수 있는 조건은 **신규 등록 + 노출** 또는 **노출된 기록 + 결과 없음** — "세트가 있는 기록은 라인업이 완성돼 있다"가 통계 집계의 불변식이다. 폼은 빈 슬롯을 미리 그리지 않고 '+ 참가자 추가'로 연 슬롯만 보여 주며(복식은 역할 선택), 연 슬롯은 NTRP까지 필수 |
| **관점 행 / 정산(is_settled)** | `room_id`가 있는 기록은 회원 참가자 **전원**에게 각자 관점의 `personal_matches` 행이 생긴다(0049). 관점 변환은 대표=`invert_set_scores`(팀 가로지르기), 파트너=`swap_partner_perspective`(나↔파트너), 상대2=둘의 합성이며 참가자 슬롯도 함께 재배치된다. 방 상세 게임 목록은 중복을 피해 **대표 게임 한 벌**만 보여준다 — 판정 기준은 `is_perspective = false`(0050, 종전의 '로테이션은 방장 행' 가정을 대체한다. 앵커가 입력자로 바뀌어 방장이 아닌 원본 행이 생기기 때문). `match_rooms.is_settled` = 대표 게임이 1건 이상이고 전부 확정 + 대기 중인 요청·미확정 로테이션 세션 없음 |
| **방 초대 / 참가** | 기록에 입력된 회원(단식 상대·복식 파트너/상대2·로테이션 풀)은 방 생성 시 `player/invited`로 자동 초대되고, 확인 요청 허브 '경기 리스트 초대'에서 수락하면 `joined`(참가). 확인 요청 대표는 초대 행 없이 요청 수락(`accept_match_request`)이 곧 참가. **비밀번호 입장자도 곧바로 참가**(`player/joined`, 0048) — 미확정 로테이션 방이면 `rotation_sessions.players`에도 추가된다(합류 신청·승인 없음) |
| **결과 제안 / 확인** | 상호 확인 경기의 사후 결과 등록. `match_result_negotiations.result_status`(request_id 1:1): none → proposed(한쪽이 세트 제안, 요청자 관점으로 정규화 저장) → confirmed(상대 확인 → 양측 `personal_matches` 확정) \| disputed(이의 제기 + 사유, 양측 누구든 재제안). 제안자 본인은 확인 불가, 제안 수정만 가능 |

## 코딩 규칙

### 기본 원칙
- 모든 파일은 TypeScript 사용. `any` 타입 절대 금지
- 컴포넌트는 반드시 named export 사용 (default export 금지)
- 파일명은 kebab-case (예: `club-card.tsx`)
- 컴포넌트명은 PascalCase (예: `ClubCard`)
- 함수명은 camelCase (예: `getClubById`)
- 폰트 사이즈는 시맨틱 토큰만 사용: `text-display` `text-h1`~`text-h4` `text-body` `text-body2` `text-caption` (+ 배지·카운트 전용 예외 `text-micro`). `text-sm`·`text-xs`·`text-[13px]` 같은 Tailwind 기본 사이즈·임의값 금지. 굵기·색상은 `lib/dashboard/tokens.ts`의 `TYPO`로 조합 (규칙·판정 기준: `docs/typography.md`)
- 색상은 시맨틱 토큰만 사용: 베이스(`background`/`foreground`/`card`/`muted`/`border`/`input`/`ring`), 액션·상태(`primary`/`info`/`win`/`loss`/`destructive`/`spot` + 각 `-solid`·`-foreground` 변형), 분류(`cat-1`~`cat-8`). `bg-emerald-500`·`text-orange-600` 같은 Tailwind 기본 팔레트, `bg-[#118AB2]` 임의값, 새 `dark:` 색상 분기 금지 (규칙·판정 기준: `docs/color-system.md`)
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
- 시맨틱 컬러 토큰 외 색상 클래스(`bg-sky-500`/`text-amber-600`/`bg-[#hex]`) 및 `globals.css` 밖 hex 정의 금지 (components/ui·`lib/rating/tier.ts`·`lib/og/brand.ts`·`app/layout.tsx` 미러 제외)

## 작업 완료 후 체크리스트
- [ ] TypeScript 에러 없음 (`npx tsc --noEmit`)
- [ ] 린트 통과 (`npm run lint`)
- [ ] 빌드 성공 (`npm run build`)
- [ ] git commit (conventional commits 형식)
