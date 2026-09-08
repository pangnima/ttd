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
│   │   │   ├── personal-matches/ # 개인 경기 결과(확정 전적) 목록 + 등록/수정
│   │   │   └── match-requests/   # 경기 확인 요청 허브 = 미확정 전량의 작업 큐 (2단 탭: 승인 요청[초대/경기 결과 확정/이의 신청] · 상대 승인 대기 — 한 행은 한 자리에만)
│   │   ├── match-rooms/          # 매칭 리스트 (진행 중/내가 참여한/종료된 3탭, [roomId] 매칭 룸 상세 = 비밀번호 게이트(입장=참가) → 참가자·게임·룸 안 결과 입력)
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
│   ├── personal-matches/         # 개인 경기 입력·목록 (PersonalMatchForm = use-personal-match-form-state + use-personal-match-submit 조립, PlayerPicker(필드별 전체 회원 검색 내장)+PlayerAutocomplete, CourtNameAutocomplete 코트명 '최근 코트' 재선택, PersonalMatchCard(게임 1건 카드 — 배지·색 바는 result-badge 단일 출처) + MatchGroupList/MatchGroupHeader(로테이션 세션·멀티 게임 경기를 일시·코트명·참여 멤버·전적 헤더 행으로 감싸고 게임마다 카드 1장) + SetScoreChips/GameScoreChips(게임 스코어 칩 — 승·패·무 3색) + MatchDateColumn/MatchMetaLine(시각·코트명·메모) 카드 공용 조각, MatchActions(확정 카드 = 잠금 배지/수정·삭제) + FreeResultEntryButton·MutualResultActions(미확정 액션 — 허브·룸이 공용), ReentryContextBadge 이의 후 재입력 맥락 배지(카드·룸 공용, 0062), MatchResultDialog 결과 입력·검토 팝업(복식 애드 포함) + use-set-scores/use-result-dialog 훅, RotationSessionCard(참여 진행도·응답 대기/거절 명단 포함) + RotationGamesDialog 로테이션 게임 빌더 팝업(게임당 스코어 1줄), rotation/ 풀·게임 입력, SaveOutcomeNotice 저장 결과 안내(대표 없는 갈래) 등)
│   ├── match-requests/           # 확인 요청 허브 (HubTabBars 2단 탭 바 + InvitePanel/ResultPanel/DisputePanel(승인 요청의 하위 3탭)/WaitingPanel(→ WaitingRequestGroup 참여 요청 3섹션 + WaitingResultGroup 경기 결과 5섹션 — 이의 대기 둘 포함, Week 38), ParticipationSection 참여 확인 섹션, PendingMatchSection 미확정 행 섹션(buildMatchGroups로 로테이션 세션 묶음 + '게임 N' 순번 — 패널 공용), QueueSection 섹션 껍데기(unboxed — count는 반드시 실제 카드 수, attention = '승인 필요' 필), HubSectionGroup 탭 안 축 그룹 헤딩(count 0이어도 children은 감추지 않는다), PendingMatchActions 버킷→액션 디스패처, QueueSummaryBanner 개인 결과 화면 배너, Received/SentRequestCard, AwaitingMemberRequestCard 남은 회원 대기 카드, RotationRequestGroupCard 세션 단위 일괄 수락, RequestAcceptanceNote 진행도 배지(SeatProgressBadge = 요청·세션 공용)·안내 문구, RoomInviteCard 매칭 룸 초대, RotationSessionInviteCard 로테이션 일정 초대(0057, readOnly로 상대 대기 겸용), RequestTeamLine, 상태 뱃지)
│   ├── match-rooms/              # 매칭 리스트/룸: MatchRoomCard 목록 행 + RoomListSection(탭별 목록·빈 상태), RoomPasswordGate 비밀번호 입장, RoomDetailHeader, RoomMembersSection+RoomMemberRow 참가자 명단(방장/참가/초대 대기/비회원), RoomGamesSection+RoomGameRow 방의 대표 게임 목록(뷰어 관점 팀 라인·상태 칩) + RoomGameActions(룸 안 상호 확인 결과 입력·확인·이의) + RoomFreeGameActions(자유 기록 갈래 분리, 0062) + RoomGameDialog(룸 안 게임 추가 폼 팝업) + RoomRotationBuilder(미확정 로테이션 게임 빌더), RoomHostActions 비밀번호 변경·게임 입력 종료·매칭 리스트에서 내리기, RoomInviteBanner 초대 응답, RoomLink 카드→룸 링크
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
│   │   ├── match-requests.ts     # 확인 요청 생성/취소/거절(reject RPC)/수락 + 참가자 참여 응답(respond_request_participation)·로테이션 세션 일괄 응답(respond_rotation_participation)
│   │   ├── match-results.ts      # 상호 확인 경기 결과 제안/확인/이의 (RPC 3종)
│   │   ├── rotation-sessions.ts  # 로테이션 복식 세션 생성/삭제/확정(finalize RPC → 게임별 분해)
│   │   ├── match-rooms.ts        # 매칭 룸 입장(비밀번호 = 참가)·초대 응답·비밀번호 변경·리스트에서 내리기 + createRoomGameAction(방 게임 등록, create_room_game RPC — 0049). 비회원 상대 방 게임만 personal-matches.ts createPersonalMatchesAction(…, {roomId})
│   │   ├── profile.ts
│   │   ├── ratings.ts            # 클럽 레이팅 재계산 트리거
│   │   └── ai-coaching.ts
│   ├── queries/                  # Supabase read-only 쿼리
│   │   ├── _shared.ts            # buildUserMap 등 공용 헬퍼
│   │   ├── clubs.ts              # 클럽 조회 + 초대 미리보기(get_invite_preview)
│   │   ├── match-games.ts
│   │   ├── personal-matches.ts
│   │   ├── match-requests.ts     # fetchMyMatchRequests — 내가 당사자인 요청 전량 1회 조회(pending/종료 분류는 조립 계층)
│   │   ├── match-queue.ts        # fetchMatchQueue(React cache) — 확인 요청 허브·개인 결과 배너·사이드바 뱃지의 단일 소스(미확정 personal_matches + 요청 + 방 초대 + 로테이션 세션 2웨이브 조립)
│   │   ├── rotation-sessions.ts  # 결과 입력 대기 로테이션 세션 조회(내 세션 ∪ 참가 방 세션 .or 1회, 방 단건)
│   │   ├── match-rooms.ts        # 매칭 리스트 탭별 서버 필터·커서 페이지(fetchRoomPage/fetchMyRoomIds/fetchOpenRoomCount, ROOM_PAGE_SIZE)·게이트용 요약·상세(get_match_room_detail RPC → parse-detail)·방 멤버십(초대+joined 1회)·참가자 후보(단건/배치)·방 게임 협상 상태(fetchRoomGameConfirmations)
│   │   ├── player-profile.ts     # fetchPlayerStatsBundle (타인 프로필용)
│   │   ├── analytics.ts          # fetchAnalyticsBundle (본인 분석용)
│   │   ├── club-dashboard.ts     # 클럽 운영 쿼리 (에이스·활동/승률 랭킹 등)
│   │   ├── ratings.ts            # 클럽 레이팅 랭킹·이력·재계산 입력 쿼리
│   │   ├── stats.ts              # RPC 호출 (get_user_match_stats, get_user_head_to_head)
│   │   └── users.ts              # mapUserRow 공용 매퍼 (is_guest·personal_ntrp·deleted_at 포함)
│   ├── analytics/                # 순수 함수 집계 모듈 (DB 접근 없음, vitest 테스트 다수). match-type.ts의 toQuadStats가 AnalyticsBundle.stats 형태 단일 출처
│   ├── redesign-fixtures/        # [임시] 정적 UI/목업 단계 더미 데이터 — 실 쿼리 호출부 대체 (clubs/match-games만 잔존). 개인 경기·확인 요청·개인 통계·레이팅은 실 쿼리로 복원 완료(personal-matches·match-requests·personal-analytics*·ratings·_scenario 픽스처 제거). 클럽·대진표도 실 연동 복원 시 제거
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
│   ├── match-requests/           # hub-totals.ts — 탭 배지·섹션 헤더·빈 상태의 '목록 건수'(알림인 myTurnTotal과 별개, 0064 이후: hubTabTotals/hubTabMyTurn/hubTabHasMyTurn 하위 4자리, hubTopTotals/hubTopHasMyTurn 최상위 2탭, firstMyTurnTab 배너 착지, waitingGroupTotals) / queue.ts — 미확정 경기 1행 → 작업 큐 버킷(confirmResult/enterResult/fillLineup/awaitingCounterpart + 이의 버킷 reenterResult/awaitingReentry, 0061 + reentryReview/awaitingReentryConfirm, 0062) + inviteMyTurn/resultMyTurn/disputeMyTurnTotal(하위 탭별 내 차례)·myTurnTotal(= 셋의 합, 뱃지) / tabs.ts — 허브 2단 탭 메타(HubTab invite/result/dispute/waiting 평면 4키 + HUB_TOP_TABS mine/waiting·HUB_SUB_TABS·hubTopOf·resolveHubTab의 레거시 폴백 mine→invite, settle→result, disputed→dispute·hubTabHref — 옛 URL 보존) / participants.ts — 요청 좌석 규칙(0056: requiresAllMembers 방 안팎 경계, classifyPendingRequest respond/mine/awaitMembers 레인, viewerSideOf 반전 부호, acceptanceProgress 진행도, groupRotationRequests 세션 묶음) (둘 다 순수, vitest)
│   ├── personal-matches/         # 개인 경기 매핑·세트 분해·승자 판정·로테이션 복식·상대 자동완성 후보
│   │   ├── lineup.ts             # 라인업 판정 (0047) — isSlotEmpty/isSlotOk(모집형에서 닫힌 슬롯만 비움 허용 — 열린 슬롯은 NTRP까지 필수), isLineupComplete(+ByRoles), isRecruiting. 폼 검증·결과 입력 차단·카드 배지 단일 출처
│   │   ├── map.ts / explode.ts / grouping.ts / winner.ts   # explode가 결과 미확정(세트 없음, hasResult) 제외의 단일 초크포인트(통계·레이팅 입력 = SettledPersonalMatch 분해본). winner.ts hasResult·resolveSetWinner·tallySets = 게임 단위 승패 규칙(행 단위 승자 없음)
│   │   ├── match-groups.ts       # buildMatchGroups — 목록 표시 그룹(rotation 세션 묶음 / multi 멀티 게임 1행 → 게임 카드 N장 / record 게임 1개). splitGameCards가 표시 전용 분해, sourceMatch가 액션 기준 원본 행. 통계용 explode와 분리
│   │   ├── player-suggestions.ts # 상대 자동완성 그룹(만나본 사람/클럽 회원/전체 회원) 순수 빌더
│   │   ├── confirmation.ts       # match_requests 행 → viewer 관점 PersonalMatchConfirmation (perspective.ts 반전 재사용) + bystanderWaitingBadge(파트너·상대2 대기 배지 문구, 0052) + canReopenResult(확정 결과 정정 자격, 0055)
│   │   ├── perspective.ts        # invertSetScores — me/opp 스왑 + 복식 애드 교차 반전 (DB invert_set_scores와 동일 규칙)
│   │   ├── confirm-flow.ts       # resolveConfirmRep — 상대팀 회원 1명 대표 확인자 결정(상대1→상대2, 슬롯 스왑) + resolveSaveOutcome(저장이 실제로 하는 일 5갈래 — 대표 없는 갈래의 부정 안내 단일 출처, 0057)
│   │   ├── labels.ts             # formatTeams/formatOpponents/buildAdLabels (카드·Dialog·요청 카드 공용 라벨)
│   │   ├── validate-input.ts     # PersonalMatchInput 검증(skipNtrpFor 필드별, 파트너 NTRP도 필수, allowMissingPlayers = 모집형·세트 없을 때만 참가자 생략) + validateCourtName(≤40자) + validateSetScores (DB validate_set_scores와 동일 규칙)
│   │   ├── rotation-pool.ts      # buildBuilderPool — 빌더 풀 = 세션 풀 ∪ 방 참가자(joined) ∪ 소유자 − 나 (앵커=입력자, 0050)
│   │   ├── rotation-rep.ts       # resolveRotationRep — 방 로테이션 게임의 상대팀 대표 결정(상대1→상대2, 없으면 즉시 확정). SQL finalize·confirm-flow와 같은 규칙
│   │   ├── rotation.ts           # 로테이션 복식 — 풀/게임 검증 분리(validateRotationPool({allowEmpty})/Games), isPoolRowEmpty·compactPool(빈 행 제거), 세션 players 직렬화, finalize 페이로드
│   │   ├── rotation-participation.ts # 세션(일정) 참여 동의 규칙 (0057~0058, vitest) — requiresSessionConsent(방 밖만), canEnterRotationResult(= DB finalize 진입 가드의 앱쪽 거울), classifyRotationSession(respond/enter/awaitOwner/none), canManageRotationPool(초대 자격 = 방 밖 세션의 소유자∪수락자, DB add_rotation_session_player의 거울), poolMemberIds(서버 명부 ↔ 빌더 로컬 행을 가르는 기준), pendingSeats·rejectedSeats
│   │   ├── rotation-entered.ts   # 세션에 내가 이미 넣은 게임 (0063, vitest) — buildEnteredGames가 두 출처(personal_matches + 미수락 회원이 낀 게임의 match_requests·협상 제안값)를 한 목록으로 접는다. enteredBadgeLabel·awaitingConsentNote·enteredGameLine/Label = 카드 배지·빌더 '이미 입력한 게임'의 단일 출처
│   │   ├── schedule-conflict.ts  # findScheduleConflicts — 같은 날짜·시각 중복 일정 경고(시 단위 정확 일치, 저장은 막지 않음, 0057, vitest)
│   │   └── validators.ts
│   ├── match-rooms/              # 매칭 리스트(매칭 룸) 순수 함수 + server-only 헬퍼 (0046·0048·0049)
│   │   ├── password.ts           # validateRoomPassword(4~20자·공백 금지) + RoomListingInput 타입 (클라·액션 공용, RPC와 3중 방어)
│   │   ├── title.ts / split.ts / headcount.ts / members-view.ts   # 자동 제목(일시·코트명·타입) / 진행·종료 기준 날짜(todayIsoKst — 분리 자체는 서버 필터로 이관) / 참가 인원('참가 N명', 정원 없음)·상태 칩 / 상세 명단 행 빌더 (vitest)
│   │   ├── parse-detail.ts       # get_match_room_detail jsonb → MatchRoomDetail 런타임 가드 파서
│   │   ├── room-context.ts       # RoomGameContext(방 게임 추가 폼 컨텍스트: 방 메타 고정 + 참가자 후보 + viewerIsHost) + canAddRoomGame(출처만 판정 — 단독 사용 금지) + canViewerAddRoomGame(방 참가자면 추가 가능) + buildRoomGameContext
│   │   ├── game-status.ts        # 방 상세 게임 행 표시 규칙 (roomGameStatusLabel 상태 칩·canEditRoomGame 작성자 수정·isRoomGameParty 배지 표시·roomGamesEmptyMessage, vitest)
│   │   ├── game-labels.ts        # buildRoomGameLabels — 방 게임 참가자 → 뷰어 관점 팀 라벨(작성자/상대팀/작성자 파트너 3관점) + buildRoomGameLine·buildRoomGameSets(행의 팀 라인·스코어를 같은 관점으로 — '나'는 당사자에게만, 상대팀이면 스코어도 반전, vitest)
│   │   ├── tabs.ts               # 매칭 리스트 3탭 메타 + resolveRoomListTab(레거시 upcoming·미지의 값 → open 폴백) + roomListHref(탭·커서 → URL, vitest)
│   │   ├── room-cursor.ts        # 커서 페이지네이션 keyset `(played_at, played_time, id)` — encode/parse(형식 검증이 곧 필터 주입 방어) + roomKeysetFilter(PostgREST or() 술어, asc=NULLS FIRST / desc=NULLS LAST, vitest)
│   │   ├── revalidate.ts         # revalidateRoomPaths — 방을 건드린 액션의 캐시 무효화 단일 출처 (server-only)
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
│   ├── nav-items.ts              # 사이드바 네비게이션 (topNavItems: 사용 가이드 / buildPersonalNavItem: '개인' 단일 메뉴 / myMatchNavItems: 생애 순서 = 매칭 리스트 → 경기 확인 요청 → 개인 경기 결과 / clubNavItems: 클럽 찾기)
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
  ├── 본인: 개인/클럽/통합 3탭 스캐폴드(ProfileScopeTabs — 현재 개인만 동작, scope 미지정=personal) + 심층 분석 풀버전 + AI 코칭 (실 쿼리 `fetchAnalyticsBundle`)
  └── 타인: 공개 통계 요약 (프라이버시 설정 반영)
/profile/settings → 내 정보 수정
/me/analytics → /profile/[내id]?scope=personal 리다이렉트
/me/personal-matches → 개인 경기 결과 (확정 전적만, 상단에 미확정 요약 배너)
/me/personal-matches/new → 개인 경기 추가 (세트 없이 결과 미확정으로 저장, 회원 상대 단식은 확인 요청 플로우로 전환)
/me/personal-matches/[id]/edit → 개인 경기 수정 (상호 확인 경기는 진입 차단, 기존 세트는 보존)
/me/match-requests → 경기 확인 요청 허브 (미확정 전량의 작업 큐 — 2단 탭. 최상위 「승인 요청」(내 차례) / 「상대 승인 대기」(?tab=waiting), 승인 요청 안 하위 「초대」(기본) / 「경기 결과 확정」(?tab=result) / 「이의 신청」(?tab=dispute). 옛 키 mine·settle·disputed는 각각 초대·경기 결과 확정·이의 신청으로 폴백. 한 행은 정확히 한 자리에만 나온다)
/match-rooms → 매칭 리스트 (진행 중 기본 / ?tab=mine 내가 참여한 / ?tab=past 종료된)
/match-rooms/[roomId] → 매칭 룸 상세 (참가자·메모·게임 + 룸 안에서 게임 추가·결과 입력·확인·로테이션 빌더까지 완결, 미입장자는 공개 메타 + 비밀번호 게이트)
/me/personal-matches/new?room=[roomId] → /match-rooms/[roomId] 리다이렉트 (방 게임 입력은 룸 안 다이얼로그로 이관)
/guide → 신규 사용자 사용 가이드 (정적, 개인 경기 1순위)
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
- [x] Week 25: 매칭 리스트(매칭 룸) — 사이드바 메뉴 신설 (0046 마이그레이션)
  - [x] 개인 경기 등록 폼 '리스트에 노출' 토글 + 비밀번호(4~20자) — 신규 등록 3갈래(자유 기록/확인 요청/로테이션) 모두 출처 저장 후 `create_match_room` RPC로 방 생성(`lib/match-rooms/create-room.ts`), 폼 좌/우 열을 `who-column`/`when-column`으로 분리
  - [x] `match_rooms`(공개 메타 전원 SELECT) + `match_room_secrets`(정책 0개, pgcrypto 해시) + `match_room_members`(host/player/viewer × invited/joined/declined/requested), 출처 3테이블 `room_id` FK, 트리거로 메타·`has_result` 동기화 및 거절/삭제 시 방 정리
  - [x] 기록에 입력된 회원 전원 자동 초대(확인 요청 대표는 `accept_match_request`가 곧바로 참가), 확인 요청 허브 받은 탭 '매칭 리스트 초대' 섹션 + 사이드바/모바일 뱃지 합산(모바일 nav 중복 클라이언트 쿼리 제거 → props)
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
- [x] Week 38: 확인 요청 허브 2단 탭 재편 + 승인 악센트 + 잔여 갭 봉합 (마이그레이션 없음)
  - [x] **요구 6개 대조 — DB·앱 규칙은 전부 0056~0064에 있었다** — 초대 전원 수락 시에만 입력(0064 `session_seats_pending`·`hasUnansweredSeats` / 페어 고정·단식 `request_not_accepted` + `maybe_materialize_request`), 게스트 무조건 동의(0056 트리거), 참여자 누구나 결과 등록(0059 좌석 넷·0057 수락 좌석), 동시 입력 방지(`result_already_proposed`·`p_expected_seq`), 이의 전원·이의 후 전원 재확정(0059·0060, 새 게임도 propose→전원 confirm). 실제 갭은 셋이었다: 페어 고정 복식의 미응답자 게스트 대체 경로 없음 / 이미 확인한 좌석의 [이의]가 UI에만 없음(DB는 허용) / 동시 입력 충돌 뒤 새로고침을 사용자에게 요구
  - [x] **2단 탭** — 최상위 「승인 요청」/「상대 승인 대기」(차례 축), 승인 요청 안 「초대 / 경기 결과 확정 / 이의 신청」(생애 축). `HubTab`은 평면 4키(`invite`/`result`/`dispute`/`waiting`)를 유지해 `?tab=`이 한 자리를 곧바로 가리키고, 옛 키 `mine`·`settle`·`disputed`는 폴백(매칭 리스트 tabs.ts 관용구). 버킷 8종·`classifyPendingMatch`·`myTurnTotal` **값 무변경** → 사이드바 뱃지 총량 불변. 사용자 결정: 결과 입력 대기·참가자 채우기는 승인 요청 › 경기 결과 확정(개인 경기 결과 목록에 미확정을 되살리는 안 기각)
  - [x] **0062 규칙 반전** — "이의를 거친 경기는 확정까지 「이의 처리」 탭"을 철회하고 탭은 차례 축을 따른다(이의 대기 둘은 「상대 승인 대기 › 경기 결과」). 이의 맥락은 카드 배지(`ReentryContextBadge`·`DisputeReasonLine`)와 데이터(`dispute_count`·`disputed_by`·사유)가 그대로 보존한다 — 잃는 것은 '한 탭에 모임'뿐이고, 얻는 것은 "승인 요청 = 내가 승인할 것"의 순수성. 이의 대기는 이의자 여부로 섹션을 나누지 않는다(3→2섹션, 카드 배지가 말한다)
  - [x] **숫자** — `hubTabTotals`/`hubTabMyTurn`/`hubTabHasMyTurn`(하위 4자리) + `hubTopTotals`/`hubTopHasMyTurn`(최상위) + `firstMyTurnTab`(배너 착지). 새 항등식 "뱃지 = `inviteMyTurn + resultMyTurn + disputeMyTurnTotal`"과 "`waitingGroupTotals` 합 = `hubTabTotals.waiting`"(두 출처 일치)을 테스트로 고정. `disputeTotal`·`disputedGroupTotals`·`mineTabTotal`·`settleTabTotal` 삭제. 배너 조각은 하위 탭 라벨 그대로('초대 N건 · 경기 결과 확정 N건 · 이의 신청 N건'). **부수 버그**: 개인 결과 페이지 `pendingTotal`이 settle 탭을 빠뜨리고 있었다 → `hubTopTotals`
  - [x] **악센트** — 섹션 단위가 정확하다(섹션은 버킷 단위로 균질). `QueueSection attention` → '승인 필요' 필(`ATTENTION_PILL` = spot). 박스 테두리 토큰은 만들지 않았다 — `PendingMatchSection`이 unboxed라 4개 중 3개 섹션에 닿지 않는다. `page.tsx`는 `HubTabBars`(2단 LinkTabs)와 `fetchRotationBuilderContext`(빌더 풀 파생 이동)로 100줄 이내, `waiting-panel.tsx`(150줄)는 `WaitingRequestGroup`/`WaitingResultGroup`으로 분할
  - [x] **동시 입력 stale** — `ActionResult.stale`(`result_already_proposed`·`result_not_proposed`·`result_already_confirmed(_by_seat)`·`negotiation_not_found`·`session_games_changed`)을 `useResultDialog.run`이 받아 팝업을 **열어 둔 채** `router.refresh()`. open은 카드가 소유하므로 카드 분기가 propose→review로 바뀌면 같은 팝업이 검토 모드로 전환되고, 로테이션 빌더는 '등록된 게임'이 늘어난다. 닫으면 입력이 왜 사라졌는지 알 수 없어 열어 둔다. **결함 2건 동반 수정**: `RESULT_ERROR_MESSAGES`가 `includes` 선형 탐색이라 `result_already_confirmed`가 `…_by_seat`를 가렸다 → 키 길이 내림차순 정렬(추가 순서 무관), `negotiation_not_found` 매핑 누락 추가
  - [x] **확인한 좌석의 [이의 제기]** — 순수 함수 `canDisputeProposal`(proposed ∧ 좌석 ∧ 제안자 아님 — DB dispute RPC의 거울, `confirmed_by`를 보지 않는다) + 공유 컴포넌트 `ConfirmedSeatActions`(개인 경기 카드·룸 행의 동형 분기 통합). `NegotiationDialog`는 `canDisputeProposal`로 검토 모드에 들어가고 `confirmable = canRespondToProposal`을 `ResultReviewPanel`에 넘겨 확인 버튼 없이 이의만 받는다
  - [x] **페어 고정 복식·단식의 게스트 재요청**(RPC 0개) — 요청은 불변이라 [게스트로 바꿔 다시 요청]이 취소 후 `/me/personal-matches/new?from=<id>`로 보내고, `fetchMatchRequestById`(요청자 본인 ∧ **canceled**만 — pending을 허용하면 0056 pending 중복 유니크에 걸린다)로 읽은 요청을 순수 함수 `prefillFromRequest`(vitest)가 초안으로 만든다. 미응답·거절 좌석은 `userId`를 떼어 게스트(로테이션 `guestOf`와 같은 규칙), 대표의 프로필은 요청 행에 없어 이름만 채우고 NTRP는 사용자가 넣는다. 버튼 조건 `canReissueAsGuest`(방 밖 pending ∧ 미수락 회원 좌석). ⚠ `PersonalMatchForm.initialData`는 **수정 모드 스위치**라 새 prop `prefill?: Partial<PersonalMatch>`를 뚫었다 — `isEdit`·`seedFill`·update 제출은 `initialData`만 보고, 복식 초안은 `doublesMode='fixed'`로 연다(로테이션으로 열면 채운 슬롯이 보이지 않는다)
  - [x] 검증 — `npx vitest run`(592)·`npx tsc --noEmit`·`npm run lint`·`npm run build` 통과. 마이그레이션 없음(롤백 스모크 불필요)
  - [ ] 잔여: 브라우저 엔드투엔드 수동 검증(계정 3~4개 — 레거시 `?tab=settle`·`?tab=disputed` 폴백 / 하위 탭 배지·강조 / 이의 후 재입력 카드가 「상대 승인 대기」에서 배지로 맥락 표시 / 동시 제안 충돌 → 팝업이 검토 모드로 전환 / 확인한 좌석의 [이의 제기] / 페어 고정 [게스트로 바꿔 다시 요청] 프리필). `mutual-result-actions.tsx`(115줄)·`room-game-actions.tsx`(138줄)는 여전히 100줄 초과 — 상단 분기(폴백·잠금·disputed)의 추가 추출은 별건
- [x] Week 37: 로테이션 결과 입력의 「전원 수락」 게이트 + 진행 상황 명단화 (0064 마이그레이션)
  - [x] **요구 6개 중 3개는 이미 있었다** — 게스트 자동 동의(0056 트리거 + 확인 분모가 활성 회원 좌석), 결과 만장일치·입력자 자동 동의(0060 `confirmed_by`), 이의 탭 라우팅(0061·0062). 실제 작업은 (2) 전원 수락 게이트·중복 등록 방어와 (4)(6) "누가 수락/확인했는가" 표시 셋이다
  - [x] **선입력 철회 — 0063 결정의 반전** — 0057이 만든 '수락을 기다리지 않고 결과 먼저 입력'을 걷어냈다. 0063은 이것을 의도적 설계라 판정했고 **데이터 정합 관점에서는 옳았다**(미수락 좌석이 낀 게임은 `personal_matches` 0행 + 협상 `proposed` 선적립이라 0056 불변식을 지킨다). 철회 이유는 **사용자가 본 화면**이다 — 미수락 상태로 입력하면 상대에게 「일정 초대」와 「게임 참여 확인」이 잇따라 도착해 같은 경기를 두 번 승인하는 것처럼 보인다. 0063은 그 중복을 허브 상류에서 걷어내 증상을 덮었지만 두 축이 동시에 존재한다는 사실은 남아 있었고, 0064는 그 상태가 **아예 만들어지지 않게** 한다. 부수 효과로 단식·페어 고정(pending에서 `request_not_accepted`)과 **세 모드의 규칙이 처음으로 같아졌다**
  - [x] **게이트는 앱·DB 두 곳뿐**(서로의 거울, 0057·0063이 못 박은 규약) — 앱 `canEnterRotationResult`에 `hasUnansweredSeats`를 앞세우고(⚠ **소유자 예외를 그 뒤로** 옮긴다. 앞에 두면 정작 초대를 보낸 사람만 규칙 밖에 남는다), DB finalize 진입 가드에 `session_seats_pending`. ⚠ DB 쪽은 **신원 검사가 pending 검사보다 먼저**여야 한다 — 순서를 바꾸면 좌석 없는 사람이 `session_seats_pending`을 받아 `session_not_found`로 숨기던 세션의 존재를 알게 된다
  - [x] **치명적 함정: 새 레인 `awaitSeats`가 필수** — 게이트만 좁히면 소유자가 어느 레인에도 안 걸린다. 소유자는 좌석 행이 없어(세션을 만든 것이 곧 동의, 0057) `viewerParticipation`이 undefined라 respond도 awaitOwner도 아니고 `none`으로 떨어져 **자기 세션이 허브에서 통째로 사라진다**. 판정 순서는 `enter → respond → awaitSeats → awaitOwner → none`이고, 그 세션은 「상대 대기」 탭에 남는다
  - [x] **무응답 탈출구 = 주최자가 게스트로 대체**(신규 RPC 0개) — 알림·리마인더·만료가 없으므로 한 명이 앱을 안 켜면 그날 경기가 영영 기록 불가가 된다. 기존 `remove_rotation_session_player`(0058)로 명부에서 빼고 같은 이름의 **비회원 행**을 로컬 풀에 채운다 — finalize allowlist는 회원 id만 검사하므로 비회원 슬롯은 통과하고(0057), 게스트는 언제나 동의한 것으로 보므로(0056) 경기는 기록되고 **그 회원의 전적에는 남지 않는다**. 거절한 사람에게도 [게스트로 넣기]를 준다(거절도 게이트를 통과시키지만 그 자리는 비어 있다). ⚠ 순서가 규칙이다 — 명부에서 뺀 **뒤** 로컬 행을 갈아끼워야 한다. 회원 행을 남기면 그 userId가 allowlist에서 빠져 `participant_not_in_room`으로 실패한다
  - [x] **탈출구의 도달 경로** — 미응답 세션은 이제 lane `awaitSeats`라 「내 차례」의 `RotationSessionCard`가 아니라 「상대 대기」에 뜬다. 초대 카드(`RotationSessionInviteCard`)에는 참가자 편집이 없으므로 **거기에도 세션 카드를 쓴다** — 버튼 라벨만 '참가자 편집'이고 저장은 `blockedReason`이 막는다(눌러도 서버가 튕길 버튼을 살려 두지 않는다). 그래서 「상대 대기」 탭이 처음으로 `picker`·`roomParticipants`를 받는다
  - [x] **중복 등록 — 실재 결함이었다** — 로테이션 파생 요청은 pending 중복 유니크 인덱스에서 통째로 제외돼 있고(0056 §2), `(rotation_session_id, group_seq)` 유니크도 없으며, 빌더가 `requester_id = 나`로만 좁혀 **남이 넣은 게임이 보이지 않았다**. 그 범위는 취향이 아니라 제약이었다 — `personal_matches` RLS가 '본인만'이라 앱 필터로는 넘을 수 없다. 신규 `get_rotation_session_games`(SECURITY DEFINER, `get_match_room_detail` 관용구)가 좌석 보유자·소유자·방 참가자에게 **세션의 대표 게임 전량**을 준다(두 출처 union은 이제 SQL이 한다). 팀 라인은 입력자 관점이므로 남의 게임은 첫 자리를 '나'가 아니라 입력자 이름으로 바꾼다(`enteredGameLine`)
  - [x] **낙관적 선점** — 빌더가 이미 화면에 띄우는 "새 게임은 N번부터"의 N(`nextGroupSeq`, 단일 출처)을 저장 시 `p_expected_seq`로 보내고 서버의 `max+1`과 다르면 `session_games_changed`. 세션 행 `for update`가 이미 채번을 직렬화하므로 **새 컬럼도 인덱스도 없다**. null이면 검사하지 않아 2인자 호출과 호환되지만, 시그니처가 바뀌므로 옛 버전은 drop했다(default를 둔 채 남기면 2인자 호출이 ambiguous — 0043 선례). 룸 빌더에도 목록·선점을 붙였다(참가자 여럿이 각자 넣는 자리라 중복 위험이 가장 크다)
  - [x] **(4)(6) 명단화 — 데이터는 이미 와 있었다** — 참여 축은 `request.seats{role,userId,name,acceptance}`가 카드 props에 도달해 있었고, 결과 축은 `confirmed_by` 배열이 select까지 왔다가 `confirmation.ts:92`에서 `.length`만 남고 **버려지고** 있었다. 그 절단점을 잇고(`confirmedUserIds`·`proposedBy`·`inactiveUserIds`) 순수 함수 `seat-status.ts`(`confirmSeatStatuses` 5상태: 입력/확인 완료/확인 대기/자동 동의/탈퇴)와 `groupAcceptanceNames`(참여 축)를 단일 출처로 뒀다. 표시는 새 언어를 만들지 않고 `rotation-session-card.tsx`의 '응답 대기: A · B' 패턴을 `NameStatusLine`으로 공용화한다
  - [x] **명단화가 드러낸 숨은 결함** — `memberSeatCount`가 탈퇴자를 못 걸러 DB `request_result_seats`와 분모가 어긋났다. 숫자 배지일 땐 1 차이로 티가 안 났지만 **명단으로 바꾸면 '확인 대기'에 탈퇴자 이름이 뜬다**(오지 않을 응답을 기다리는 것처럼). 임베드에 `users(deleted_at)`를 얹어 분모에서 빼고 상태를 `left`로 가른다
  - [x] **이의 사유를 툴팁에서 본문으로** — 사유가 배지의 `title`에만 있어 모바일에서 사실상 안 보였고, `awaitingReentryConfirm` 버킷은 버튼이 없어 팝업 경로조차 없어 **끝내 읽을 방법이 없었다**. 공유 컴포넌트 `DisputeReasonLine`(이의 이력이 없으면 스스로 사라져 호출부에 조건문이 없다) + 호칭 조립을 `disputerTitleOf`로 올려 팝업과 카드가 같은 출처를 쓴다
  - [x] **기존 버그** — `my-turn-panel.tsx`의 빈 상태 판정이 `myTurnTotal − reenterResult`인데 배지 계산(`page.tsx`)은 `− disputeMyTurnTotal`이었다. 0062가 `reentryReview`를 추가하며 한 곳을 빠뜨려, 이의 탭에만 할 일이 있는 사용자가 **배지 0인데 빈 상태 문구도 없는 빈 화면**을 봤다. 같은 헬퍼로 통일
  - [x] 검증 — 롤백 SQL 스모크(주최자·수락자 선입력 차단 / 무관자 `session_not_found` 정보 은닉 / 전원 수락 후 회원 3명 관점 행 + 선적립 0건 / 선점 거부·생략 시 이어붙임 / **위조 방어 allowlist 회귀** / 스코어 검증 회귀 / 목록 공유·입력자 이름·무관자 차단 / 거절도 '응답'이라 열린다 / **방 세션 7건 회귀** — 좌석 accepted 생성·방장/참가자 입력·세션 존속), `npx vitest run`(564)·`npx tsc --noEmit`·`npm run lint`·`npm run build` 통과
  - [ ] 잔여: 브라우저 엔드투엔드 수동 검증(계정 3개 — 미수락 시 [결과 입력] 대신 '참가자 편집'·세션이 「상대 대기」에 남는지·게스트 대체 후 저장·다른 참가자 빌더에 내 게임이 보이는지·선점 에러)
  - [ ] 별건(이번 범위 밖, 우선순위만 올림): **이의 왕복 상한 없음**(`dispute_count`는 세지만 중재 수단이 없다) / **알림·리마인더·만료 전무**(0064로 게스트 대체가 유일한 탈출구가 됐다) / `player-suggestions.ts`의 회원↔게스트 혼동 — 회원이 과거 상대로도 기록돼 있으면 비회원 항목이 위에 떠서 **회원을 실수로 게스트로 기록**할 수 있고, 그러면 규칙 (1)+(2)를 결합해 **동의 절차를 통째로 우회**하는 경로가 된다

- [x] Week 36: 로테이션 참여 동의의 대칭 완성 — 「승인 전 결과 입력」이 만드는 이중 수락 갭 봉합 (0063 마이그레이션)
  - [x] **신고와 판정** — "복식으로 회원 3명을 넣어 저장하면 초대받은 사람이 승인하지 않아도 결과를 입력할 수 있고, 입력하면 상대가 초대·기록 둘 다 승인해야 한다". **입력 가능 자체는 버그가 아니다** — 앱 `canEnterRotationResult`(소유자 무조건 true)와 DB finalize 진입 가드(`0057:293-299`)가 정확한 거울이고, 0057이 의도적으로 만든 장치다(코트에서 다 치고 났는데 한 명이 앱을 안 켰다고 스코어를 잃게 하지 않는다). 미수락 좌석이 낀 게임은 `personal_matches` 0행 + 협상 행 `proposed` 선적립이라 **0056 불변식도 지켜지고 있었다**. 대조군으로 페어 고정·단식은 pending에서 입력이 완전 차단된다(RPC 4종 `request_not_accepted`) — 비대칭의 방향은 "로테이션이 느슨하다"가 아니라 "페어 고정에 선적립 장치가 없다"이다
  - [x] **그러나 사용자가 본 화면은 실제 결함** — "둘 다 승인"은 은유가 아니라 **카드 두 장**이었다. `participation-section.tsx`가 같은 세션에 대해 「게임 참여 확인」과 「일정 초대」를 sessionId 중복 제거 없이 렌더하고, `counts.participation`이 둘 다 세어 뱃지도 부풀었다
  - [x] **근본 원인은 두 수락 RPC의 비대칭** — `respond_rotation_plan`(0058 §3)은 좌석을 수락하고 그 세션의 pending 게임 요청까지 흡수하는데, 0058은 이 갭을 주석에 적어 두고 **한 방향만** 고쳤다. 반대편 `respond_rotation_participation`(0056 §7)은 게임 요청만 응답하고 `rotation_sessions`를 보지 않는다 — 근거였던 주석 "개인 세션 행은 이미 삭제됐다"를 **0057 §(d)("좌석이 있는 세션은 남긴다")가 무효화했는데 함수가 갱신되지 않았다**. 그래서 게임 쪽에서 [전체 수락]을 누르면 좌석이 pending으로 남아 ① 일정 카드 잔존 ② 결과 입력 권한 상실 ③ **게임마다 재수락**(0057 결정 3과 등록 폼의 약속이 이 경로에서 거짓이 된다)
  - [x] **불변식 한 문장** — 로테이션 세션의 참여 동의는 `rotation_session_participants` 좌석이 유일한 권위이고, 게임 파생 요청의 좌석은 그 파생물이다. **어느 경로로 응답해도 두 축이 함께 움직이며, 허브는 한 세션을 한 장으로만 그린다.** 새 원칙이 아니라 0058이 한 방향만 적용한 규칙의 대칭 완성이다. ⚠ 두 RPC는 서로를 호출하지 않는다(교착) — 각자 두 축을 직접 갱신하고, 이미 응답한 축은 건드리지 않아 순서 무관·멱등이다
  - [x] **폴백 분기의 영구 비대칭 교정**(§1) — `0057:432-437`의 `personal_matches` insert가 `v_immediate` 게이트 **바깥**이라, "미수락 회원 파트너 + 상대팀 전원 비회원" 게임은 입력자 기록만 확정으로 생기고 관점 복사만 막혔다. 그 게임은 `opponent_user_id`가 not null이라 `match_requests`를 가질 수 없어 **그 회원이 나중에 수락해도 영영 기록을 못 받는다**. 입력 차단이 아니라 **따라잡기**로 고쳤다(`backfill_rotation_perspectives` — 수락이 곧 동의이므로 이 시점의 행 생성은 0056 위반이 아니다). 회원일 수 있는 슬롯은 partner 하나뿐이라 분기가 없다
  - [x] **`create_match_request` 스코어 구멍 봉쇄**(§4) — `p_set_scores`가 열려 있고 DB CHECK가 없어, 스코어를 실은 방 밖 pending 요청은 전원 수락 순간 `materialize_accepted_request`가 **아무 좌석의 확인 없이 확정**했다(0056 §9가 스스로 "함정"이라 부른 구멍, 앱이 안 넘긴다는 규약만으로 닫혀 있었다). 조용히 무시하지 않고 `set_scores_not_allowed`로 raise + CHECK `match_requests_offroom_no_scores`(`not valid`) — 스코어를 실어 보내는 호출부가 생기면 데이터가 아니라 배포가 깨져야 한다. 시그니처는 유지(바꾸면 `types/supabase.ts`와 호출부가 함께 깨진다)
  - [x] **입력자 피드백 + 중복 방지**(작업 3) — 입력 완료 판정이 `personal_matches`만 세어(`fetchEnteredSessionIds`) finalize 성공 후에도 카드가 '게임 미입력'으로 남고 `counts.enterResult`에 계속 잡혔다. 빌더는 프리필이 없어 재입력하면 `group_seq`만 올라간 **중복 pending 요청**이 쌓였다(로테이션 파생 요청은 0056의 pending 중복 유니크 인덱스에서 제외돼 DB도 안 막는다). `fetchEnteredRotationGames`가 두 출처(기록 + 요청·협상 제안값)를 합치고, 순수 모듈 `rotation-entered.ts`(vitest 12)가 배지 `'게임 N건 입력함'`·수락 대기 안내·빌더 상단 읽기 전용 「이미 입력한 게임」(`EnteredGamesBlock`, '새 게임은 N번부터')의 단일 출처다
  - [x] 문구 — 등록 폼 rotationPlan에 "수락을 기다리지 않고 결과를 먼저 넣어 둘 수도 있습니다 — 그 스코어는 수락 시점에 이어집니다", 게임 묶음 카드에 "수락하면 이 일정의 참여까지 함께 처리되어 따로 응답할 것이 없습니다"
  - [x] 검증 — 롤백 SQL 스모크 31단계(게임 쪽 수락이 좌석까지 전이 / **어느 쪽을 먼저 눌러도 최종 상태 동일** / 삭제된 세션에서 요청 축만 처리 / 이중 응답·무관자 차단 / 거절 시 좌석 rejected + 풀 제거 + 요청 전체 종료 / **뒤늦은 수락 후 관점 행 따라잡기와 파트너 배치** / backfill 멱등 / 스코어 실은 요청·직접 UPDATE 차단 / 단식·방 세션 회귀), `npx vitest run`(531)·`npx tsc --noEmit`·`npm run lint`·`npm run build` 통과
  - [ ] 잔여: 브라우저 엔드투엔드 수동 검증(계정 3개 — 수락 전 입력 후 상대 화면에 카드 **한 장만**·뱃지 세션당 1건, 게임 쪽 수락 후 일정 카드 소멸·결과 입력 권한 획득, 빌더 「이미 입력한 게임」과 번호 이어짐)
  - [ ] 별건: 페어 고정 복식·단식의 pending 중 스코어 선적립(모드 간 규칙 통일) — 착수 시 §4가 선행 조건이다. 룸 빌더는 '입장=동의'라 대기 게임이 없어 `enteredGames`를 넘기지 않는다
- [x] Week 35: 이의를 거친 경기는 확정까지 「이의 처리」 탭에 머문다 — 협상 이력 보존 (0062 마이그레이션)
  - [x] **증상** — 이의를 제기한 사람이 자기가 시작한 분쟁을 추적할 수 없었다. 제안자가 [다시 입력]으로 재제안하면 그 경기가 이의 탭에서 사라져 「내 차례 · 결과 확인 대기」로 조용히 이동했고(`classifyPendingMatch`가 평범한 `confirmResult`로 분류), 카드는 그것이 이의에 대한 답이라는 사실도 말하지 못했다. 이의 탭 배지는 `reenterResult`(제안자 차례)만 세어 **이의자에게 항상 0**이었다
  - [x] **근본 원인은 표시가 아니라 데이터 소실** — 재제안 순간 이의의 흔적이 두 곳에서 동시에 지워졌다: (a) `propose_match_result`(0059)의 UPDATE가 `dispute_reason = null`을 명시적으로 쓴다, (b) BEFORE 트리거 `normalize_result_confirmations`(0061)가 disputed 밖으로 전이할 때 `disputed_by := null`. 협상 이력 테이블도 없다(요청과 1:1 단일 행). 그래서 **"이의했다는 표시"라는 최소안조차 앱만 고쳐서는 불가능했다** — 표시할 근거가 남아 있지 않다. 비용이 같으므로 확인·승인까지 구현했다
  - [x] **불변식 한 문장** — 협상 이력 컬럼(`proposed_*`·`dispute_reason`·`disputed_by`·`dispute_count`)은 **상태 전이로 지워지지 않는다. 현재 상태를 말하는 것은 `result_status` 하나다.** 새 원칙이 아니라 **비대칭 교정**이다 — `proposed_by`·`proposed_set_scores`는 0055 정정 프리필을 위해 이미 disputed를 넘어 살아남았고 이의 쪽만 지워지고 있었다. 유일한 초기화는 `'none'`(협상 시작 전)이고, `confirmed_by`의 초기화 규칙(0060)은 손대지 않았다
  - [x] **`dispute_count`가 '이의를 거쳤다'의 권위 있는 술어** — `disputed_by`로 대신하지 않는 이유: `on delete set null`이라 이의자가 탈퇴하면 표식이 사라져 그 경기가 **조용히 이의 탭에서 빠져나간다**. 누적 카운터는 그 구멍을 막고 '2차 재입력' 라운드 표시도 준다. 필터하는 SQL이 없으므로(라우팅은 앱의 순수 함수) 인덱스를 두지 않는다. 백필은 현재 `disputed` 행만 1로(이미 확정된 행의 과거 이의는 알 수 없고, 그 행들은 허브를 떠나 있어 무관)
  - [x] **버킷 2종 신설 + 뱃지 총량 불변** — `reentryReview`(재입력된 결과를 내가 확인할 차례, 뱃지 포함)·`awaitingReentryConfirm`(내가 재입력했거나 이미 확인함). 판정은 disputed 분기 **직후, `viewerIsParty` 폴백보다 앞** — 뒤에 두면 좌석 미상 행만 「상대 대기」로 새어 상호배타가 반쯤 깨진다. 재제안 행은 종전에도 `confirmResult`로 `myTurnTotal`에 있었으므로 **라우팅만 이동하고 총량은 그대로다**(새 알림 압력 없음). 뱃지 = 내 차례 탭 배지 + 이의 탭 배지(`disputeMyTurnTotal` = reenterResult + reentryReview)
  - [x] **이의자만의 탭이 아니다** — 확인이 초기화됐으므로 재입력된 값은 남은 좌석 **전원**의 확인 대상이다. 그래서 규칙은 "이의를 거친 케이스는 좌석 전원이 이의 탭에서 본다"이고 뷰어별 분기가 없다. ⚠ 새 판정에 `disputedByMe`를 넣지 않는다 — 0061이 남긴 경고와 같은 이유로 교착을 만든다. 이의자 여부는 섹션 분할·배지 문구에만 쓴다
  - [x] 앱 — `PersonalMatchConfirmation.disputeRound`, 순수 함수 `hasDisputeHistory`(라우팅·배지 단일 출처)·`reentryBadge`('내/OOO님 이의 후 재입력 (N차)'), `disputerNameOf`의 가드를 status → 이의 이력으로 완화(재제안 후에도 이름이 해석돼야 한다), 탭 라벨 '이의 제기'→**'이의 처리'**(키 `disputed`는 유지해 기존 URL 보존), 이의 탭 3섹션→**5섹션**(내 차례 우선), 검토 팝업 설명줄에 '직전 이의 사유', 배너 문구 '이의 처리 N건'
  - [x] **중복 제거** — `mutual-result-actions.tsx`와 `room-game-actions.tsx`의 proposed 분기가 동형이라 배지를 인라인하면 판정이 복제된다 → 공유 컴포넌트 `ReentryContextBadge`(이의 이력이 없으면 스스로 사라져 호출부에 조건문이 없다). 두 파일 모두 `NegotiationDialog`에 `disputerName`을 **넘기지 않고 있던** 것도 함께 고쳤다(`DisputedResultActions`에만 갔다). 곁들여 `room-game-actions.tsx`의 자유 기록 갈래를 `RoomFreeGameActions`로 분리(143→123줄, 공유 상태가 없어 규칙이 갈라지지 않는다)
  - [x] 검증 — 롤백 SQL 스모크 10단계(제안 시 이력 0 / 이의 시 count 1·이의자·사유 / **재제안 후 사유·이의자 보존 + confirmed_by=[재제안자]** / 2차 이의 count 2·이의자 교체 / 비제안자 재제안의 요청자 관점 정규화 / **좌석 전원 확인 시 관점 4행 확정 + 이력 보존** / 정정 count 3·4행 비움 / 단식 회귀 / 제안자 본인 이의 거부 유지), `npx vitest run`(519)·`npx tsc --noEmit`·`npm run lint`·`npm run build` 통과
  - [ ] 잔여: 브라우저 엔드투엔드 수동 검증(계정 4개 — 이의자 화면의 '재입력된 결과 확인' 섹션 + `[내 이의 후 재입력]` 배지 + `[결과 확인]` default 버튼, 팝업 '직전 이의 사유', 뱃지 = 두 탭 배지 합), `room-game-actions.tsx` 123줄(협상 분기만 남았고 개인 경기 카드와 공유 추출은 별건)
- [x] Week 34: 확인 요청 허브 3탭화 — 「이의 제기」 탭 신설 + 게임 순번 '게임 N' 전수 통일 (0061 마이그레이션)
  - [x] **증상** — disputed 행이 `queue.ts`에서 `none`과 같은 `enterResult`로 분류돼 복식 4명 전원(이의를 낸 사람 포함)의 뱃지가 오르고 「내 차례·결과 입력 대기」에 섞였다. 배너는 '결과 입력 대기 N건'으로 이의라는 사실을 지웠다. 로테이션 세션의 미확정 게임은 허브에서 평평하게 그려져 몇 번째 게임인지 알 수 없었다(`gameLabel` 미전달, `buildMatchGroups` 미사용)
  - [x] **근본 원인은 DB에 이의 제기자가 없던 것** — `match_result_negotiations`에는 `dispute_reason`만 있고 dispute/reopen RPC는 status·reason만 갱신했다. 단식은 '제안자 아닌 쪽'으로 유도되지만 복식은 좌석 셋 중 누구인지 알 수 없다. 0061이 `disputed_by uuid`를 두고 두 RPC가 `auth.uid()`를 남기며, `normalize_result_confirmations` 트리거가 disputed 밖으로 전이할 때 null로 초기화한다(0060과 같은 원칙 — RPC마다가 아니라 BEFORE 트리거 한 곳이 propose 재제안·settle·finalize 직접 INSERT를 조건문 없이 덮는다). 백필 없음 — 기존 disputed 행은 이의자 미상 폴백
  - [x] **규칙 한 문장** — 이의 후 '다시 입력할 차례'는 **제안자**(`isReentryTurn = disputed ∧ viewerIsParty ∧ proposedByMe`, `confirmation.ts`). ⚠ `!disputedByMe`를 넣지 않는다 — dispute RPC가 제안자 이의를 막아 이의 경로에서는 항상 참이고, 정정(reopen)에서 제안자 본인이 되돌리면 아무도 차례가 아닌 교착이 된다. `disputedByMe`/`disputedBy`는 섹션 분할·배지 이름('내가 이의 제기' / 'OOO님 이의' / 미상 '이의 제기됨')에만 쓴다. 재제안 RPC는 좌석 누구나 허용하므로 차례가 아닌 좌석에도 [다시 입력]은 outline으로 남는다
  - [x] **3탭 상호배타** — `classifyPendingMatch`가 disputed를 좌석 폴백보다 **먼저** `reenterResult`/`awaitingReentry`로 보내 disputed 행은 「이의 제기」 탭(`?tab=disputed`)에만 나온다. 뱃지 = `myTurnTotal`(reenterResult 포함) = 내 차례 탭 배지(myTurnTotal − reenterResult) + 이의 탭 배지(reenterResult). 탭 메타는 `lib/match-requests/tabs.ts`(매칭 리스트 tabs.ts 관용구), `use-personal-match-submit`의 하드코딩 href도 `hubTabHref`로. 배너에 '이의 재입력 N건'(결과 입력 대기에 합치지 않는다 — 다른 탭)
  - [x] **게임 순번 '게임 N' 전수 통일** — 허브 섹션이 `PendingMatchSection`(buildMatchGroups + MatchGroupList, id→bucket 맵으로 액션 부착)으로 같은 로테이션 세션의 게임을 헤더 + `게임 ${groupSeq}` 카드로 묶는다(세션 안 입력 순. 경기 사이는 최신 일시 먼저 유지). `gameLabelOf`(`match-groups.ts`)가 단일 출처 — 개인 경기 결과의 로테이션 그룹(종전 라벨 없음)·멀티 게임 카드(종전 'N게임')도 '게임 N'. 한 세션의 게임이 버킷을 달리하면 섹션마다 헤더가 따로 뜨므로 라벨을 index가 아닌 groupSeq로 매긴다. 허브 미확정 행은 세트가 비어 kind가 record/rotation뿐이라 가상 카드 id가 없다
  - [x] 컴포넌트 — `DisputedPanel`(다시 입력할 차례 / 내가 이의 제기함 / 이의 진행 중), `DisputedResultActions`(카드·룸 행 공용 — 이의자 배지 + [다시 입력], `disputerNameOf`가 참가자 스냅샷으로 이름 해석), `ParticipationSection` 추출로 `MyTurnPanel` 100줄 이하, `QueueSection unboxed`(MatchGroupList가 박스를 소유), `NegotiationDialog disputerName`('내 이의 사유' / 'OOO님 이의 사유'), 가이드 문구. ⚠ select 리터럴에 `disputed_by`를 넣기 전에 `types/supabase.ts`를 먼저 갱신해야 한다(컬럼이 타입에 없으면 임베드 전체가 SelectQueryError) — 배포도 0061 적용 → 앱 순서(`attachConfirmations`는 error 시 조용히 폴백해 상호 확인 경기 전부가 '상대 대기'로 떨어진다)
  - [x] 검증 — 롤백 SQL 스모크 10단계(propose→null / dispute→이의자 / 재제안→null / 4인 confirm / reopen→정정자 + 4행 비움 / 비제안자 재제안 / 제안자 reopen = 자기 차례 / 직접 INSERT proposed→null / 자기 제안 dispute 거부 / 단식), `npx vitest run`(506)·`npx tsc --noEmit`·`npm run lint`·`npm run build` 통과
  - [ ] 잔여: 브라우저 엔드투엔드 수동 검증(계정 4개 — 제안자 '다시 입력할 차례' default 버튼·이의자 '내가 이의 제기'·파트너 '이의 진행 중'·뱃지 = 두 탭 배지 합·로테이션 '게임 N'), `room-game-actions.tsx` 143줄(위임 분기로 늘었다 — 자유 기록 분기 분리는 별건)
- [x] Week 33: 결과 확정을 회원 좌석 전원 만장일치로 (0060 마이그레이션)
  - [x] **증상** — 복식 4명이 친 게임인데 상대팀 중 한 명만 [결과 확인]을 눌러도 확정됐다. 0059가 협상 권한을 좌석 넷으로 넓히면서 **확인을 팀 단위**로 뒀기 때문이다(페어 중 한 명의 확인이 팀 전체를 대리). 요구는 "4명 모두가 확정을 눌러야 확정"
  - [x] **규칙 한 문장** — `match_result_negotiations.confirmed_by uuid[]`에 **활성 회원 좌석 전원**(`request_result_seats`)이 들어가면 `settle_match_result`가 관점 행 전부를 확정한다. **제안이 곧 제안자의 확인**이라 단식은 상대 1명(종전과 동일), 복식은 나머지 3명이 각각 누른다. 방 안팎·로테이션 파생 게임은 협상 행이 같은 테이블이라 조건문 없이 같은 규칙을 타고, 상대 전원 비회원 게임은 협상 행이 없어(finalize 폴백) 종전대로 즉시 확정이다
  - [x] **별도 테이블이 아니라 배열 컬럼** — 확인 시각 감사가 요구에 없고 회원은 soft delete뿐이라 행 단위 테이블이 주는 것이 없다. 배열이면 새 RLS 정책·FK·PostgREST 임베드·다른 테이블 DML이 전부 사라지고 기존 `negotiation:` select에 컬럼 하나만 얹으면 된다
  - [x] **초기화 규칙은 BEFORE 트리거 한 곳**(`normalize_result_confirmations`) — 제안 진입·재제안(proposed_at·제안값·제안자 중 하나라도 변경) → `[제안자]`, none/disputed → `{}`, confirmed는 이력 보존. `finalize_rotation_session`(0057)의 미수락 경로가 propose를 우회해 협상 행을 직접 'proposed'로 INSERT 하므로 RPC마다 고치면 500줄 finalize를 재정의해야 했다. materialize의 `on conflict do nothing`은 스킵된 행에 트리거를 띄우지 않아 finalize가 미리 심은 제안자 확인이 보존된다. ⚠ `now()`는 같은 트랜잭션 안에서 안 바뀌므로 proposed_at만 보면 롤백 스모크에서 재제안 리셋이 안 걸린다 — 그래서 제안값·제안자도 함께 본다
  - [x] **confirm은 멱등 구조** — 배열 append 여부와 무관하게 완성 판정(`seats <@ confirmed_by`)을 항상 수행한다. 마지막 미확인자가 탈퇴해 분모가 줄면 누군가(제안자 포함) 한 번 더 눌러 정산된다(영구 정지 없음). 집합 포함으로 판정해 탈퇴자의 옛 확인이 남아 있어도 안전하다. 반환값 void → boolean(정산됐는가)이라 drop 후 재생성했고, 앱은 정산됐을 때만 본인 NTRP를 재계산한다
  - [x] **팀 담합 가드 제거** — 만장일치에서는 파트너의 확인이 한 표일 뿐이고 상대팀 동의 없이는 확정되지 않는다. `request_result_team` drop. 잔여 구멍 하나: 제안 뒤 상대팀 전원이 탈퇴하면 분모가 우리 팀만 남는다 — propose의 `counterpart_deleted`가 제안 시점에 막고 정산 시점의 잔여는 허용
  - [x] 앱 — `PersonalMatchConfirmation`에 `confirmedByMe`·`confirmProgress` 추가, `proposedByMyTeam` 폐기(팀 축 소멸). 순수 함수 `canRespondToProposal`(proposed ∧ 좌석 ∧ 제안자 아님 ∧ 미확인)이 큐 버킷·카드·룸 행의 **단일 출처**이고, 협상 팝업은 `NegotiationDialog`로 카드·룸이 공유한다. '확인 완료 · 2/4명 확인' 배지(`ResultConfirmProgressBadge`), 검토 패널·제안 수정("수정하면 다른 참가자의 확인이 초기화됩니다")·허브·가이드 문구 갱신. 앱 진행도 분모는 user_id 있는 좌석 수라 탈퇴자가 끼면 DB 분모와 1 차이(표시 전용)
  - [x] 검증 — 롤백 SQL 스모크 17단계(4인 순차 확인·파트너 확인 허용·마지막 확인에서 4행 관점 세트·이중/제안자/무관자/pending 에러·재제안 리셋·이의/정정 비움·단식 회귀·finalize 직접 INSERT 트리거·탈퇴 엣지 멱등 정산·백필 5/5), `npx vitest run`(484)·`npx tsc --noEmit`·`npm run lint`·`npm run build` 전부 통과
  - [ ] 잔여: 브라우저 엔드투엔드 수동 검증(계정 4개 — 파트너 [결과 확인]·확인 후 '확인 완료 2/4명'·마지막 확인 시 개인 결과 이동), 진행도 분모를 DB와 일치시키려면 PostgREST computed column(`result_confirm_total(match_requests)`)
- [x] Week 32: 결과 수락을 팀 단위로 + 취소한 초대의 재초대 (0059 마이그레이션)
  - [x] **페어 중 한 명이 수락해도 인정되지 않던 문제** — 쓰기 RPC 4종이 `requester_id`/`opponent_user_id` **두 UUID만** 통과시켜, 복식이 '팀 대 팀'이 아니라 '요청자 1명 ↔ 상대팀 대표 1명'의 2자 협상이었다. 기록은 0053부터 회원 4명 전원에게 생기는데 권한만 2인이라 **대표가 앱에 안 들어오면 결과가 영영 확정되지 않았다.** 자격을 좌석 넷(요청자·파트너·대표·상대2) 전원으로 넓혔다
  - [x] **팀 담합 가드가 이 변경의 안전 조건** — 종전 `cannot_confirm_own_proposal`은 개인 비교라, 넓히면 내가 제안하고 **내 파트너가 확인**해 상대 동의 없이 4명 기록이 확정된다(0056이 참여 축에서 막은 것과 같은 구멍). `request_result_team`으로 팀을 비교하고, 팀을 못 구하면 **fail-closed**로 거부한다
  - [x] **관점 4분기** — 저장은 언제나 요청자 관점이라 제안을 좌석별로 정규화해야 한다. ⚠ **상대2에서 표시(`P∘I`)와 제안(`I∘P`)의 합성 순서가 반대이고 차이가 애드 플래그에서만 난다** — 스코어만 보면 두 순서가 같아 보인다. `normalize_to_requester_perspective`로 봉인하고, 애드 조합을 전부 넣은 순수 SQL 왕복으로 **순서를 뒤집으면 깨지는 것**까지 확인했다
  - [x] 부수 — `propose`·`reopen`의 `counterpart_deleted`가 2자 전제라 **대표만 탈퇴해도 상대2가 살아 있는데 막히던 결함**을 팀 판정으로 고쳤다. `result_already_proposed`(제안 수정은 본인만)는 유지 — 팀원에게 열면 상대팀이 검토 중인 값이 바뀌는 레이스가 넓어진다
  - [x] 앱 — 게이트는 `viewerIsParty` 하나이고 의미만 '좌석 넷'으로 넓혔다. 신규 `proposedByMyTeam`으로 검토 모드·큐 버킷·「상대 대기」 분할을 팀 축으로 바꾸고, **새 4번째 상태**(*내 팀원이 제안함* — 확인도 이의도 못 한다)에 버튼 대신 배지를 둔다(빠뜨리면 눌러도 RPC가 튕기는 버튼이 뜬다). `ConfirmationSourceRow.participants`는 **optional** — 부착을 빠뜨린 경로는 권한 **과소**로 무너진다
  - [x] **취소한 초대를 다시 보낼 수 없던 문제** — 0057 트리거가 `rejected` 좌석만 보존해 [참가자 제외] 시 좌석이 통째로 삭제됐다. 그러면 거절 이력과 좌석 조인으로만 얻던 이름이 함께 사라져 유일한 재초대 UI에서도 빠진다. 좌석에 `removed`를 두어 **거절과 제외를 대칭으로** 만들고("다시 초대할 수 있는 사람"), 명부 회원 행에서 **로컬 [삭제]를 없애** 취소 수단을 [참가자 제외] 하나로 좁혔다 — 서버를 안 바꾸는 빨간 [삭제]가 취소처럼 보인 것이 두 번째 원인이었다
  - [x] 검증 — 순수 SQL 관점 왕복(음성 케이스 포함) → 롤백 스모크(①의 3회 초대 왕복 / 팀 담합 차단 / 상대2 확인 시 4행 관점 확정 / 파트너 제안의 왕복 항등 / **상대2 제안의 순서 판별식 `oppAd:'opponent2'`** / 정정 확대 / 이중 확인 레이스 / 단식 회귀), `npx vitest run`(476)·`npx tsc --noEmit`·`npm run lint`·`npm run build` 전부 통과
  - [ ] 잔여: 브라우저 엔드투엔드 수동 검증(계정 4개 — 상대2 확인·팀원 제안 배지·팝업을 닫았다 열어 재초대 목록 확인)
  - [ ] 별건으로 확인된 결함: `player-suggestions.ts`의 「만나본 사람」 항목에 `userId`가 없고 그룹 순서가 `room → past → club → search`라, 회원이 과거 상대로도 기록돼 있으면 **비회원 항목이 회원보다 위에 뜬다** — 그걸 고르면 [초대]가 안 나오고 저장 시 조용히 비회원으로 기록된다. 근본 수정은 `PastOpponent`에 `userId`를 실어 dedupe에 태우는 것
- [x] Week 31: 로테이션 세션의 참가자 초대·제거 — 등록 이후에도 명부를 바꾼다 (0058 마이그레이션)
  - [x] **증상** — 회원 3명을 초대했는데 1명이 실수로 거절 → 결과 입력 팝업의 '참가자 추가·편집'에서 다시 등록 → 저장 시 `participant_not_in_room`
  - [x] **원인은 하나** — 등록 이후 `rotation_sessions.players`를 바꿀 경로가 앱에도 DB에도 없었다. 빌더의 참가자 편집은 순수 클라이언트 로컬 state이고(`useRotationGames`의 pool은 `useState` 초기값), finalize의 위조 방어 allowlist가 `players`에서 파생되므로 **로컬로 고른 회원은 언제나 걸린다**(비회원은 널 체크로 통과 — 그래서 회원 추가에서만 드러났다). `pool-editor-block`의 안내 문구는 이미 "회원은 방 비밀번호로 입장하면 자동 추가"라고 말하면서도 UI는 전체 회원 검색을 열어 두고 있었다
  - [x] **0057이 남긴 도달 불가능한 코드** — 트리거 `sync_rotation_session_participants`는 "풀에 다시 넣으면 rejected → pending 복귀"를 이미 구현해 뒀는데 넣을 경로가 없어 한 번도 실행되지 않았다. 그래서 0058은 **append/remove 경로만 연다** — 좌석 복귀도, allowlist의 거절자 배제 해제도 전부 그 트리거가 대신한다(allowlist 무변경)
  - [x] **방 밖 세션 전용** — 방은 '비밀번호 공유 = 초대'(0048)이고 방 세션 좌석은 `accepted`로 시작한다. 방 풀에 임의의 회원을 넣으면 **입장한 적 없는 사람이 accepted 좌석을 갖는 동의 구멍**이 생겨 두 RPC 모두 `room_session_invite_unsupported`로 거부한다. 그 결과 기존 안내 문구가 방 세션에서는 비로소 사실이 된다
  - [x] **이중 수락 제거** — 0057 결정 3("세션 수락 = 게임 참여 동의")이 finalize의 `v_immediate`에만 구현돼 있어, 한 명이 미응답이면 **이미 일정을 수락한 사람의 좌석까지** 대기로 태어나 다시 물었다. 재초대를 열면서 이 순서가 흔해지므로 규칙을 트리거로 내렸다 — `default_participation_status`가 좌석을, 신규 `default_request_opponent_response`가 대표를 일정 수락에서 파생시키고, `respond_rotation_plan`은 그 세션의 pending 게임 요청에 응답을 흘린다(수락은 `maybe_materialize_request`까지, 거절은 요청 종료까지). 방 입장이 방 요청의 참여 수락을 겸하는 것(0056 §10)과 같은 처리다
  - [x] **거절자 이름 복구** — 좌석에는 스냅샷 컬럼이 없고(0057) 거절자는 `players`에서 빠지므로 화면에 "거절: 참가자"로 이름이 사라져 있었다. 좌석 임베드에 `users`를 조인해 이름을 되찾고, 그 값이 [다시 초대] 후 빌더 로컬 행을 채우는 데도 쓰인다. ⚠ supabase-js는 select 문자열을 **리터럴 타입**으로 파싱한다 — 상수 결합(`a + b`)을 쓰면 결과가 `GenericStringError`가 되므로 한 줄로 둔다
  - [x] UI는 **선택적 슬롯 2개**로 최소 침습 — `PlayerPoolSection`/`PoolPlayerRow`에 `renderRowAction`/`headerAction`을 뚫고 `PoolEditorBlock`이 `poolAdmin`을 받을 때만 판정한다(등록 폼·방 빌더는 넘기지 않아 무변경). 행 규칙: 비회원 없음 / **주최자 배지** / 명부 회원은 상태 배지(+주최자면 제외) / 그 외 회원은 [초대]. ⚠ 주최자 분기가 없으면 참가자 화면의 빌더 풀에 섞여 들어온 주최자가 '미초대 회원'으로 오분류돼 누르면 실패하는 [초대]가 뜬다(`match-requests/page.tsx`의 owner 주입 때문). 거절자는 행이 없어 블록 상단에 "참여를 거절함: OOO [다시 초대]"로 따로 낸다
  - [x] 부수 — 결과 입력 패널의 "상대 대표가 확인해야 확정됩니다" 안내와 `immediateCount`가 방 세션에만 걸려 있던 것을 방 안팎 공통으로(0057 이후 방 밖도 같은 흐름이다)
  - [x] 검증 — DB 롤백 스모크(사용자 시나리오 재현·자격·중복·제거 권한·방 세션 거부·이중 수락 흡수·회귀 3종), `npx vitest run`(469)·`npx tsc --noEmit`·`npm run lint`·`npm run build` 전부 통과
  - [ ] 잔여: 브라우저 엔드투엔드 수동 검증(계정 3개 — 팝업이 열린 채 초대 후 배지 전환·게임 입력 state 보존 확인)
- [x] Week 30: 로테이션 복식도 등록 시점에 참여 초대 — 세션 참여 동의 축 신설 (0057 마이그레이션)
  - [x] **증상과 원인** — "복식으로 회원을 모두 넣어 저장해도 단식과 달리 요청이 안 간다". 복식 로직의 버그가 아니라 **복식 기본 모드가 로테이션**(`use-personal-match-form-state.ts` `doublesMode` 기본값)이고, 제출 훅이 로테이션 분기를 **가장 먼저** 걸어 확인 요청 분기에 도달조차 하지 않기 때문이었다. `createRotationSessionAction`은 `rotation_sessions` 1행만 만들고, RLS(0050)가 소유자·방 참가자만 열어 두어 풀 회원은 세션의 존재조차 몰랐다. 상대가 처음 아는 시점은 finalize(결과 입력) 이후 — 경기가 끝난 뒤다. 그래서 같은 시간에 함께 치는 사람들이 서로 모른 채 같은 일정을 중복 생성했다
  - [x] **원하던 동작은 이미 있었지만 '매칭 리스트에 노출'에 묶여 있었다** — 노출을 켜면 `create_match_room`이 풀 회원 전원을 초대한다. 그러나 노출은 전체 회원 공개 + 비밀번호 필수라 비공개 로테이션에는 쓸 수 없다. 그래서 방을 항상 만드는 안(= `match_rooms` RLS·목록 쿼리 전량에 노출 필터)을 기각하고, 0056이 `match_request_participants`에 세운 참여 축을 **세션 레벨에 복제**했다
  - [x] **새 테이블은 명부의 복제본이 아니라 참여 축 인덱스** — 이름·NTRP 스냅샷도 role 컬럼도 두지 않는다(`players` jsonb가 이미 명부이고, 세션에는 좌석이 아니라 풀만 있다). 좌석 생성도 RPC가 아니라 **트리거**로 파생시켜(0056 §1과 같은 논리) `createRotationSessionAction`은 한 글자도 바뀌지 않았다 — `players`의 서버측 쓰기 경로가 이미 셋이라 각각을 고치는 대신 규칙을 한 곳에 모았다
  - [x] **거절은 세션을 죽이지 않는다** — 복식 요청은 "네 자리가 다 있어야 성립"해서 한 명의 거절이 요청 전체를 끝내지만, 로테이션은 5명 중 1명이 못 와도 나머지가 친다. 거절자는 풀에서만 빠지고 `rejected` 좌석은 남겨 주최자가 사실을 본다(풀에 다시 넣으면 재요청 = `pending` 복귀)
  - [x] **세션 수락 = 게임 참여 동의** — finalize의 `v_is_room` 스위치를 `v_immediate`(방이거나, 이 게임의 회원 좌석이 전부 세션 수락자)로 바꿔 게임별 재수락을 없앴다. 치환 지점 다섯 중 **폴백 분기의 관점 복사 게이트**를 빠뜨리면 세션을 수락한 회원 파트너가 관점 행을 못 받는다. 방 밖 pending 요청의 `set_scores='[]'` 불변식(0056)은 그대로 지킨다
  - [x] **수락자도 결과를 입력한다**(0050이 방 세션에 준 권한의 방 밖 대칭). 그 귀결로 (a) 방 밖 세션도 좌석이 있으면 finalize가 세션을 **남기고**(종료는 소유자 삭제), (b) 비소유자의 빌더 풀에 **주최자를 끼워 넣어야 한다**(`players`는 '나 제외'라 소유자가 없고, 방 세션은 host 멤버 행이 대신해 왔다), (c) 큐가 세션을 `respond`/`enter`/`awaitOwner`로 갈라야 한다 — **안 가르면 RLS를 여는 순간 미수락자 화면에 눌러도 `not_session_participant`를 뱉는 [결과 입력] 버튼이 뜬다**
  - [x] 부수 결함 — `group_seq` 채번이 `personal_matches`만 봐서, 미수락 회원이 낀 게임(기록을 만들지 않는다) 뒤의 게임이 같은 번호를 다시 썼다(0056까지는 방 밖 세션이 첫 finalize에 삭제돼 두 번째 호출 자체가 없어 드러나지 않았다). `ConfirmFlowNotice`의 복식 문구가 0053·0056 이후 거짓("파트너·상대2 기록에는 추가되지 않습니다"). 대표가 없는 갈래(로테이션·상대팀 전원 비회원·모집 중)에 **부정 신호가 하나도 없던** 문제 → 순수 함수 `resolveSaveOutcome` + `SaveOutcomeNotice`
  - [x] 중복 일정 경고 — 같은 날짜·시각에 이미 잡아 둔 미확정 일정이 있으면 등록 폼이 알린다(저장은 막지 않음). `fetchMatchQueue`가 React `cache()`라 **신규 쿼리 0건**이고, 판정은 시 단위 정확 일치라 '경기 길이' 개념을 새로 만들지 않는다
  - [x] 검증 — DB 롤백 스모크 21건(좌석 생성·RLS 격리·응답/이중응답/거절·선인가 vs pending 분기·관점 반전·수락자 입력·미응답자 거부·거절자 투입 거부·세션 존속 vs 좌석 0행 삭제·방 승격·풀 축소/재초대·채번 중복), `npx vitest run`(464)·`npx tsc --noEmit`·`npm run lint`·`npm run build` 전부 통과
  - [ ] 잔여: 브라우저 엔드투엔드 수동 검증(계정 3개 — 초대 카드·수락 후 빌더 풀에 주최자·게임별 재수락 없음·중복 경고)
- [x] Week 29: 확인 요청의 참여 전원 동의 — 방 밖 요청은 회원 좌석 전원이 수락해야 기록이 생긴다 (0056 마이그레이션)
  - [x] **방 밖 로테이션의 무단 확정 수정** — `finalize_rotation_session`의 대표 결정이 `if v_s.room_id is not null` 안에 갇혀 있어(0050 §8), 방 밖 세션은 상대가 전원 회원이어도 대표가 null → **즉시 확정 폴백**으로 떨어졌다. 내 기록에만 확정으로 꽂히고 상대·파트너의 `personal_matches`는 0행 — 그들은 경기의 존재조차 몰랐다. 0053이 페어 고정 복식에서 제거한 `room_id` 게이팅과 같은 종류의 잔재다
  - [x] **동의 모델 전환** — 종전에는 상대팀 대표 1명의 수락이 회원 4명분 동의를 대리해, 파트너·상대2가 통보 없이 자기 전적에 경기를 받았다. `match_request_participants.participation_status` + `match_requests.opponent_accepted_at`으로 **참여 축**을 세우고, **결과 축**(`match_result_negotiations`)과 끝까지 직교시킨다 — 결과 확정 권한은 종전 그대로 요청 당사자 2명뿐이다
  - [x] **게이트 = 단일 초크포인트** `maybe_materialize_request` — 모든 방 밖 수락 경로가 이 함수를 통과한다. 요청 행 락이 동시 수락을 직렬화하고, 통과 즉시 status를 accepted로 옮겨 두 번 통과할 수 없다. `participation_status` 기본값은 `pending`(시끄러운 실패) — accepted가 기본이면 새 쓰기 경로를 빠뜨렸을 때 동의 없이 남의 기록이 생긴다. 방 안 경로·비회원·탈퇴자는 BEFORE INSERT 트리거가 accepted로 시작시켜, `create_room_game`·`create_match_request`를 각각 고치지 않고도 규칙이 한 곳에 모인다
  - [x] **매칭 룸은 현행 유지** — '비밀번호 입장 = 참여 동의'(0048~0049)라 룸 요청은 대표 1명 모델 그대로다. 경계는 순수 함수 `requiresAllMembers`(= `!roomId`) 하나이고 큐 분류·카드 문구가 모두 이 술어를 본다. `join_match_room_as_player`는 입장 시 그 방 요청의 내 좌석까지 수락 처리한다 — 안 그러면 같은 방에서 대표는 입장만으로 참가가 확정되는데 파트너만 한 단계를 더 밟는 비대칭이 남는다
  - [x] **로테이션은 세션이 동의의 단위** — 한 세션에서 같은 회원이 게임1에서는 상대 대표, 게임3에서는 내 파트너일 수 있어 요청별로 쪼개면 역할을 바꿔가며 [수락]을 여러 번 누르는 화면이 된다. `respond_rotation_participation`이 두 축을 한 번에 흡수하고, 허브는 `groupRotationRequests`로 세션을 한 장(`RotationRequestGroupCard`)으로 묶는다. 파생 요청은 pending 중복 방지 유니크 인덱스에서 제외한다(같은 대표와 두 번 붙은 게임이 23505로 finalize 전체를 롤백시켰다)
  - [x] **거절도 RPC로**(`reject_match_request`) — 종전 서버 액션은 테이블을 직접 UPDATE하며 `opponent_user_id`로 좁혀, 참가자가 거절하면 0행이 조용히 지나가고 "이미 처리된 요청입니다"로 오표시됐다. 복식은 네 자리가 다 있어야 성립하므로 한 명의 거절이 요청 전체를 끝낸다
  - [x] 앱 — 순수 모듈 `lib/match-requests/participants.ts`(vitest 15: 좌석 진행도·레인 분류·방 안팎 경계), `MatchRequest.seats`/`viewerRole`/`rotationSessionId`, 큐가 pending 요청을 **respond/mine/awaitMembers** 세 레인으로(awaitMembers는 취소 권한이 없어 「상대 대기」의 별도 섹션 `AwaitingMemberRequestCard`), `ReceivedRequestCard`가 대표·참가자 공용(관점 반전을 `viewerSideOf`로 — 파트너에게까지 반전을 걸면 자기 팀이 상대팀으로 보인다), `AcceptanceProgressBadge`/`AcceptanceNote` 문구 단일 출처
  - [x] 조회 — `fetchMyMatchRequests`가 좌석 자격(파트너·상대2)으로도 요청을 찾는다(RLS는 0052부터 이미 열려 있었고 좁히던 것은 앱 필터였다). 임베드 필터를 쓰면 참가자 배열 자체가 걸러지므로 id만 먼저 뽑아 `or`에 얹고, `accepted`는 B축(`personal_matches`)이 대신 표현하므로 제외한다(방 로테이션이 게임마다 accepted 요청을 1행씩 남겨 순수 잡음이었다)
  - [x] 부수 — 개인 경기 목록의 표시 그룹을 **박스 단위**로(박스 사이 여백 = 다른 경기, 박스 안 얇은 선 = 같은 세션), 카드 시각 대비 상향(`emphasizeTime`), 멀티 게임 배지를 `formatGameSummary`('3게임 · 1승 2패')로 통일 — 몇 게임으로 집계됐는지를 화면이 직접 말한다
  - [x] 검증 — DB 롤백 스모크 3종(방 밖 복식: 대표 수락만으로는 0행 → 전원 수락 시 4관점 행 / 방 밖 로테이션: pending 요청 + proposed 협상, 확정 전 세트 빈 배열, 대표 확인 후 관점별 반전 / 거절·권한: 참가자 거절이 요청 전체 종료, 무관자 `not_request_participant`, 비회원 좌석 자동 accepted, accepted 요청의 새 좌석 기본값), `npx tsc --noEmit`·`npm run lint`·`npm run build`·`npx vitest run`(433) 전부 통과
  - [ ] 잔여: 브라우저 엔드투엔드 수동 검증(계정 4개 — 파트너 수락 화면·세션 일괄 수락·뱃지 3자 일치), 소급 변환 없음(이미 확정된 방 밖 로테이션 기록은 그대로 둔다 — 되돌리면 상대가 동의한 적 없는 기록이 남의 전적에 생긴다)
- [x] Week 28: 3대 핵심 기능 정합성 보완 — 개인 통계 실 연동 · 복식 기록 · 룸 참가자 권한 · 결과 정정 (0053~0055 마이그레이션)
  - [x] **본인 프로필 통계 실 데이터 복원** — `/profile/[userId]`가 `getDummyAnalyticsBundle`을 쓰고 있어 경기를 기록해도 승률·라이벌·파트너·티어·AI 코칭이 전부 더미였다(타인 프로필은 이미 실 데이터였다). `fetchAnalyticsBundle`·`fetchClubRatingHistory/Ranking`·`fetchUserClubRatings`로 교체, `?fixture=` 검수 스위치와 픽스처 5파일(`personal-analytics*`·`ratings`·`_scenario`) 제거
  - [x] **`revalidatePath('/me/analytics')` 9곳 → `/profile/${userId}`** — `/me/analytics`는 리다이렉트 전용 라우트라 그 9번의 무효화가 전부 무의미했다. 통계가 실 데이터가 되면서 드러날 라우터 캐시 스테일을 함께 제거
  - [x] **방 밖 복식도 회원 참가자 전원에게 관점 행**(0053) — `materialize_accepted_request`의 복사 조건이 `room_id is not null and v_is_doubles`라 방 게임 복식만 4명 전원에게 기록을 만들었다. 조건을 `v_is_doubles`로 좁혀 방 안팎을 통일하고, `confirm_match_result`의 파트너·상대2 UPDATE에 행 수 단언(`perspective_row_missing`)을 추가했다 — 관점 행이 늘어나면 0행의 침묵이 곧 기록 유실이 된다
  - [x] **매칭 룸 참가자도 비회원 상대 게임 기록**(0054) — `personal_matches_insert`만 방장 소유 방으로 묶여 있어(UPDATE는 0049에서 이미 참가자로 완화) 참가자가 비회원과 친 게임을 남길 수 없었다. INSERT를 `is_room_participant`로 대칭 완화하고 앱의 `viewerIsHost` 게이트를 제거했다. 미입장 회원의 `room_id` 부착은 여전히 차단된다
  - [x] **방 나가기**(0054) — 비밀번호 입장이 곧 `player/joined`인데 나가는 경로가 없어 잘못 들어간 방의 명단·로테이션 풀에 영구히 남았다. `leave_match_room` RPC + `RoomLeaveButton`. 명단에서만 빠지고 내 기록은 남으며, 재입장하면 복귀한다. 방장은 `host_cannot_leave`
  - [x] **확정 결과 정정**(0055) — `confirmed`가 종점이라 오입력을 되돌릴 방법이 없었다(propose는 `result_already_confirmed`, personal_matches는 RESTRICTIVE 잠금). `reopen_match_result`가 파생 행 전부를 `set_scores='[]'`로 되돌려 허브로 복귀시키고 협상을 `disputed`로 전이한다 — 직전 확정값은 `proposed_set_scores`에 남아 재제안에 프리필된다. 자격은 순수 함수 `canReopenResult`(vitest 4), UI는 `ReopenResultButton`(개인 결과 카드 + 룸 게임 행)
  - [x] 부수 교정 — 신규 등록·수정·삭제의 `/me/match-requests` 무효화 누락(신규는 항상 미확정이라 저장 직후 도착하는 화면이다), `revalidateRoomPaths`/`revalidateRoomList` 헬퍼 우회 3곳, 「결과 입력 대기」 섹션 헤더 수를 뱃지와 같은 `counts` 기준으로 정렬, `/guide`에 매칭 리스트·확인 요청 섹션 추가(3대 기능 중 둘이 설명돼 있지 않았다)
  - [x] 검증 — DB 롤백 스모크 3종(0053 복식 4행 생성·관점 변환값·확정 4행 / 0054 참가자 INSERT 허용·미입장자 차단·방장 나가기 거부·풀 제거·기록 보존 / 0055 무관자·파트너 차단·되돌림·이중 정정 거부·재제안 후 재확정), `npx tsc --noEmit`·`npm run lint`·`npm run build`·`npx vitest run`(402) 전부 통과
  - [ ] 잔여: 브라우저 엔드투엔드 수동 검증(계정 4개), 알림·리마인더·만료(별건), 보안·성능 백로그(비밀번호 시도 제한, `anon` EXECUTE 회수 15종, `search_path` 미설정 10종, RLS `auth.uid()` 재평가 56건, 미인덱스 FK 11건, 레이아웃 경로의 `fetchMyMatchRequests` 전량 조회, 개인 경기 목록 페이지네이션), 클럽·대진표 픽스처 복원
- [x] Week 27: 경기 기록 도메인 플로우 재정립 — 미확정은 확인 요청, 확정은 개인 결과, 입력은 룸 안에서 (`docs/match-flow-refactor.md`, 0051~0052 마이그레이션)
  - [x] 집합 분할: `personal_matches.has_result`(0051 생성 컬럼 + 부분 인덱스 2종) 하나로 개인 경기 결과(확정)/확인 요청 허브(미확정)를 나눈다 — `fetchSettledPersonalMatches`/`fetchPendingPersonalMatches` + `attachConfirmations` 추출
  - [x] 순수 분류기 `lib/match-requests/queue.ts`(4버킷 + `myTurnTotal`, vitest 18) + `fetchMatchQueue`(React `cache()`) — 허브 본문·개인 결과 배너·사이드바 뱃지가 **한 소스**를 본다(구 SQL 합산 `fetchPendingReceivedCount` 폐기)
  - [x] 확인 요청 허브 실 연동(픽스처 제거) — 「내 차례」(참여 확인·결과 확인 대기·결과 입력 대기·참가자 채우기) / 「상대 대기」(`?tab=waiting`: 내 제안·상대 수락·대표 확인·종료 이력) 2탭 8섹션. 카드·액션은 기존 컴포넌트 재사용(`PersonalMatchCard`·`MutualResultActions`·`RotationSessionCard`)
  - [x] `PersonalMatchConfirmation.viewerIsParty` 도입 — 복식 파트너·상대2의 관점 행은 협상을 읽어도(0052) '대표 확인 대기'로 남는다. `personal_matches.is_perspective`도 앱에서 처음 매핑
  - [x] 개인 경기 결과는 확정분만 + `QueueSummaryBanner`(내 차례 0건이면 미노출). `MatchActions`는 잠금 배지/수정·삭제로 축소, 저장 후 목적지 교정(폼이 세트를 받지 않아 신규는 전부 미확정 → 허브)
  - [x] 매칭 리스트 3탭(진행 중/내가 참여한/종료된, `lib/match-rooms/tabs.ts` + `isViewerInvolved`) + `LinkTabs` 공용 탭 바 + `ROOM_LIST_LIMIT` 상한 고지
  - [x] 매칭 룸 완결 — 룸 안 게임 추가 다이얼로그(`RoomGameDialog`, 폼 `variant='dialog'` + `SubmitNavigation`), 룸 안 결과 입력·확인·이의(`RoomGameActions`, 자격 판정 = 협상 행의 존재), 미확정 로테이션 게임 빌더(`RoomRotationBuilder`). `/me/personal-matches/new?room=`은 룸으로 리다이렉트
  - [x] 라벨 재정립: 경기 리스트→**매칭 리스트**, 경기 방→**매칭 룸**, 개인 경기 기록→**개인 경기 결과**. 사이드바를 생애 순서로 재배열(매칭 리스트 → 확인 요청 → 개인 결과). `'방장'`은 정렬·색 판정 키라 유지
  - [x] 부수 수정: 룸 게임 폼 `metaOk` 영구 차단(표면·시각이 빈 방), `room-password-gate` 안내 문구 0049 반영, 방 참가자 후보 N+1 제거(배치 조회)
  - [x] 마이그레이션 0052 — 참가자 SELECT 확장(`is_request_party` 헬퍼로 SELECT 정책 3종 교체). 복식 파트너·상대2가 자기 경기의 협상 상태를 **읽기만** 하게 되면서 대기 배지가 결과 입력 대기/대표 확인 대기/이의 제기됨으로 갈린다(`bystanderWaitingBadge` 단일 출처). 부수로 `MutualResultActions`의 자격 가드를 `!confirmation` → `!viewerIsParty`로 교정 — 안 고치면 파트너에게 누를 수 없는 [결과 확인] 버튼이 노출된다
  - [x] 엔드투엔드 수동 검증 — 계정 4개(관리자 + 테스트 3)로 문서의 시나리오 8종 전량. 확인 요청 생성→수락→제안→**이의→재제안**→확인, 방 게임 복식(파트너 관점 배지가 협상 상태에 따라 갈리는지), 로테이션 방 다중 입력(`group_seq` 이어붙기·게임별 대표 분리·방장 게임 입력 종료), 매칭 리스트 3탭 이동·`?tab=` 폴백, 뱃지=탭=배너 3자 일치, 확정 시 허브→개인 결과 이동. 검증 데이터·계정은 사후 삭제
  - [x] 검증에서 찾은 표시 결함 3건 수정 — 모두 순수 함수로 분리 + vitest 고정
    - 룸 게임 행이 `'나'`를 **작성자가 아닌 모든 뷰어**에게 써서, 정원 없는 방(0048)의 무관한 참가자에게 남의 게임이 자기 게임처럼 보였다 → `buildRoomGameLine`이 `isRoomGameParty`로 당사자에게만
    - 팀 라인은 뷰어 관점으로 뒤집으면서 **스코어는 대표 행 값 그대로**라 진 사람이 WIN 배지를 봤다 → `buildRoomGameSets`가 상대팀 뷰어에게 `invertSetScores`(같은 팀 파트너는 me/opp가 같아 반전 없음)
    - 방 게임 안내가 비회원이 섞여도 '회원 네 명 모두'라고 말했다 → `ConfirmFlowNotice`가 `memberCount`(= `hideNtrpFor` + 나)로 실제 회원 수를 말한다
  - [x] Step 12 — 매칭 리스트 서버 필터·커서 페이지네이션. 탭 하나를 그리려고 목록 전체(구 `ROOM_LIST_LIMIT` 200)를 받던 것을 탭별 서버 필터로 바꾸고, keyset `(played_at, played_time, id)` 커서로 페이지를 넘긴다(`ROOM_PAGE_SIZE` 30). 진행/종료 경계(`is_settled` ∨ 날짜 경과)가 메모리 `splitRooms` → 서버 필터로 이관됐고, 탭 배지는 head count·멤버십 건수라 페이지 크기와 무관하게 정확해졌다. 커서는 계속 자라는 쪽(종료된 경기)에만 붙인다
  - [ ] 2차: 룸 '참가자 채우기'를 `RoomGameDialog initialData`로 전환

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
| `personal_matches` | 본인(user_id)만 CRUD (INSERT/UPDATE 모두 `room_id is null or is_room_participant(room_id)` — 0054에서 INSERT를 UPDATE와 대칭으로 완화해 방 참가자도 비회원 상대 게임을 자유 기록으로 남길 수 있다). `set_scores` 빈 배열 = 결과 미확정(집계 제외). 행 단위 승자 컬럼 없음 — 세트 1개 = 게임 1개로 게임마다 승패(0045에서 세트 다수결 `winner` 폐기). `source_type`(direct/confirmation/rotation)으로 출처 명시. 상호확인(`source_type='confirmation'`)은 RESTRICTIVE 정책으로 수정/삭제 잠금. 참가자(opponent/partner/opponent2)는 `personal_match_participants`로 정규화. `court_name`(≤40자, 선택, 0043)은 세 출처 모두에서 채워짐. `rotation_session_id`(FK 없는 세션 tombstone id)·`group_seq`(세션 내 순번, 0044)로 로테이션 게임을 목록에서 묶음. `is_perspective`(0050) = 다른 참가자 기록에서 파생된 관점 복사본 표식 — 방의 primary 게임 판정 단일 기준. `has_result`(0051) = `jsonb_array_length(set_scores) > 0` 생성 컬럼 + 부분 인덱스 2종 — **개인 경기 결과(확정) ↔ 확인 요청 허브(미확정) 집합 분할 술어**(TS `hasResult`와 미러) |
| `personal_match_participants` | 상위 경기(user_id)와 동일 RLS + 잠금. `{match_id, role, user_id, name, dominant_hand, ntrp_snapshot}`. 이름/회원이 있는 슬롯만 행이 생긴다(모집형은 0~3행). INSERT 트리거 `invite_room_member_from_participant`(0047)가 노출된 자유 기록의 회원 참가자를 방에 초대 |
| `match_requests` | SELECT는 `is_request_party`(요청 당사자 둘 + 복식 참가자, 0052), requester만 취소, opponent만 거절. **생성은 `create_match_request` RPC 전용**(직접 INSERT 정책 폐지 — 복식 참가자 원자적 삽입을 위해). **`set_scores`는 방 밖 요청에서 언제나 빈 배열이다**(0063 — RPC가 `set_scores_not_allowed`로 거부하고 CHECK `match_requests_offroom_no_scores`가 강제. 스코어를 실으면 `materialize_accepted_request`가 전원 수락 순간 **아무 좌석의 확인 없이 확정**한다 — 0056 §9가 "함정"이라 부르던 구멍이 규약에서 제약으로 승격됐다. 스코어는 협상 행에만 산다). 수락은 RPC로만. 복식 파트너/상대2는 `match_request_participants`로, 결과 협상(`result_status`/`proposed_set_scores`/`proposed_by`/`proposed_at`/`dispute_reason`)은 `match_result_negotiations`로 분리(요청 상태축과 결과협상축이 별개 테이블). `court_name`은 수락 시 양측 기록에 복사(notes는 요청자만). `opponent_accepted_at`(0056) = 대표의 참여 수락 시각 — status는 나머지 참가자를 기다리느라 아직 pending일 수 있다. `rotation_session_id`·`group_seq`(0056)로 로테이션 파생 요청을 세션에 묶고, pending 중복 방지 유니크 인덱스에서 제외한다(한 세션은 같은 대표와 여러 게임을 치른다) |
| `match_request_participants` | `is_request_party(request_id)` SELECT. `{request_id, role(partner/opponent2), user_id, name, dominant_hand, ntrp_snapshot, participation_status(pending/accepted/rejected), responded_at}`. 쓰기는 RPC 전용(`create_match_request`·`create_room_game`·`finalize_rotation_session` 생성, 응답은 `respond_*` RPC). `participation_status` 기본값은 `pending`이고 BEFORE INSERT 트리거 `default_participation_status`가 **방 안 경로(요청이 이미 accepted)·비회원·탈퇴자만** accepted로 시작시킨다 — 기본을 accepted로 두면 새 쓰기 경로를 빠뜨렸을 때 동의 없이 남의 기록이 생긴다(조용한 실패) |
| `match_result_negotiations` | `is_request_party(request_id)` SELECT(request_id 1:1). 쓰기는 `accept/propose/confirm/dispute/reopen_match_result` RPC 전용 — 읽기가 열려도 제안·확인·이의는 좌석 넷만 통과한다(`not_request_party`). `confirmed_by uuid[]`(0060) = 이 제안을 확인한 좌석 — 제안자는 제안 시점에 들어가고, 활성 회원 좌석 전원(`request_result_seats`)이 들어가면 정산된다. BEFORE 트리거 `normalize_result_confirmations`가 제안 진입·재제안 시 `[제안자]`로, none/disputed 전이 시 `{}`로 초기화한다(confirmed는 이력 보존). `disputed_by uuid`(0061) = 이의(dispute)·정정(reopen)으로 disputed를 만든 **가장 최근** 좌석. `dispute_count int`(0062) = dispute/reopen 누적 횟수. **협상 이력 컬럼(`proposed_*`·`dispute_reason`·`disputed_by`·`dispute_count`)은 상태 전이로 지워지지 않는다 — 현재 상태를 말하는 것은 `result_status` 하나이고, 같은 트리거의 유일한 초기화는 `result_status='none'`(협상 시작 전)이다(0062).** 그래서 재제안으로 proposed가 되어도 "누구의 이의에 대한 재입력인가"를 화면이 말할 수 있고, `dispute_count > 0`이 그 경기를 확정까지 이의 버킷(카드의 이의 맥락 배지)에 붙잡는다(이의자가 탈퇴해 `disputed_by`가 null이 되어도 사실이 남으므로 카운터가 권위 있는 술어다. 탭 위치는 Week 38부터 차례 축을 따른다 — 내 차례면 「승인 요청 › 이의 신청」, 상대 차례면 「상대 승인 대기」). 0061 이전 행은 `disputed_by` null(이의자 미상 → 앱은 '이의 제기됨' 폴백 문구), 0062 이전에 확정된 행은 카운터 0 |
| `rotation_session_participants` | 로테이션 **일정**의 참여 동의 (0057). `{session_id, user_id, participation_status(pending/accepted/rejected/removed), responded_at}` — `removed`(0059)는 주최자의 제외로 거절과 같은 성질의 이력이다(둘 다 명부에서는 빠지지만 좌석은 남아 '다시 초대'할 수 있다 — 좌석을 지우면 이름조차 알 수 없어져 재초대 진입점이 사라진다), PK `(session_id,user_id)`. `is_rotation_session_party(session_id)` SELECT, 쓰기 정책 없음(트리거·RPC 전용). **이름·NTRP 스냅샷 컬럼도 role 컬럼도 없다** — `rotation_sessions.players`가 이미 명부이고, 세션에는 좌석이 아니라 풀만 있다. 소유자 행도 없다(세션을 만든 것이 곧 동의). 좌석 생성은 트리거 `sync_rotation_session_participants`(`AFTER INSERT OR UPDATE OF players, room_id`)가 `players`의 활성 회원에서 파생하고, 풀에서 빠진 좌석은 지우되 `rejected`는 남긴다(주최자가 누가 거절했는지 봐야 한다). 방 세션은 '입장 = 동의'라 `accepted`로 시작하고, 리스트 노출로 승격되는 순간 남은 `pending`도 일괄 `accepted`가 된다(세션 초대 카드와 `RoomInviteCard`의 이중 노출 방지). 등록 이후의 명부 편집은 `add/remove_rotation_session_player`(0058)가 유일한 경로다 |
| `rotation_sessions` | SELECT는 본인 ∪ 방 참가자(`is_room_participant`, 0050) ∪ **세션 좌석 보유자**(`is_rotation_session_seat`, 0057). 앞 두 항은 컬럼 비교로 둔다 — 정책식이 `rotation_sessions`를 되읽으면 `INSERT … RETURNING`이 42501로 깨진다(STABLE 함수가 그 문장이 방금 넣은 행을 자기 스냅샷에서 못 본다). 세션을 되읽는 `is_rotation_session_party`는 참가자 테이블 정책 전용. INSERT/DELETE는 본인. UPDATE 정책은 없다(풀 조작은 SECURITY DEFINER 함수 전용). 로테이션 복식 선수 풀(`players` jsonb)만 보관하고, 게임은 `finalize_rotation_session` RPC(security definer)가 `personal_matches`+`personal_match_participants`로 분해한다(`notes`는 세션 소유자가 입력할 때만, `court_name`·`room_id`는 모든 게임에 상속). 통계 밖. **방 세션은 finalize가 세션을 지우지 않는다**(0050) — 참가자 여러 명이 각자 입력해야 하므로, 종료는 방장의 `close_rotation_room`이 한다. **좌석이 있는 방 밖 세션도 finalize가 남긴다**(0057) — 수락자 누구나 각자 입력하므로, 종료는 소유자의 세션 삭제가 한다. 좌석 0행(풀 전원 비회원)인 순수 개인 세션만 종전대로 finalize가 삭제. `room_id`(0046)가 있으면 매칭 리스트 방 — 세션 행이 남아 있는 동안 입장자가 `players`에 자동 append(`join_match_room_as_player`, 0048; NTRP가 없으면 명단만 참가하고 풀 append는 건너뛴다, 0050) |
| `match_rooms` | 매칭 리스트의 방(0046). 로그인 회원 전원 SELECT(공개 메타: 일시·타입·표면·코트명·메모·`is_settled` — 정원 `capacity`는 0048에서 제거), DELETE는 `host_user_id` 본인. INSERT/UPDATE 정책 없음 — 생성은 `create_match_room` RPC, 메타는 `personal_matches` 트리거(direct·방장만 복사), `is_settled`는 `recompute_match_room_settled`가 재계산(0049). 출처 3테이블(`personal_matches`/`match_requests`/`rotation_sessions`)의 `room_id` FK(on delete set null)가 역참조한다. `room_id`를 붙인 INSERT는 여전히 방장만 가능하고(참가자의 방 게임은 `create_room_game` RPC 전용), UPDATE는 방 참가자면 허용(`is_room_participant` — 로테이션 관점 복사본 수정). 기록 삭제 시 방은 참조 행이 하나도 남지 않을 때만 트리거가 삭제 |
| `match_room_secrets` | `room_id` 1:1 + bcrypt(pgcrypto) `password_hash`. RLS on·정책 0개 — SECURITY DEFINER RPC(`create_match_room`/`enter_match_room`/`update_match_room_password`)만 접근 |
| `match_room_members` | `{room_id, user_id, role(host/player), status(invited/joined/declined), source_role}` unique(room_id,user_id) — viewer 역할·requested 상태는 0048에서 폐지(비밀번호 입장 = `player/joined`). 전원 SELECT(id·상태만, 이름은 `get_match_room_detail` 게이트), 쓰기는 RPC·트리거 전용. 나가기는 `leave_match_room`(0054)이 `declined`로 전이하고 미확정 로테이션 풀에서도 빼며, 방장은 나갈 수 없다(`host_cannot_leave` — 방장의 퇴장은 '리스트에서 내리기'). 확인 요청 대표는 초대 행 없이 `accept_match_request`가 `player/joined` insert, 거절/취소는 트리거가 방 삭제. 참가자 프로필(NTRP·손잡이)은 `fetchRoomParticipantCandidates`가 users 조인으로 읽어 게임 구성 자동완성에 쓴다. `create_room_game`은 상대·복식 회원 참가자가 전부 `joined`인지 확인한다(0049) |
| `ai_coaching_cache` | 본인 통계 묶음 해시 기반 캐시 (24h) |
| `club_player_ratings` / `club_rating_history` | approved 멤버만 SELECT, 쓰기는 RPC로만. `club_rating_history.match_id`는 재설계 후에도 `match_game_matches(id)` FK 유지 |
| `club_invites` | owner만 관리, 미리보기·가입은 SECURITY DEFINER RPC로만 |

헬퍼 함수: `is_club_owner(club_id)`, `is_club_approved_member(club_id)`, `is_club_owner_or_officer(club_id)`, `is_request_party(request_id)`, `is_rotation_session_party(session_id)`·`is_rotation_session_seat(session_id)`(0057 — 앞은 참가자 테이블 정책용, 뒤는 세션 정책용. 세션 정책이 세션을 되읽으면 RETURNING이 깨져 둘로 나눴다) (SECURITY DEFINER — 정책식이 참가자 테이블을 직접 참조하면 상호 재귀에 빠지므로 우회)
RPC: `create_match_game`, `update_match_game` (참가자 배열 `[{user_id,side,is_ad}]`로 단식/복식 통일 INSERT), `add_guest_player` (트랜잭션 단위)
RPC: `get_user_match_stats_v2`, `get_user_head_to_head`, `get_user_doubles_court_stats`, `get_user_partner_stats` (각 단일 함수, `p_club_id` 선택 인자로 기존 오버로드 2종 통합 — `match_game_participants` 기반 재작성)
RPC: `get_club_activity_ranking`, `get_club_win_rate_ranking`, `get_club_member_counts` (클럽 대시보드 집계, 참가자 테이블 기반)
RPC: `apply_club_rating_snapshot` (레이팅 영속화), `get_invite_preview`·`join_club_via_invite` (초대 링크)
RPC: `add_rotation_session_player(session_id, user_id)`·`remove_rotation_session_player(session_id, user_id)` (0058 — 등록 이후 선수 풀 편집. **방 밖 세션 전용**(방은 '비밀번호 공유 = 초대' 모델이라 명단의 권위가 `match_room_members`다). 추가는 소유자 ∪ 수락한 참가자, 제거는 소유자만. 좌석 생성·거절자 재초대(rejected → pending) 복귀는 0057 트리거가 대신하므로 RPC는 `players`에 append/remove만 한다), `respond_rotation_plan(session_id, accept)` (0057 — 로테이션 **일정**(경기 전) 초대에 대한 참여 응답. 거절은 그 사람만 풀에서 빼고 세션은 남긴다 — `mark_request_participant_response`가 한 명의 거절로 요청 전체를 끝내는 것과 정반대이고, 그 비대칭이 일정과 기록 1건의 차이다. ⚠ 0056의 `respond_rotation_participation`(finalize가 만든 게임 파생 요청들의 일괄 응답)과 혼동 금지 — 두 함수에 서로를 가리키는 comment가 달려 있다. **0063부터 두 함수는 대칭이다** — 어느 쪽을 불러도 좌석·게임 요청 두 축이 함께 움직이고 폴백 관점 행까지 따라잡으므로 최종 상태가 같다), `rotation_seats_accepted(session_id, uids)` (0057 — 게임의 회원 좌석이 전부 세션 수락자인가. 좌석 행이 없는 세션 소유자는 수락자로 센다), `backfill_rotation_perspectives(session_id, user_id)` (0063 — finalize 폴백 게임(상대팀 전원 비회원 → 즉시 확정)의 회원 파트너가 **뒤늦게** 수락했을 때 그의 관점 행을 따라 만든다. 그 게임은 `opponent_user_id`가 not null이라 `match_requests`를 가질 수 없어 materialize 경로를 타지 못한다 — 수락 RPC 둘이 이 함수를 부르는 것이 유일한 보완 경로다. 멱등)
RPC: `create_match_request` (요청 원장 + 복식 참가자 2행 원자적 생성 — 참가자 행의 참여 상태는 트리거가 파생한다(0056) — 참가자 정규화로 직접 INSERT 폐지. 0043에서 `p_court_name` 인자 추가, 9인자 구버전 drop)
RPC: `accept_match_request` (대표의 **참여 수락** — 0056부터 `opponent_accepted_at`만 찍고 게이트(`maybe_materialize_request`)에 넘긴다. 방 밖 복식은 회원 좌석 전원이 수락해야 기록이 생기므로 이 호출만으로는 personal_matches가 안 생길 수 있다. 시그니처·에러코드는 불변)
RPC: `maybe_materialize_request` (전원 수락 게이트의 **단일 초크포인트**, 0056 — 요청 행 락으로 동시 수락을 직렬화하고, 미수락 활성 회원이 없으면 `materialize_accepted_request` 후 status를 accepted로 옮긴다. 두 번 통과할 수 없다), `respond_request_participation(request_id, accept)` (파트너·상대2의 참여 수락/거절 — 반환값 = 내가 마지막 수락자였는지), `respond_rotation_participation(session_id, accept)` (로테이션 세션 단위 일괄 응답 — 한 세션에서 같은 회원이 게임마다 대표이거나 파트너라 요청별로 쪼개면 역할을 바꿔가며 여러 번 눌러야 한다), `reject_match_request` (대표·회원 참가자 공용 거절 — 복식은 네 자리가 다 있어야 성립하므로 한 명의 거절이 요청 전체를 끝낸다. 종전 앱의 직접 UPDATE는 참가자가 부르면 0행이 조용히 지나갔다). 내부 헬퍼 `mark_request_opponent_response`·`mark_request_participant_response`는 자격이 없으면 raise가 아니라 false를 돌려준다(세션 일괄 RPC가 역할을 미리 모른 채 두 축을 차례로 시도한다)
RPC: `request_seat_of(request_id, user_id)`·`normalize_to_requester_perspective(sets, seat)` (0059 — 결과 협상 축의 좌석 판정과 제안 관점 정규화. **열람 축 is_request_party(0052)와 다른 축**이고 authenticated에서도 EXECUTE를 회수해 **RLS 정책에 쓸 수 없게** 막아 뒀다. `request_result_team`은 0060에서 drop), `request_result_seats(request_id)`·`settle_match_result(request_id)` (0060 — 확인 분모 = 활성 회원 좌석 전원 / 정산 = 0059 confirm의 4행 UPDATE 추출. 둘 다 내부 전용), `propose_match_result`·`confirm_match_result`·`dispute_match_result`·`reopen_match_result`(이의·정정은 `disputed_by = auth.uid()`를 남기고 `dispute_count`를 올린다, 0061·0062. propose·settle은 `dispute_reason`을 지우지 않는다 — 협상 이력 보존, 0062) (match_result_negotiations에 대해 제안/확인/이의/**정정**(0055 — 확정된 결과를 disputed로 되돌리고 이 요청에서 파생된 personal_matches 전 행의 세트를 비운다. 직전 확정값은 `proposed_set_scores`로 남아 재제안에 프리필된다) — **confirm은 좌석별 확인을 `confirmed_by`에 더하고 활성 회원 좌석 전원이 확인한 순간에만 `settle_match_result`로 관점 행 전부를 확정, boolean(정산됐는가) 반환**(0060, 멱등 — 이미 확인한 좌석의 재호출도 완성 판정은 수행). 상대 행은 `invert_set_scores`로 관점 반전, 복식 애드 보존). helper `invert_set_scores`(애드 교차 반전)·`validate_set_scores`(애드 enum)·`normalize_set_scores`·`derive_public_ntrp` (`personal_match_winner` 세트 다수결은 0045에서 제거)
RPC: `get_rotation_session_games(session_id)` (0064 — 세션에 등록된 **대표 게임 전량**을 좌석 보유자 ∪ 소유자 ∪ 방 참가자에게. `personal_matches` RLS가 '본인만'이라 앱 필터로는 남의 게임을 볼 수 없어 SECURITY DEFINER로 넘는다(`get_match_room_detail` 관용구). 두 출처(`personal_matches` is_perspective=false + 0064 이전 선적립된 pending 요청)를 SQL이 union한다 — 빌더의 「이 일정에 등록된 게임」이 중복 입력을 눈으로 막는 근거)
RPC: `finalize_rotation_session(session_id, games, expected_seq?)` (로테이션 세션 → 게임별 기록 분해, 한 트랜잭션. **방 밖 세션은 좌석이 전원 응답해야 진입할 수 있고**(0064 `session_seats_pending` — 소유자도 예외가 아니다. ⚠ 신원 검사가 pending 검사보다 먼저여야 세션 존재가 새지 않는다), `p_expected_seq`가 서버의 다음 번호와 다르면 `session_games_changed`로 거부한다(낙관적 선점 — 세션 행 `for update`가 이미 채번을 직렬화하므로 새 컬럼·인덱스가 없다). **페이로드의 기준 '나'는 세션 소유자가 아니라 호출자**(0050) — 방 세션이면 참가자 누구나 자기 기준으로 넣고, 상대팀에 회원이 있으면 `match_requests`(accepted) + `materialize_accepted_request` + `propose_match_result`로 제안→확인 경기가 되며, 상대팀 전원 비회원일 때만 즉시 확정 폴백으로 남는다. `group_seq`는 `personal_matches`와 `match_requests` **양쪽의** max에서 이어붙이고(0057 — 미수락 회원이 낀 게임은 기록을 만들지 않으므로 personal_matches만 세면 다음 게임이 같은 번호를 다시 쓴다. 세션 행 `for update` 락이 동시 저장을 직렬화) 회원 슬롯은 세션 풀 ∪ 방 참가자 ∪ 소유자 − **세션 거절자**(0057) allowlist로 위조를 막는다. 방 밖 세션도 **참여를 수락한 좌석 보유자**가 입력할 수 있고(0057), 그 게임의 회원 좌석이 전부 세션 수락자면 방 게임과 동일하게 즉시 관점 행을 만든다(`v_immediate` — 세션 수락이 게임 참여 동의를 대신하므로 게임별 재수락이 없다). 세션 삭제는 좌석이 0행일 때만. 0044부터 게임당 세트 배열 길이 1만 허용), `close_rotation_room(room_id)` (0050 — 방장이 게임 입력을 종료: 세션 삭제 + 정산 재계산)
RPC: `create_match_room(kind, source_id, password)` (출처 행에서 메타·초대 대상 파생, secrets 해시, host+invited 멤버, 출처 `room_id` set — `search_path = public, extensions`), `enter_match_room` (bcrypt 비교 → 내부 헬퍼 `join_match_room_as_player`: `player·joined` upsert + 미확정 로테이션이면 세션 `players` jsonb append, 권한 전부 회수), `respond_room_invite`, `update_match_room_password`, `get_match_room_detail` (멤버 게이트 후 방·방장·멤버·출처·방의 대표 게임 jsonb — 작성자·출처·결과 상태 포함, 세트 없는 게임 포함), `leave_match_room` (0054 — 참가자 퇴장: 멤버 행 `declined` + 미확정 로테이션 풀에서 제거. 기록은 남는다). 풀 합류 신청 RPC 3종(`request/approve/reject_room_join`)은 0048에서 drop. 트리거 `sync_match_room_from_personal_match`(insert/update/delete 3개 트리거 — 메타 복사 + 정산 재계산)·`sync_match_room_from_request`·`cleanup_match_room_on_personal_match_delete`(참조 행이 없을 때만 방 삭제)·`cleanup_match_room_on_request_close`·`invite_room_member_from_participant`(이미 참가 중인 회원은 `source_role`만 갱신). 새 RPC는 anon EXECUTE를 명시 회수(Supabase 기본 권한이 자동 부여)
RPC: `create_room_game(room_id, opponent_user_id, partner, opponent2, replace_match_id)` (0049 — 방 참가자가 만드는 방 게임: 참가 자격·상대 검증 후 `match_requests`를 `accepted`로 insert → `materialize_accepted_request` → 모집 중이던 내 seed 자유 기록 치환. **순서 고정** — seed를 먼저 지우면 cleanup 트리거가 방을 지운다), `materialize_accepted_request(request_id, rotation_session_id?, group_seq?)` (수락된 요청 → 관점 행들. `accept_match_request`에서 추출해 공용화, 방 게임이면 회원 파트너·상대2 행까지 4행. 로테이션 그룹 키는 인자로 받아 insert 시점에 심는다 — 사후 UPDATE는 방 정산 트리거를 행마다 깨운다, 0050), `copy_personal_match_perspective`·`swap_partner_perspective`(팀 안쪽 관점 반전 — `invert_set_scores`가 팀을 가로지르는 반전이라면 이쪽은 나↔파트너)·`swap_opponent_perspective`(상대팀 안쪽 반전 — 대표가 상대2라 슬롯을 스왑할 때 애드 교차, 0050)·`resolve_rotation_player`(페이로드 선수를 users에서 재해석해 위조 무력화, 0050)·`is_room_participant`·`is_active_member`·`recompute_match_room_settled` (정산 재계산). `confirm_match_result`는 방 게임의 파트너·상대2 관점 행까지 함께 확정
View: `user_match_participations` (security_invoker=on, `match_game_participants` 기반 재작성 — 4-way UNION 제거)
마이그레이션: 0001~0064 (0016부터 로컬 `supabase/migrations/*.sql`로 버전관리, 0001~0015는 MCP `apply_migration` 이력, 0039~0041이 재설계, 0042는 finalize_rotation_session RLS 잠금 결함 수정, 0043은 코트명 `court_name` 3테이블 + RPC 3종 스레딩, 0044는 로테이션 그룹 키 `rotation_session_id`·`group_seq` + 레거시 백필, 0045는 세트 다수결 `winner` 컬럼·`personal_match_winner` 제거 + RPC 3종 재정의, 0046은 매칭 리스트 `match_rooms`/`match_room_secrets`/`match_room_members` + 출처 `room_id` + RPC 8종·트리거 3종, 0047은 모집형 방(`rotation_sessions.players` ≥3 완화, `invite_room_member_from_participant` 트리거), 0048은 정원 없는 방(`capacity` 컬럼·viewer/requested·합류 RPC 3종 제거, `join_match_room_as_player` 헬퍼, 게임 다건 대응 cleanup 트리거), 0049는 방 게임 상호 확인화(`create_room_game`·`materialize_accepted_request` 추출·`swap_partner_perspective`·관점 복사본, `has_result`→`is_settled` + `recompute_match_room_settled`, finalize security definer 전환, `personal_matches_update` RLS 참가자 완화), 0050은 미확정 로테이션 방의 참가자 공유화(`personal_matches.is_perspective` + primary 술어 통일, finalize 앵커를 호출자로·제안→확인 경로·세션 보존, `close_rotation_room`, `rotation_sessions_select` 방 참가자 개방, `respond_room_invite`가 풀 append 재사용, `ntrp_missing` 입장 롤백 완화), 0051은 `personal_matches.has_result` 생성 컬럼 + 미확정/확정 부분 인덱스, 0052는 확인 요청 SELECT 확장(`is_request_party` + 정책 3종 교체 — 복식 파트너·상대2가 협상을 읽기만), 0053은 복식 관점 행의 방 안팎 통일(`materialize_accepted_request`의 복사 조건에서 `room_id` 제거 + `confirm_match_result`에 파트너·상대2 행 수 단언 `perspective_row_missing`), 0054는 방 참가자 게임 INSERT 완화(`personal_matches_insert` → `is_room_participant`)와 방 나가기(`leave_match_room`), 0055는 확정 결과 정정(`reopen_match_result`), 0056은 방 밖 요청의 **참여 전원 동의**(`match_request_participants.participation_status` + `match_requests.opponent_accepted_at`·`rotation_session_id`/`group_seq`, 게이트 `maybe_materialize_request`, 응답 RPC 3종, `finalize_rotation_session`의 대표 결정에서 `room_id` 게이트 제거, `join_match_room_as_player`가 방 요청의 참여 수락을 겸함, `materialize_accepted_request` 이중 실행 가드 + 협상 행 보존), 0057은 로테이션 **일정**의 참여 동의(`rotation_session_participants` + 트리거 `sync_rotation_session_participants`, 헬퍼 `is_rotation_session_party`로 `rotation_sessions_select` 좌석 개방, 응답 RPC `respond_rotation_plan`, `rotation_seats_accepted` + finalize의 `v_immediate`·수락자 입력 허용·거절자 배제·좌석 있는 세션 존속·group_seq 채번을 요청까지 확장), 0058은 등록 이후 **풀 편집**(`add_rotation_session_player`/`remove_rotation_session_player` — 방 밖 세션 전용, 추가는 소유자∪수락자·제거는 소유자만)과 **이중 수락 제거**(`respond_rotation_plan`이 그 세션의 게임 요청에 응답을 흘리고, `default_participation_status`·신규 `default_request_opponent_response` 트리거가 좌석·대표 기본값을 일정 수락에서 파생시킨다), 0059는 **결과 협상을 팀 단위로**(좌석 헬퍼 `request_seat_of`/`request_result_team`, 관점 정규화 `normalize_to_requester_perspective`, propose/confirm/dispute/reopen 자격을 좌석 4개 전원으로 + 팀 담합 가드 `cannot_confirm/dispute_teammate_proposal`)와 로테이션 좌석 `removed`(제외도 거절처럼 이력을 남겨 재초대 진입점을 지킨다), 0060은 **결과 확정을 회원 좌석 전원 만장일치로**(`match_result_negotiations.confirmed_by uuid[]` + BEFORE 트리거 `normalize_result_confirmations`, `request_result_seats`·`settle_match_result` 헬퍼, confirm boolean 반환·멱등 재작성, 팀 담합 가드·`request_result_team` 제거, proposed 5건 백필), 0061은 **이의 제기자 기록**(`match_result_negotiations.disputed_by` + dispute/reopen이 호출자 기록 + `normalize_result_confirmations`가 disputed 밖에서 null 초기화 — 허브 3탭화의 전제, 백필 없음), 0062는 **협상 이력 보존**(`match_result_negotiations.dispute_count` + propose·settle에서 `dispute_reason = null` 제거 + dispute·reopen이 카운터 증가 + `normalize_result_confirmations`의 초기화를 `result_status='none'`으로 축소 — 재제안 뒤에도 이의자·사유가 남아 이의를 거친 경기를 확정까지 「이의 처리」 탭에 붙잡는다. 현재 disputed 행만 1로 백필)), 0063은 **로테이션 참여 동의의 대칭 완성**(`respond_rotation_participation`이 세션 좌석까지 움직이고 — 0056의 '개인 세션 행은 이미 삭제됐다' 전제가 0057 §(d)로 무효화된 것을 뒤늦게 반영 — 두 수락 RPC가 `backfill_rotation_perspectives`로 폴백 관점 행을 따라잡으며, `create_match_request`가 스코어를 거부(`set_scores_not_allowed`)하고 CHECK `match_requests_offroom_no_scores`가 방 밖 요청의 빈 배열을 강제한다), 0064는 **로테이션 결과 입력의 「전원 수락」 게이트**(finalize 진입 가드에 `session_seats_pending` — 0057의 선입력 장치 철회, 소유자 예외 제거 + 세션 게임 목록 공유 RPC `get_rotation_session_games` + 낙관적 선점 `p_expected_seq`/`session_games_changed`, 2인자 시그니처 drop)

## 도메인 어휘 (코드·주석 일관성 기준)

| 용어 | 설명 |
|---|---|
| **MatchGame** | 하루 단위 대진표 (여러 경기 포함) |
| **Match** | 개별 경기 (1 코트 × 1 타임슬롯) |
| **is_fixed** | 결과 확정 상태 — true면 수정 잠금 + 통계 집계에 반영 |
| **winner_id** | 외래키가 아닌 사이드 식별자 리터럴 (`'team1'` \| `'team2'` \| `'draw'`). 단식에서 player1 = team1, player2 = team2. 대진표는 경기 1건 = 게임 1개라 이 값은 **그 게임의 승자**이며, 클라이언트가 아니라 `saveMatchResultAction`이 스코어에서 파생한다(`resolveGameWinner`) |
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
| **로테이션 복식 / 로테이션 세션** | 4명 이상 파트너 교대(아메리칸) 복식. **복식 신규 등록의 기본 모드**다(`doublesMode` 기본값 `'rotation'`). 등록 시 선수 풀만 `rotation_sessions`(세션)에 저장하고, 카드 '결과 입력' 게임 빌더에서 게임(파트너·상대1·상대2 + 스코어 1줄)을 구성하면 게임별 개인 경기 레코드로 분해 저장(`rotation_session_id`·`group_seq`로 목록에서 한 묶음) |
| **로테이션 일정 / 세션 참여 동의** | 세션은 **경기 전의 일정**이고 요청은 **경기 후의 기록**이다 — 0057이 세운 경계. 등록하면 풀의 회원 전원에게 참여 요청이 가고(`rotation_session_participants`, 방 밖 세션만), 수락자는 그 일정을 자기 허브에서 보며 결과 입력에도 참여한다. **거절은 그 사람만 풀에서 뺀다**(세션은 유지 — 5명 중 1명이 못 와도 나머지는 친다). **세션 수락이 그 세션 게임의 참여 동의를 대신**하므로 결과 입력 후 게임별 재수락이 없다('비밀번호 입장 = 참여 동의'와 같은 원리이고, 결과 스코어 확정은 종전대로 상대팀 대표가 확인한다). 노출을 켜면 방 초대가 이 축을 대신한다(좌석은 `accepted`로 승격). 등록 뒤에도 **주최자·수락자가 회원을 초대**할 수 있고 거절한 사람을 다시 부르면 좌석이 '수락 대기'로 돌아온다(0058, 제거는 주최자만). 앱 경계는 순수 함수 `canEnterRotationResult`(= DB finalize 진입 가드의 거울)·`canManageRotationPool`·`classifyRotationSession`. **초대한 회원이 전원 응답해야 결과를 입력할 수 있다**(0064 — 앱 `hasUnansweredSeats`, DB `session_seats_pending`). ⚠ 0057~0063에는 정반대 규칙이 있었다: 주최자는 수락을 기다리지 않고 먼저 넣을 수 있었고 그 스코어는 pending으로 선적립됐다가 되살아났다. 0063은 그것을 의도적 설계로 판정했고 데이터 정합 관점에서는 옳았지만(미수락 좌석이 낀 게임은 `personal_matches` 0행이라 0056 불변식을 지켰다), **사용자에게는 같은 경기를 두 번 승인하는 화면**이었다 — 「일정 초대」와 「게임 참여 확인」이 잇따라 도착했다. 0063이 상류 중복 제거로 증상을 덮은 자리를, 0064가 그 상태를 만들지 않는 것으로 대체했다. 되돌리기 전에 이 문단을 읽을 것. 대가인 "한 명이 응답하지 않으면 기록 불가"의 탈출구는 **주최자가 명단에서 빼고 게스트로 기록하는 것**이고(0058 `remove_rotation_session_player` 재사용), 그 진입점은 「상대 대기」 탭의 세션 카드 → 참가자 편집이다. 세션에 등록된 게임은 좌석 보유자 전원이 `get_rotation_session_games`로 함께 보고(0064), 저장 시 `p_expected_seq`가 다른 참가자의 선점을 감지한다 |
| **게임(세트)** | 동호인 경기는 세트 1개 = 게임 1개. DB `set_scores` 배열 원소 하나가 게임 하나이며 통계·레이팅·월별 전적·카드 표시 모두 게임 단위(`resolveSetWinner`·`tallySets`). 행 단위 승자(세트 다수결)는 없다 — 0045에서 `winner` 컬럼·`personal_match_winner`·`resolveMatchWinner` 폐기. 목록도 게임 단위로 보여준다: 게임 2개 이상인 행은 헤더로 감싼 **게임 카드 N장**(`buildMatchGroups`의 multi)이고, 배지·색 바·스코어 칩 색은 `lib/personal-matches/result-badge.ts` 단일 출처다. 클럽 대진표도 경기 1건 = 게임 1개이며 승자는 `resolveGameWinner`가 그 게임의 점수로 정한다(세트 다수결 `getWinnerSide` 폐기). UI 용어는 '게임'(코드 식별자 `setScores`·`validateSetScores`는 유지) |
| **확인 요청 / 상호 확인 경기** | 회원 간 단식·페어 고정 복식 대진 요청(`match_requests`, pending→accepted/rejected/canceled — 생성은 `create_match_request` RPC 전용). 복식은 상대팀 회원 1명이 **대표 확인자**(`opponent_user_id`, 상대1→상대2 순 회원 자동 선택·슬롯 스왑), 파트너/상대2는 `match_request_participants`. **참여 동의는 회원 좌석 전원**(0056, 방 밖 요청 한정) — 대표가 수락해도 파트너·상대2가 각자 수락해야 기록이 생기고, 한 명의 거절이 요청 전체를 끝낸다. 전원 수락 순간 `materialize_accepted_request`가 회원 참가자 전원의 관점 행을 만든다(`source_type='confirmation'`, `source_request_id` 표식, 수정/삭제 잠금). 매칭 룸 안에서 만들어진 요청은 '비밀번호 입장 = 참여 동의'라 종전대로 대표 1명 모델을 쓴다 — 그 경계가 순수 함수 `requiresAllMembers` 하나다. **결과(스코어) 확정 권한은 그대로 요청 당사자 2명**(요청자·대표)뿐이다 |
| **코트명 / 경기 시각** | `court_name`(선택, ≤40자, 자유 텍스트) — 대진표 `match_game_courts.label`과 별개. 등록 폼에서 본인 과거 코트명을 '최근 코트'로 재선택. 경기 시각(`played_time`)은 시 단위만 입력(`HH:00` 저장, 카드에 'N시' 표시) |
| **결과 미확정** | `personal_matches.set_scores`가 빈 배열(`hasResult` false) — 게임 스코어 없이 등록된 개인 경기. 카드에 '미확정' 배지, 통계·레이팅·AI 코칭 집계에서 제외(`explodePersonalMatchSets`). 카드 '결과 입력' 팝업에서 게임 스코어가 등록되면 확정 |
| **매칭 리스트 / 매칭 룸** | 개인 경기 등록 폼에서 '매칭 리스트에 노출'을 켠 기록이 방(`match_rooms`) 1개가 된다. 로그인 회원 전원이 목록(자동 제목 = 일시·코트명·경기 타입, 방장, '참가 N명')을 보고, **비밀번호**(4~20자, `match_room_secrets`에 bcrypt)를 아는 회원만 상세(참가자·메모·게임)에 **입장**(= 참가, 재입장 시 생략). **정원은 없다**(0048) — 단식 방에 4명이 들어와 단식을 돌아가며 칠 수도 있다. 방 제목 필드 없음. 방 삭제('리스트에서 내리기')는 기록을 남기고 `room_id`만 푼다. 목록은 **진행 중 / 내가 참여한 / 종료된** 3탭이고(`lib/match-rooms/tabs.ts`), 진행/종료 분리는 `is_settled`(정산 완료) 또는 날짜 경과 기준이다(0049). '내가 참여한'은 다른 두 탭과 교차하는 관점 필터(`isViewerInvolved` — 초대 대기 포함, 거절 제외)라 종료된 방도 남는다. 탭별 필터·정렬·페이지는 서버가 처리하고 페이지는 keyset 커서로 넘긴다(`room-cursor.ts`) |
| **방 게임** | 방에 참가한 회원이 함께 친 게임을 올린 기록(0048 도입, 0049에서 참가자 전원 개방). 매칭 룸 상세 '게임 추가' → **룸 안 다이얼로그**(`RoomGameDialog`, 메타는 방 값으로 고정, 자동완성 최상단 '방 참가자')에서 참가자만 입력한다(`/me/personal-matches/new?room=`은 룸으로 리다이렉트). 결과 입력·확인도 룸 안에서 끝난다(`RoomGameActions`). 상대가 회원이면 **상호 확인 게임**(`create_room_game`)이 되어 회원 참가자 전원(복식은 4명)의 기록에 미확정으로 남고, 결과는 한쪽이 제안하고 상대 대표가 확인하면 동시에 확정된다 — 방 입장이 곧 참여 동의라 요청 수락 단계는 없다. 비회원 상대는 방에 참가한 회원 누구나 자유 기록으로 남긴다(0054 — 종전 방장 전용). 최초 노출 기록(모집 중)은 수정 폼('참가자 채우기')에서 채우며, 회원으로 채우면 그 seed는 상호 확인 게임으로 치환된다. 미확정 로테이션 방은 게임 빌더가 담당 — 입장자가 풀에 자동 추가되고, 방에 참가한 회원 누구나 **룸 안 [게임 입력]** 또는 확인 요청 허브의 '결과 입력 대기 로테이션' 카드에서 **자기 기준으로** 게임을 넣는다. 상대팀에 회원이 있으면 그 게임도 제안→확인을 거치고, 전원 비회원인 게임만 즉시 확정된다(0050) |
| **모집 중 경기** | 리스트에 노출하면서 참가자를 비워 둔 기록(0047). 카드 배지 '모집 중'(`isRecruiting`), 결과 입력 불가. 참가자를 비울 수 있는 조건은 **신규 등록 + 노출** 또는 **노출된 기록 + 결과 없음** — "세트가 있는 기록은 라인업이 완성돼 있다"가 통계 집계의 불변식이다. 폼은 빈 슬롯을 미리 그리지 않고 '+ 참가자 추가'로 연 슬롯만 보여 주며(복식은 역할 선택), 연 슬롯은 NTRP까지 필수 |
| **관점 행 / 정산(is_settled)** | 복식 상호 확인 경기는 **방 안팎을 가리지 않고** 회원 참가자 **전원**에게 각자 관점의 `personal_matches` 행이 생긴다(0049 방 게임 → 0053에서 방 밖까지 확대. 그 전에는 방 밖 복식에서 회원 파트너의 전적에 경기가 통째로 빠졌다). 관점 변환은 대표=`invert_set_scores`(팀 가로지르기), 파트너=`swap_partner_perspective`(나↔파트너), 상대2=둘의 합성이며 참가자 슬롯도 함께 재배치된다. 방 상세 게임 목록은 중복을 피해 **대표 게임 한 벌**만 보여준다 — 판정 기준은 `is_perspective = false`(0050, 종전의 '로테이션은 방장 행' 가정을 대체한다. 앵커가 입력자로 바뀌어 방장이 아닌 원본 행이 생기기 때문). `match_rooms.is_settled` = 대표 게임이 1건 이상이고 전부 확정 + 대기 중인 요청·미확정 로테이션 세션 없음. `confirm_match_result`는 요청자·대표 2행을 `= 1`로, 회원 파트너·상대2 행을 `perspective_row_missing`으로 단언한다(0053) |
| **방 초대 / 참가** | 기록에 입력된 회원(단식 상대·복식 파트너/상대2·로테이션 풀)은 방 생성 시 `player/invited`로 자동 초대되고, 확인 요청 허브 '경기 참여 확인' 섹션에서 수락하면 `joined`(참가). 확인 요청 대표는 초대 행 없이 요청 수락(`accept_match_request`)이 곧 참가. **비밀번호 입장자도 곧바로 참가**(`player/joined`, 0048) — 미확정 로테이션 방이면 `rotation_sessions.players`에도 추가된다(합류 신청·승인 없음) |
| **작업 큐 / 내 차례** | 확인 요청 허브(`/me/match-requests`)가 미확정 전량을 담는 단일 작업 큐다. 분류는 순수 함수 `classifyPendingMatch`(`lib/match-requests/queue.ts`)가 미확정 `personal_matches` 1행을 **confirmResult(상대 제안 확인) / enterResult(내가 입력) / fillLineup(참가자 채우기) / awaitingCounterpart(상대 대기) / reenterResult(이의 · 다시 입력할 차례) / awaitingReentry(이의 · 재입력 대기) / reentryReview(이의 · 재입력된 결과 확인) / awaitingReentryConfirm(이의 · 재입력 결과 확인 대기)** 여덟 버킷 중 하나로 보낸다(이의 네 버킷은 0061·0062 — disputed 판정과 이의 이력 판정이 모두 좌석 폴백보다 앞이라 이의를 거친 행은 언제나 이의 맥락 배지를 단다). **허브는 2단 탭이다(Week 38)**: 최상위는 **차례 축** 하나 — 「승인 요청」(지금 내가 할 일) / 「상대 승인 대기」(`?tab=waiting`, 공이 상대에게) — 이고, 승인 요청 안은 **생애 축**으로 「초대」(participation = pending 요청·일정 초대·방 초대) / 「경기 결과 확정」(`?tab=result` = confirmResult 승인 + enterResult·로테이션 세션 + fillLineup) / 「이의 신청」(`?tab=dispute` = reentryReview + reenterResult)으로 갈린다. **이의 대기(awaitingReentry·awaitingReentryConfirm)는 상대 승인 대기에 그린다** — 0062의 "이의를 거친 경기는 확정까지 이의 탭에 머문다"를 철회했다. 이유: 사용자가 정의한 승인 요청은 "내가 승인할 것"이고, 이의자가 자기 분쟁을 추적하는 수단은 탭이 아니라 카드의 `ReentryContextBadge`·`DisputeReasonLine`이다(데이터 `dispute_count`·`disputed_by`·사유는 그대로 남는다). 잃는 것은 '한 탭에 모임'뿐이다. pending 요청 자체는 `classifyPendingRequest`가 **respond(내 좌석이 미응답) / mine(내가 보낸 요청) / awaitMembers(내 응답은 끝났고 남은 회원 대기)** 세 레인으로 가른다(0056 — awaitMembers는 취소 권한이 없어 「상대 대기」의 별도 섹션이다), 사이드바·모바일 뱃지 = `myTurnTotal(counts)` 하나다. **한 행은 정확히 한 자리에만 나온다.** URL 키는 평면 4개(`invite`(기본, 파라미터 없음)/`result`/`dispute`/`waiting`)이고 옛 키 `mine`·`settle`·`disputed`는 `resolveHubTab`이 새 자리로 폴백한다. **승인이 필요한 섹션**(경기 참여 확인·결과 확인 대기·재입력된 결과 확인·다시 입력할 차례)에는 `QueueSection attention`이 '승인 필요' 필(`ATTENTION_PILL`, spot)을 단다 — 결과 입력·참가자 채우기는 내 차례지만 승인이 아니라 달지 않는다. 박스 테두리 악센트는 두지 않는다(`PendingMatchSection`은 unboxed라 카드 박스를 `MatchGroupList`가 소유해 닿지 않는다).

**⚠ 숫자가 두 개다 — 섞지 말 것.** `myTurnTotal` = **알림**(사이드바·모바일 뱃지, '지금 내가 할 일')이고 `hubTabTotals`(`lib/match-requests/hub-totals.ts`) = **목차**(탭 배지·섹션 헤더·그룹 헤딩, '이 목록의 카드 수')다. 항등식은 **알림 쪽에만** 유효하며 **"사이드바 뱃지 = 승인 요청 탭의 내 차례 = `inviteMyTurn + resultMyTurn + disputeMyTurnTotal`"**(하위 세 탭의 내 차례 합, `hubTabMyTurn`)이다(뺄셈으로 정의하지 않는다 — 항이 늘 때마다 뺄셈을 쓰는 곳이 함께 깨진 전력이 있다: 0062의 백지 화면). 값은 4탭 → 2단 탭 전환에서 변하지 않았다. **탭·하위 탭 배지는 그 자리에 그려지는 카드 수와 언제나 같고**(최상위 승인 요청 배지 = 하위 세 배지의 합, 상대 승인 대기 배지 = `counts.waiting + disputeWaiting + reentryWaiting` = `waitingGroupTotals`의 합 — 두 출처 일치를 테스트가 고정한다), **'내 차례가 있다'는 신호는 숫자가 아니라 강조색(`LinkTabs` emphasis = `hubTabHasMyTurn`/`hubTopHasMyTurn`)이 전달한다.** 두 의미를 한 숫자에 겹쳐 두면 조건이 맞을 때마다 어긋난다 — 실제로 ① 이의 탭 배지가 내 차례 2버킷만 세어 대기 항목만 남으면 배지 0인데 카드 N장이었고, ② 「결과 입력 대기」가 `counts.enterResult`(이미 게임이 등록된 세션을 뺀 값)를 헤더 수로 써서 카드보다 작았으며, 그 값이 0이 되는 순간 `QueueSection`의 0-게이트가 **children으로 넘긴 세션 카드까지 삼켜 탭이 백지**가 됐다. 그래서 `QueueSection.count`는 **반드시 실제로 그려지는 카드 수**여야 한다는 계약이고, 그 몫의 이름이 `counts.enteredSessions`(카드는 보이지만 내 차례가 아닌 세션)다.

**탭 안 그룹핑**: **각 탭은 그 탭이 가르지 않은 축으로 안에서 묶는다**(`HubSectionGroup`). 허브에는 직교하는 두 축이 있다 — 차례 축(내 차례 / 상대 대기)과 생애 축(참여 성립 / 결과 처리 / 이의). 최상위가 차례 축이므로 「상대 승인 대기」는 생애 축 **「참여 요청」(상대 수락 대기·참가자 수락 대기·참가자 응답 대기) / 「경기 결과」(참가자 확인 대기·주최자 결과 입력 대기·재입력 대기·재입력 결과 확인 대기·확인 대기(열람 전용))**로 묶고, 승인 요청의 하위 탭은 이미 생애 축으로 갈려 있어 각각 1~3섹션이라 그룹을 두지 않는다. 이의 대기는 이의자 여부로 섹션을 더 나누지 않는다(카드 배지가 말한다). ⚠ `HubSectionGroup`은 `QueueSection`과 달리 **count가 0이어도 children을 감추지 않는다** — 숫자로 자식을 숨기는 구조를 한 층 위에 복제하지 않기 위해서다(틀리면 헤딩만 사라진다). 재제안 행은 종전에도 myTurnTotal에 있었으므로 **총량은 변하지 않고 라우팅만 이동한다**. 허브 섹션은 `PendingMatchSection`이 `buildMatchGroups`로 로테이션 세션 게임을 헤더 + '게임 N'(group_seq = 입력 순) 카드로 묶는다. 조회는 `fetchMatchQueue`(React `cache()`) 단일 소스 |
| **미확정/확정 집합 분할** | `personal_matches` 한 행은 `has_result`(0051 생성 컬럼 = `set_scores` 비어 있지 않음) 하나로 **개인 경기 결과(확정)** 아니면 **확인 요청 허브(미확정)** 중 정확히 한 화면에 속한다 — 조건문이 아니라 집합 분할이라 새 상태가 생겨도 자동으로 한쪽에만 들어간다. 아직 `personal_matches` 행이 없는 단계(pending 요청·방 초대·미입력 로테이션 세션)는 허브 전용. `confirm_match_result`가 세트를 채우는 순간 허브에서 사라지고 결과 화면에 나타난다 |
| **결과 제안 / 확인** | 상호 확인 경기의 사후 결과 등록. **협상 권한은 경기의 회원 참가자 전원**(요청자·파트너·대표·상대2, 0059)이고, **확정은 좌석별 만장일치**다(0060 — 제안이 곧 제안자의 확인이고 나머지 활성 회원 좌석이 각각 확인해 `confirmed_by`가 전원을 담는 순간 `settle_match_result`가 관점 행 전부를 채운다. 단식은 상대 1명, 복식은 3명). 재제안·이의·정정은 확인을 초기화한다. 종전(0059)에는 상대팀 중 한 명의 확인이 팀 전체를 대리했다. 스코어는 언제나 요청자 관점으로 저장되므로 제안은 좌석별 4분기로 정규화된다 — ⚠ 상대2에서 표시(`P∘I`)와 제안(`I∘P`)의 합성 순서가 반대이고 **차이가 애드 플래그에서만 난다**. `match_result_negotiations.result_status`(request_id 1:1): none → proposed(한쪽이 세트 제안, 요청자 관점으로 정규화 저장) → confirmed(좌석 전원 확인 → 관점 행 전부 확정) \| disputed(이의 제기 + 사유 + 이의자 `disputed_by`(0061), 좌석 누구든 재제안 — **다시 입력할 차례는 제안자**(`isReentryTurn = disputed ∧ 좌석 ∧ proposedByMe`)이고 이의자·나머지 좌석은 「상대 승인 대기」에서 대기한다. ⚠ 차례 판정에 `!disputedByMe`를 넣지 않는다 — 정정(reopen)에서 제안자 본인이 되돌리면 아무도 차례가 아닌 교착이 된다). **재제안으로 proposed가 되어도 그 경기는 이의 버킷에 남는다**(0062 — `dispute_count > 0`. 이의 사유·이의자가 재제안 뒤에도 보존돼 카드는 `reentryBadge`로 누구의 이의였는지·검토 팝업은 직전 사유를 말한다. 확인이 초기화됐으므로 재입력된 값은 남은 좌석 전원의 확인 대상이고, 그 확인은 「승인 요청 › 이의 신청」에서 한다. 탭은 차례 축을 따르므로 이의자는 재입력 전까지 「상대 승인 대기」에서 배지로 진행을 본다, Week 38). 제안자 본인은 확인 불가(이미 확인한 것으로 친다), 제안 수정만 가능(수정하면 다른 좌석의 확인이 초기화된다 — 사용자 결정으로 유지). 앱 판정은 둘이다 — `canRespondToProposal`(확인: 제안자도 아니고 아직 미확인)과 `canDisputeProposal`(이의: 제안자만 아니면 된다 — **이미 확인한 좌석도 정산 전이면 이의할 수 있다**, 0060 §7의 거울. `ConfirmedSeatActions`가 '확인 완료' 카드에 [이의 제기]를 남기고, 협상 팝업은 `confirmable=false`로 확인 버튼 없이 이의만 받는다). **동시 입력**은 RPC가 막고(`result_already_proposed`·`session_games_changed`) 앱은 `ActionResult.stale`로 받아 팝업을 **열어 둔 채** `router.refresh()`한다 — 카드 분기가 바뀌면 같은 팝업이 검토 모드로 전환된다(`useResultDialog`). `RESULT_ERROR_MESSAGES`는 키 길이 내림차순 정렬이라 `result_already_confirmed`가 `…_by_seat`를 가리지 않는다. **confirmed는 종점이 아니다** — 당사자가 `reopen_match_result`(0055)로 다시 `disputed`로 되돌리면 파생된 기록 전 행이 미확정으로 돌아가 허브에 다시 뜬다(자격 = `canReopenResult`). 좌석 판정에 실패한 관점 행만 대기 배지를 본다(`bystanderWaitingBadge`, 폴백) |

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
