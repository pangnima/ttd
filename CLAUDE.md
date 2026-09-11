# 테니스 클럽 플랫폼 — CLAUDE.md

> 이 문서는 **현재 규칙과 구조**만 담는다. Week별 결정 배경·결함 분석·검증 기록 전문은 `docs/history/claude-md-2026-09-08.md`(정리 전 원본), 설계 문서는 `docs/`(match-flow-refactor·rating-system·color-system·typography·redesign/)에 있다. **브라우저 E2E 절차·실행 기록·결함 대장은 `docs/e2e/`**(README = 계정·태그·정리 SQL 규약).

## 프로젝트 개요
테니스 클럽 운영자와 회원 모두를 위한 클럽 관리 + 경기 통계 플랫폼. 여러 클럽이 독립적으로 운영되는 커뮤니티 중심 플랫폼.

## 기술 스택
- Next.js 16.2.6 (App Router) · React 19.2.4 · TypeScript strict
- shadcn/ui (@base-ui/react) + Tailwind CSS v4
- Supabase (Auth + PostgreSQL + Storage) · 배포 Vercel(예정)
- 테스트 vitest(순수 함수만)

## 폴더 구조
```
src/
├── app/
│   ├── (auth)/                   # login / signup / forgot-password / reset-password
│   ├── auth/confirm/route.ts     # 인증 메일·재설정 토큰 핸들러
│   ├── opengraph-image.tsx       # 전역 동적 OG 이미지
│   ├── tiers/                    # 티어 아이콘 미리보기 (noindex, 개발용)
│   ├── (main)/                   # 로그인 후 (middleware 가드)
│   │   ├── clubs/                # 리스트 / new / join/[token] / [clubId]{홈, dashboard→홈, members, match-games, settings}
│   │   ├── me/                   # analytics(→profile 리다이렉트) / personal-matches(확정 전적 + 방 밖 결과 입력 대기, new=직접 기록/edit) / match-rooms(참여 중인 매칭 — 내 방 2탭 + 초대 섹션) / match-requests(→/me/match-rooms 리다이렉트)
│   │   ├── match-rooms/          # 매칭 리스트 2탭(진행 중/종료된) + [roomId] 매칭 룸 상세(비밀번호 게이트 → 참가자·게임·결과 입력)
│   │   ├── profile/              # [userId](본인=분석 풀버전, 타인=공개 요약) / settings
│   └── page.tsx                  # 랜딩
├── components/
│   ├── ui/                       # shadcn 자동 생성 — 직접 수정 금지
│   ├── common/                   # PageHeader(h1·badge 슬롯), FormActions(폼·팝업 하단 저장/취소 단일 출처), Header, Sidebar(3메뉴), MobileNav, LinkTabs(URL 탭 바), FieldToggle, RacketField, NameStatusLine, TierIcon 등
│   ├── clubs/ club-dashboard/ match-games/ profile/ onboarding/ stats/ auth/ landing/ theme/
│   ├── personal-matches/         # PersonalMatchForm(= use-personal-match-form-state + use-personal-match-submit), PlayerPicker, PersonalMatchCard + MatchGroupList/Header,
│   │                             #   MatchActions(확정) / MutualResultActions·ConfirmedSeatActions·DisputedResultActions(미확정 협상 — 개인 카드·룸 행 공용), NegotiationDialog + MatchResultDialog + use-result-dialog,
│   │                             #   RotationSessionCard + RotationGamesDialog + rotation/(풀·게임 빌더), PendingResultsSection(방 밖 「결과 입력 대기」), QueueSection/PendingMatchSection/PendingMatchActions,
│   │                             #   NegotiationTurnActions(내 차례 꼬리 — 개인 카드·룸 행 공용), SeatProgressBadge, MemberNeedsRoomNotice, result-badge 단일 출처
│   └── match-rooms/              # MatchRoomForm(매칭 만들기) + form-sections(format/schedule/password/invitee), MatchRoomCard(내 차례 필), RoomInvitesSection/RoomInviteCard, RoomListSection/RoomListPager(base로 두 화면 공유),
│                                 #   RoomDetailHeader + RoomStageBadge, RoomTurnBanner, RoomSettledNotice, RoomMembersSection + RoomInviteMembers, RoomGamesSection → RoomGamesActions(방장 액션 둘) + RoomGameRounds(2면 이상이면 라운드 묶음) + RoomLineupHint(권장 경기 수 한 줄),
│                                 #   RoomGameActions → RoomGameNegotiationActions/RoomFreeGameActions, RoomGameDialog, RoomRotationBuilder, RoomHostActions, RoomGateView,
│                                 #   RoomLineupButton → RoomLineupDialog(= use-room-lineup + use-room-lineup-save + lineup-options/lineup-count-fields/participant-chips + LineupRecommendation + RoomLineupNotices),
│                                 #   RoomLineupEditButton → RoomLineupEditDialog(저장한 대진 고치기 — 방장), 둘이 함께 쓰는 lineup-edit/(LineupEditList → LineupRoundGroup → LineupEditCard → LineupSlotSelect, 읽기 상태는 RoomLineupGameCard),
│                                 #   MemberMetaLine(NTRP·주력손·라켓), RoomMemberHostActions(내보내기·다시 초대), RoomRemovedNotice,
│                                 #   RoomInviteMembers(버튼 둘) → RoomInviteMemberDialog(+RoomInviteMemberSearch)/RoomGuestDialog(+RoomGuestForm), RoomGuestRemoveButton
├── lib/
│   ├── supabase/                 # client.ts(브라우저) / server.ts(서버) / middleware.ts
│   ├── actions/                  # Server Actions — auth, clubs, club-members, match-games, personal-matches, match-requests, match-results, rotation-sessions, match-rooms, profile, ratings, ai-coaching
│   ├── queries/                  # read-only — match-queue.ts(fetchMatchQueue, React cache: 미확정 단일 소스), room-queue.ts(매칭 리스트 작업 큐·뱃지), room-detail-extras, personal-matches, rotation-sessions, match-rooms, rotation-builder-context, analytics, player-profile, club-dashboard, ratings, stats, users
│   ├── match-requests/           # 순수(vitest): queue.ts(미확정 8버킷 분류) / participants.ts(좌석 규칙)
│   ├── personal-matches/         # 순수: lineup, map/explode/grouping/winner, match-groups, confirmation(협상 관점·자격 술어), perspective, confirm-flow, labels, validate-input,
│   │                             #   rotation·rotation-pool·rotation-rep·rotation-participation·rotation-entered, session-visibility, direct-record(회원이 끼면 매칭 룸), schedule-conflict, player-suggestions, seat-status
│   ├── match-rooms/              # 순수 + server-only: create-match(매칭 만들기 규칙 — 복식 = 로테이션), room-stage(4단계), room-turn(내 차례·방 롤업·뱃지 총계), room-sort, password,
│                                 #   title/split/headcount/members-view, parse-detail, room-context, game-status, game-labels, tabs, room-cursor, revalidate, create-room,
│                                 #   lineup(자동 대진표 — 프리셋 3종·시드 난수·출전 균등 + summarizeLineup), lineup-draft(대진 편집 — 자리 교체·삭제·추가·검증),
│                                 #   lineup-balance(전력차 → 등급), schedule(시간·코트 면 수 → 권장 경기 수 · formatRoomWhen), kick(강퇴·재초대 자격),
│                                 #   court-slots(라운드·코트를 목록 **순서에서 파생** — effectiveCourtCount·groupByRound·roundStartLabels)
│   ├── match-games/              # form-mapping, auto-generate, lineup-core(대진 배치 코어 — 클럽 격자·룸 목록 공용), special-match, former-members, match-view-helpers, attendance-stats
│   ├── analytics/                # 순수 집계 (toQuadStats = AnalyticsBundle.stats 단일 출처)
│   ├── rating/                   # elo/constants(클럽 ELO), personal-rating, tier(8계급), display — docs/rating-system.md
│   ├── dashboard/                # tokens.ts(TYPO·CARD_BASE·PILL_BASE·ATTENTION_PILL·FORM_*), outcome, surface, match-type-style, match-display, colors.test.ts(컬러 회귀 가드)
│   ├── redesign-fixtures/        # [임시] clubs·match-games 더미 — 실 연동 복원 시 제거
│   ├── auth/ format/ profile/ og/ · club-password.ts · default-images.ts · avatar-color.ts · format.ts · stats.ts · onboarding.ts · nav-items.ts · utils.ts
├── middleware.ts
└── types/                        # index.ts(도메인 타입) / supabase.ts(supabase gen types — select 리터럴에 컬럼을 넣기 전에 먼저 갱신)
```

## 페이지 구조 (사이트맵)
```
/                                   랜딩
/login /signup /forgot-password /reset-password /auth/confirm
/clubs · /clubs/new · /clubs/join/[token] · /clubs/[clubId]{ , dashboard→홈, members, match-games, match-games/new, match-games/[id], settings(owner)}
/profile/[userId]                   개인 통계 허브 (본인 = 개인/클럽/통합 탭 스캐폴드 — 개인만 동작 + AI 코칭 / 타인 = 공개 요약)
/profile/settings · /me/analytics → /profile/[내id]?scope=personal
/me/personal-matches                개인 경기 결과 = 확정 전적 + 상단 「결과 입력 대기」(**방 밖 직접 기록만**) · /new = 직접 기록(비회원 전용) · /[id]/edit
/match-rooms                        매칭 리스트 = 노출된 **전체** 방. 2탭(진행 중 / ?tab=past 종료된), 카드에 내 차례 필. `?tab=mine`은 /me/match-rooms로 리다이렉트
/match-rooms/new                    매칭 만들기 (방식 단식/복식 · 일시·표면·코트·비밀번호·상대 초대 — 스코어 없음)
/match-rooms/[roomId]               매칭 룸 상세 = 단일 작업 공간(단계 칩 · 「지금 할 일」 배너 · 참가자·초대 · 대진 · 결과/확인/이의/정정)
/me/match-rooms                     참여 중인 매칭 = 작업 큐. 최상단 「나를 초대한 매칭」 + 내 방 2탭(진행 중 / ?tab=past 종료된) — **사이드바 뱃지의 착지 지점**
/me/match-requests                  → /me/match-rooms 리다이렉트 (Week 39 허브 철거)
/me/personal-matches/new?room=      → /match-rooms/[roomId] 리다이렉트
/tiers
```

## 개발 이력 (요약)
상세 배경·결함 분석·검증 절차는 `docs/history/claude-md-2026-09-08.md`.

| Week | 마이그레이션 | 내용 |
|---|---|---|
| 1–13 | 0001~0016 | UI → Supabase 연결(클럽·대진표·프로필·통계·개인 분석·클럽 대시보드), full-width 레이아웃 |
| 14–15 | 0018~0032 | 클럽 ELO 레이팅, 개인 NTRP·8계급 티어, 대진표 매트릭스 개편, 비밀번호 재설정·탈퇴·클럽 초대 링크·OG |
| 16–19 | 0034~0038 | 온보딩·가이드, 개인 경기 폼 개편(미확정 저장·자동완성·확인 요청·결과 팝업), 가입 폼(시작일·라켓), 복식(페어 고정 상호 확인·로테이션 세션) |
| 20–21 | 0039~0042 | DB 재설계(참가자 테이블 정규화, 요청/협상 분리), 픽스처 단계 → 개인 경기·확인 요청·통계 실 연동 복원 |
| 22–24 | 0043~0045 | 타이포 8단계 토큰, 코트명·시각, 세트=게임 통일·로테이션 그룹핑·행 단위 승자 폐기 |
| 25 | 0046~0050 | 매칭 리스트/룸: 비밀번호 방, 모집형, 정원 없음·입장=참가, 참가자 게임 등록·관점 행·정산, 미확정 로테이션 방 공유 |
| 26 | — | 컬러 시스템(쿨 블루/민트, 3계층 토큰, cat-1~8, colors.test.ts 가드) |
| 27 | 0051~0052 | has_result 집합 분할, 허브 실 연동(queue.ts), 룸 안 결과 입력 완결, 리스트 서버 필터·커서 페이지, 라벨 재정립 |
| 28 | 0053~0055 | 본인 통계 실 데이터, 방 밖 복식 관점 행, 방 나가기, 확정 결과 정정(reopen) |
| 29 | 0056 | 방 밖 요청의 참여 전원 동의(좌석 축 `match_request_participants.participation_status`, 게이트 `maybe_materialize_request`) |
| 30–31 | 0057~0058 | 로테이션 일정 참여 동의(`rotation_session_participants`), 등록 이후 풀 편집(초대·제거·재초대), 이중 수락 제거 |
| 32–33 | 0059~0060 | 결과 협상 자격을 좌석 넷 전원으로, 확정을 좌석별 만장일치(`confirmed_by`)로, 취소한 초대 재초대(`removed`) |
| 34–36 | 0061~0063 | 이의 제기자 기록·허브 이의 탭, 협상 이력 보존(`dispute_count`), 로테이션 참여 동의 대칭(두 수락 RPC + backfill, 방 밖 요청 스코어 금지 CHECK) |
| 37 | 0064 | 로테이션 결과 입력 「전원 수락」 게이트(소유자 예외 없음), 세션 게임 공유 RPC·낙관적 선점, 좌석 명단화, 게스트 대체 탈출구 |
| 38 | — | 허브 2단 탭(승인 요청›초대/경기 결과 확정/이의 신청 · 상대 승인 대기), **허브는 승인 전용 — 결과 입력 대기는 개인 경기 결과로**, 승인 악센트, stale 새로고침, 확인한 좌석의 이의, 페어 고정 게스트 재요청 |
| 39 | 0065 | **매칭 룸 중심 개편** — 사이드 메뉴 3개(가이드·클럽 진입점 제거), 「매칭 만들기」로 방이 1급 객체(`invite_room_members`), 룸에 단계 칩·「지금 할 일」 배너·참가자 초대, 매칭 리스트 = 작업 큐(내 차례 필·초대 섹션·뱃지), 직접 기록 = 비회원 전용, **확인 요청 허브 철거** |
| 40 | 0066 | **룸 자동 대진표** — 배치 코어 추출(`lineup-core`: 격자와 규칙 분리), 룸용 `lineup.ts`(프리셋 균형/실력/골고루 · 시드 [다시 뽑기] · 출전 편차 ≤1 · 성별 soft), `create_room_lineup`으로 **「내가 안 뛰는 게임」** 저장(방장 전용·이어붙이기), 룸 [자동 대진표] 다이얼로그(옵션 → 즉시 미리보기 → 저장) |
| 41 | 0067~0070 | **대진표 시인성 · 참가자 메타 · 방장 강퇴** — 대진 카드를 팀 두 줄 + 색 바(cat-1/cat-5)·구분선으로 갈라 `vs` 폐기, 균형 등급(`lineup-balance`), `DialogFooter`로 저장 버튼 고정, 옵션 접기. 룸 명단에 NTRP·주력손·라켓(`get_match_room_detail` 확장, `derive_public_ntrp` 경유). 방장 강퇴 `kick_room_member` — **removed = 읽기는 남고 참가만 끊긴다**(결과 확인 UI가 룸 안에만 있어 막으면 게임이 영영 미확정), `leave_match_room` 우회 차단 + 트리거 안전망, 방장만 재초대로 해제. 룸 「게임」 섹션 시인성 — 헤더 액션 3종(자동 대진표·게임 입력·게임 추가)을 ghost 링크에서 outline 버튼으로 통일(「참가자 초대」 관용구), 게임 행을 개인 경기 카드 형태(색 바 + 팀 두 줄 + **배지 하나** + 하단 스코어↔액션)로 재구성, `buildRoomGameTeams`·`roomGameStatusBadge` 신설. **룸 비회원 참가자**(0069 `match_room_guests`) — 게임에 이름을 적기 전부터 명단에 오르고 자동 대진표의 배치 대상이 된다(`add/remove_room_guest`, 상세 RPC에 `guests` 키). 게임 행은 머리줄 「타입 배지 · 게임 N ↔ 배지 하나」 → 팀 두 줄 → 스코어↔액션 순. 참가자 헤더를 [회원 초대]·[비회원 초대] 두 팝업 버튼으로 가르고, **명단에서 강퇴 행을 없앴다**(0068의 「명단에 남긴다」 철회 — 되돌림은 방장의 회원 초대 검색이 맡는다). 0070은 강퇴자의 룸 읽기까지 끊고(0068의 「읽기는 남는다」 철회), 그 대가로 **배정된 경기가 있는 회원은 내보낼 수 없게** 했다 — 결과 확인 교착을 게이트가 아니라 강퇴 자격에서 막는다. 마지막으로 **팝업 하단 버튼을 하나로 통일**했다 — `FormActions` 신설 후 저장형 팝업 일곱 곳과 매칭 만들기가 같은 색·치수·좌우 배치를 쓰고, 영문 'Close'가 사라졌다 |
| 42 | 0071 | **자동 대진표 개편 — 셀렉 박스 · 대진 편집** — 「1인당 경기 수」를 세그먼트 버튼에서 드롭다운(`EnumSelect`)으로 옮기고 선택지를 1~10으로 넓혔다(밸런스 기준은 그대로 세그먼트). **뽑은 대진을 고칠 수 있게 했다** — 카드마다 [수정]·[삭제], 목록 아래 [게임 추가]. 편집 규칙은 순수 레이어 `lineup-draft.ts`가 쥐고(같은 게임에 이미 있는 사람을 고르면 **두 자리를 맞바꾼다** — 중복을 만들어 놓고 검증으로 막는 대신), 집계는 `summarizeLineup`이 게임 배열에서 되읽어 편집 뒤에도 「쉼」·출전 횟수가 맞는다. 저장 전(미리보기)과 저장 후(룸 [대진 편집])가 **같은 컴포넌트 한 벌**을 쓴다. 저장 후 편집이 그동안 불가능했던 이유는 `personal_matches`의 RESTRICTIVE 잠금(`source_type <> confirmation`)이 소유자의 UPDATE·DELETE까지 막기 때문 — 그래서 `replace_room_lineup`(방장 전용)이 **지우고 다시 넣는다**(자리 하나만 바꿔도 requester가 달라져 관점의 기준이 바뀌므로 부분 수정이 곧 전체 재구성이다). 삭제 순서가 결정적이다 — `source_request_id`가 `on delete set null`이라 **관점 행을 먼저** 지워야 고아가 남지 않는다. 라인업 게임과 손 추가 게임은 저장 결과가 구조적으로 동일해 구별할 수 없었으므로 `match_requests.origin`을 신설했고, 결과·협상이 시작된 게임은 `lineup_locked`로 막는다(확인한 좌석의 동의가 남의 경기에 붙는 사고를 막는 자리). 방장은 자기가 안 뛰는 게임의 요청 행을 읽을 수 없어(정책이 당사자 둘만 통과) 편집 대상 목록은 `get_room_lineup_requests`가 따로 준다. 곁들여 `create_room_lineup`에 가드 둘(`room_already_closed`·`room_not_ready`)을 채우고 라인업 팝업의 영문 'Close'를 없앴다 — **그중 `room_not_ready`는 0072에서 되돌렸다**(아래) |
| 42 | 0072 | **자동 대진표를 로테이션 방에 돌려줌(회귀 복구)** — 0071이 넣은 `room_not_ready` 가드가 **복식 방 전체에서 자동 대진표를 봉쇄**했다. `sourceKindOf`가 `doubles → rotation` 한 갈래뿐이라 복식 방은 예외 없이 로테이션 방이고, 자동 대진표가 쓰이는 곳이 사실상 복식이기 때문이다. 가드의 근거였던 "`create_room_game`도 막는다"는 대칭성이 틀렸다 — **그쪽은 사후 기록이라 빌더와 중복이지만, 라인업은 사전 배치이고 0066 머리말이 밝힌 동기("5명 이상이면 대진을 짠 사람도 쉰다")가 곧 로테이션 방의 상황이다.** 증상이 고약했던 이유는 서버에만 가드를 넣고 버튼 노출 조건은 그대로 뒀기 때문 — 버튼도 미리보기도 정상으로 나오고 [저장]에서만 막혔다. 그래서 남기기로 한 `room_already_closed`는 화면과 짝을 맞췄다(`canCreateRoomLineup` = 가드의 거울, 정산된 방에서는 버튼을 감춘다). **서버 가드를 넣을 때 노출 조건을 함께 보지 않으면 「눌러도 안 되는 버튼」이 생긴다** — `roomGameMemberIds`가 [내보내기]에 쓰던 원칙과 같다. 회귀를 통과시킨 스모크에는 "막히는지"만 있고 "되는지"가 없었으므로 **성공 케이스**를 넣었다 |
| 43 | 0073~0074 | **매칭 룸 시간 축 — 종료 시각·경기 시간·경기 수 추천** — 방이 시작 시각만 알아서 몇 시에 끝나는지도, 자동 대진표가 몇 경기를 짜야 하는지도 말할 수 없었다. `match_rooms`에 `duration_minutes`(nullable)와 `court_count`(default 1)를 더한다. 종료를 **시각이 아니라 소요 시간**으로 저장하는 이유는 자정을 넘길 때 종료 < 시작이 되어 계산이 꼬이기 때문이고, 사용자 어휘도 "보통 +2시간, 가끔 +1·+3"이라 소요 시간 쪽이다 — 화면에는 `10:00~12:00`으로 환산해 보인다. **코트 면 수가 빠져 있던 것이 이 요구가 드러낸 진짜 공백**이다: 시간에서 경기 수를 얻으려면 동시에 몇 경기가 도는지를 알아야 하는데, 11명 방을 코트 1면으로 보면 추천이 늘 4경기가 된다. 면 수는 **추천과 표시에만** 쓰고 경기에 코트를 배정하지는 않는다(룸의 대진은 여전히 순서 있는 목록). 방 메타는 seed에서 복사되는 구조라 두 값만은 RPC 파라미터로 받는다 — `create_match_room`을 **drop 후 5-arg로 재생성**했다(파라미터 수가 다르면 create or replace가 오버로드를 남긴다). 타임(경기당 시간)은 방이 아니라 **자동 대진표를 짤 때** 고른다. 추천은 총 경기 수가 아니라 **1인당 경기 수**로 말한다 — 화면이 그 축으로 조작되므로 총 수로 말하면 "권장 8경기인데 지금 9경기"가 된다. 게다가 권장값은 산술 환산이 아니라 `gamesForPerPlayer`를 되짚어 **시간을 넘지 않는 가장 큰 1인당 값**을 고른다(환산만 하면 반올림이 어긋나 "권장대로 했는데 시간 초과"가 나온다 — 화면이 스스로를 반박하는 셈). 표시는 새 헬퍼 `formatRoomWhen`이 맡는다 — `formatHourLabel`은 분을 버리는 데다 개인 경기 화면과 공유되어 고칠 수 없다 |

| 44 | — | **라운드 · 코트 축과 추천 UI** — 0073이 넣은 소요 시간·코트 면 수가 화면에서 제 몫을 못 하고 있었다. 셋을 함께 고쳤다. ① **매칭 만들기의 시간 축을 한 줄로** — 날짜·시각(`MatchMetaSection`, 개인 경기 폼과 공유)과 경기 시간·면 수(룸 전용)가 두 컴포넌트에 나뉘어 2행 × 2열로 흩어져 있었다. 공유 컴포넌트에 `scheduleExtra` 슬롯만 더해 **같은 grid 안에** 이어 붙였다(prop이 없으면 개인 경기 폼은 그대로 2열). 필드마다 붙던 도움말 두 줄은 요약 한 줄로 합쳤다 — 4열에서 높이가 들쭉날쭉해지는 주범이었고, 그 자리가 **권장 경기 수를 미리 보여줄** 자리가 됐다(자동 대진표에서 처음 만나면 늦다). 셀렉트 높이는 `MATCH_FORM_SELECT_TRIGGER` 토큰으로 통일했다(h-11 vs h-12로 어긋나 있었다). ② **추천을 눈에 띄게** — `LineupRecommendation`이 **권장값과 현재 값이 같아도 똑같이 그려져** 신호가 되지 못했다(비교 분기가 아예 없었다). 다르면 spot 톤 블록 + [권장값으로 맞추기] 버튼(두 글자 인라인 링크였다), 같으면 caption 한 줄로 접는다. 편집을 버린다는 사실도 이제 말한다. ③ **2면 이상 대진표 구분** — 이것만은 표시로 끝낼 수 없었다. `buildRoomLineup`이 누적 출전 수만 봐서 **게임 1과 2에 같은 사람이 들어갈 수 있었고**, 그 둘을 「1라운드 1번·2번 코트」로 그리면 한 사람이 동시에 두 코트에 서 있는 대진이 된다. 그래서 생성 루프에 라운드 축을 넣었다 — 라운드마다 `Set`을 비우고 그 라운드에 이미 선 사람을 후보에서 뺀다(클럽 격자 `auto-generate.ts`가 라운드마다 `available`을 리셋하는 것과 같은 장치). **코트는 저장하지 않는다** — 0073의 "면 수는 추천과 표시에만"을 지키고, 라운드·코트를 목록 **순서에서 파생**한다(`court-slots.ts`). 그래서 자리를 바꾸거나 게임을 지워도 다시 계산되어 어긋날 자리가 없다. 이 파생이 성립하려면 라운드가 면 수만큼 꽉 차야 하므로 `effectiveCourtCount`가 인원으로 실효 면 수를 깎는다 — **11명으로는 3면을 돌릴 수 없다**. 같은 함수를 `recommendGames`도 쓰게 되어 권장값이 바뀌었다(11명·3면·2시간: 1인당 4경기 → 3경기). 옛 값을 굳혀 둔 `schedule.test.ts` 케이스를 갱신했다 — 3면으로 계산한 11경기는 실제로는 6라운드 = 3시간이라 **예정 시간을 넘기는 추천**이었다. 곁들여 라운드 단위 「쉼」(1번 코트에서 쉬고 2번 코트에서 뛰면 쉰 것이 아니다)과 라운드별 예상 시각을 붙였다 — 시각은 저장하지 않고 방의 예정 소요 시간을 라운드 수로 나눠 되짚는다(`derivedSlotMinutes`), 자동 대진표는 고른 값을 알므로 그것을 쓴다 |

| 44 | 0075 | **저장 순서·팝업 닫기 (E2E 후속)** — 라운드 묶음을 실제 방에서 돌리자 방장이 중복 없이 뽑아 저장한 대진이 화면에서는 「같은 라운드에 두 번」으로 나왔다. 원인은 대진이 아니라 **저장 순서**다 — `insert_room_lineup_games`가 한 트랜잭션에서 도는데 `now()`는 트랜잭션 시각이라 8게임의 `created_at`이 **전부 같은 값**이 되고, 상세 RPC의 `order by group_seq nulls first, created_at`이 그 안에서는 임의 순서를 돌려준다. 라운드·코트를 순서에서 파생하는 이상 순서가 곧 데이터이므로 `clock_timestamp()`로 게임마다 다른 값을 준다(스키마 변경 없음 — `created_at`이 원래 뜻하던 값을 쓰게 만드는 것뿐이다). **0075 이전에 저장된 대진은 여전히 같은 값을 공유하므로 순서가 임의다** — 다시 뽑아 저장해야 정리된다. ⚠ 이 마이그레이션에 `create_room_lineup`을 함께 넣지 않은 이유는 0071의 정의를 복사하면 **0072가 되돌린 `room_not_ready` 가드가 되살아나기** 때문이다(복식 방 전체에서 자동 대진표가 다시 막힌다). 저장 루프만 바꾸면 create·replace 두 경로가 함께 고쳐진다. 곁들여 화면이 스스로를 검사하게 했다 — `roundConflictNames`가 한 라운드에 두 번 선 사람을 찾아 라운드 헤더가 말한다(가드는 생성 시점에만 걸리므로 손 추가 게임·편집으로 언제든 어긋날 수 있다). 마지막으로 **팝업 11곳의 영문 'Close'를 없앴다** — Week 41이 "사라졌다"고 적었지만 `DialogContent`의 기본값이 `showCloseButton = true`라 자동 대진표·대진 편집 둘만 지키고 있었다. 회원 초대 팝업에는 [닫기]를, 온보딩에는 [건너뛰기]를 새로 뒀다(X가 유일한 탈출구였다) |

| 45 | — | **「참여 중인 매칭」 분리 — 탭 바에서 관계 축 걷어내기** — 매칭 리스트의 3탭은 축이 둘이었다. 진행 중·종료된은 시간 축인데 '내가 참여한'은 관계 축이고, 그 증거가 코드에 있다 — `fetchRoomPage`의 `RoomListFilter`는 예나 지금이나 `'open'\|'past'` **둘뿐**이고 '내가 참여한'은 `.in('id', myRoomIds)` 좁히기였다(`tabs.ts`가 스스로 "관점 필터"라 적어 뒀다). 한 탭 바에 축을 둘 세우면 ① 같은 방이 두 탭에 겹치고(`mine ⊂ open ∪ past`) ② 그 탭만 렌더 규칙이 달라진다 — 2섹션 구성에 커서는 종료 섹션에만 붙어 **2페이지부터 「진행 중」 블록이 통째로 사라졌다**. 그래서 관계 축을 **라우트로** 뺐다: `/me/match-rooms` = 내 방 2탭 + 「나를 초대한 매칭」. 남은 `/match-rooms`는 시간 축 2탭의 순수 목록이다. **가장 큰 소득은 뱃지다** — `roomBadgeTotal`은 초대 + 내 차례가 있는 방을 세는데 눌러서 열리는 기본 탭이 전체 목록이라, "뱃지가 센 것들이 한 탭 뒤에 있는" 상태였다. 이제 뱃지가 가리키는 것들이 착지 화면에 한 번에 그려져 **정의가 실제로 참이 된다**. **E2E가 잡은 후속 결함 하나** — 분리만으로는 부족했다. 결과 입력이 남은 방이 경기일 경과로 '종료된' 탭에 들어가 뱃지 1이 여전히 한 탭 뒤에 숨었다. 그래서 두 화면의 축을 갈랐다(`RoomListAxis`): 전체 목록은 날짜(`schedule`), 내 방은 정산(`settlement`). 내 차례가 있는 방은 정의상 미정산이라 이 축에서는 전부 진행 중에 모여 **뱃지 = 착지 화면 카드 수**가 항등식이 된다. 곁들여: `fetchOpenRoomCount`가 `roomIds`·`axis`를 함께 받아 탭 숫자가 목록과 같은 좁히기·같은 축을 보게 했고(옛 `myRoomIds.length`는 페이지·시간 축 모두와 어긋났다), 소비처가 사라진 `LinkTabs.emphasis`를 지웠으며(참여 방이 0이면 초대가 있어도 강조가 안 나타나던 구멍도 함께), `RoomListBody`는 분기가 사라져 삭제했다. **`revalidatePath('/match-rooms')`가 25곳에 흩어져 있던 것을 `revalidateRoomList()` 하나로 모았다** — 목록 화면이 둘이 된 순간 직접 호출은 전부 새 화면을 빠뜨리는 누락이 된다. 내비도 단일 출처화했다(`NavItem.badge`·`matchPrefix` + `isNavItemActive`) — Sidebar와 MobileNav가 활성 판정을 통째로 복제하고 뱃지를 `href === '/match-rooms'`로 하드코딩하고 있었다. 레거시 `?tab=mine`은 `/me/match-rooms?tab=past`로 리다이렉트하고(옛 커서는 종료 섹션의 것이었다), Week 39 허브 리다이렉트(`/me/match-requests`)의 착지도 새 화면으로 옮겼다 — 허브가 하던 일을 물려받은 쪽이 그쪽이다 |

| 46 | — | **룸 게임 행 '나' 대칭** — 한 사람이 당사자인 두 단식 게임이 "vs 상대"(첫 줄 접힘)와 "이름 / vs 상대"로 다르게 그려졌다. `buildRoomGameTeams`가 **작성자를 제3자와 한 분기에 묶어** 실명을 주고 상대팀 당사자에게만 '나'를 줬는데(24aeb3b의 "당사자에게만 '나'"가 스스로 작성자를 빠뜨렸다), cf1721d의 「'나'면 첫 줄을 접는다」 규칙이 그 비대칭을 가시화했다. 자동 대진표가 team1의 첫 회원을 작성자로 잡아 같은 사람이 게임마다 작성자·상대를 오가므로 방 하나 안에서 드러난다. 분기를 갈라 **당사자 전원(작성자·파트너·상대팀)이 '나'**, 제3자만 작성자 실명을 본다 — 개인 경기 카드('나 · 파트너')와 같은 규칙. 테스트가 옛 비대칭을 굳혀 두고 있어 함께 고쳤다. **단식이라도 내 팀 줄을 접지 않는다** — 한 방에 남의 게임이 섞여 있어 첫 줄이 비면 누구 게임인지 한 번 더 읽어야 하므로 '나'를 그대로 보인다(개인 카드는 전부 내 게임이라 접어도 됐다) |

| 47 | — | **자동 대진표 권장 경기 수 — 노출 형태 다양화** — `recommendGames`의 권장 1인당 경기 수가 화면에 닿는 자리가 둘뿐이었다(매칭 만들기 요약 한 줄 · 다이얼로그의 `LineupRecommendation` 블록). 무엇보다 **다이얼로그의 초기 `perPlayer`가 하드코딩 2**라 권장값이 있어도 방장은 열 때마다 [권장값으로 맞추기]를 눌러야 했다. 세 안(A 컨트롤 내장 · B 경기 시간별 시나리오 칩 · C 다이얼로그 밖 힌트)을 비교해 **A + C**를 넣었다. A: `useRoomLineup`의 초기값을 lazy initializer로 권장값에 맞춘다 — `RoomLineupButton`이 열 때만 다이얼로그를 마운트하므로 매번 그 시점의 명단·일정으로 계산되고, 이후 인원을 빼도 초기값은 되돌리지 않는다(사용자 선택 존중). 소요 시간 없는 0073 이전 방은 권장이 null이라 예전 기본값 2로 시작해 화면이 그대로다. 드롭다운의 권장 항목에는 「N경기 · 권장」이 붙는다 — items를 모듈 상수로 두던 이유(base-ui Select가 `items` 참조로 라벨을 찾는다)가 그대로 살아야 하므로 **권장값에만 의존하는 `useMemo`**로 만들었다(`LineupCountFields`로 분리, 100줄 규칙). 기존 블록은 손대지 않았다 — 초기엔 「권장 설정과 같습니다」 caption이고 값을 벗어나면 spot 블록과 버튼이 살아난다. C: 룸 게임 섹션 아래 `RoomLineupHint`(서버 컴포넌트) 한 줄이 `10:00~12:00 · 코트 2면 · 30분 경기 기준 → 참가 예정 11명이면 1인당 3경기 권장`을 미리 말한다. **노출 조건은 [자동 대진표] 버튼과 같은 식(`canLineup`)이고 인원도 같은 값**(`lineupCandidates.length`)을 본다 — 힌트가 말한 숫자와 다이얼로그가 시작하는 숫자가 어긋나면 화면이 스스로를 반박한다. 빈 상태 문구도 같은 조건으로 방장에게만 [자동 대진표]를 덧붙인다(`roomGamesEmptyMessage(detail, isHost)` — 참가자에게는 없는 버튼이라 말하지 않는다, Week 40 잔여 항목 해소). 문장은 `describeRecommendation`(schedule.ts, vitest)이 단일 출처라 매칭 만들기 요약 줄도 같은 함수를 쓴다(실효 면 수가 방 면 수보다 작을 때만 「M면 기준」). 곁들여 `RoomGamesSection`이 111줄이던 것을 방장 액션 둘을 `RoomGamesActions`로 빼 96줄로 줄였다. **B안(경기 시간별 시나리오 칩 — 20분이면 4경기·30분이면 3경기…를 한눈에, 클릭하면 시간·경기 수 동시 적용)은 보류**했다 — 추천 내용을 넓히는 별개 축이라 나중에 얹어도 충돌하지 않는다 |

| 48 | 0076 | **자동 대진표 — 회원 1명 게임을 자유 기록으로 저장** — 남자25의 방(단식 · 방장 1명 + 게스트 4명)에서 자동 대진표가 아무 게임도 만들지 못했다. 버그가 아니라 **저장 모델의 제약**이었다: 라인업은 게임마다 `match_requests` 행이고 requester·opponent가 NOT NULL이라 「각 팀에 회원 1명」(단식은 둘 다 회원)이 하드 제약이었고, 0069가 게스트를 배치 대상에 넣었어도 회원이 2명 미만인 방에서는 어떤 게임도 성립하지 않았다. 게다가 룸 상세의 [자동 대진표] 버튼은 참가자 수만 봐서 **눌러도 안 되는 버튼**이었고 경고는 팝업 안에서만 떴다. 세 갈래(안내만 / 회원 1명 게임 허용 / 둘 다)를 비교해 **회원 1명 게임 허용**으로 갔다 — 방 안 회원 vs 비회원 게임이 이미 자유 기록(personal_matches direct + room_id)으로 존재하므로 모델은 있었다. 저장 루프 `insert_room_lineup_games`에 분기 하나: 양 팀 회원이면 종전대로 match_requests, **한 팀에만 회원이면 그 팀 첫 회원 소유의 자유 기록**(관점 복사본 없음 — 만들면 소유자 행의 결과 입력이 전파되지 않아 유령이 남는다). 회원 0명 게임은 여전히 `invalid_games`(소유자 없는 행은 모델에 없다 — 게스트끼리는 짤 수 없다). 방 메타는 coalesce 없이 그대로 복사한다 — 방장 소유 direct 행은 `sync_match_room_from_personal_match`가 방으로 되써 넣으므로 항등이어야 한다. **cleanup 트리거를 좁혔다**: `personal_matches_cleanup_room`은 direct 행 삭제 시 참조 0건이면 방을 지우는데, 방장+게스트 방의 라인업은 전부 방장 소유 direct라 [대진 편집]으로 전부 지우면 방이 사라졌다 → WHEN에 `origin='game'`. 편집 정합을 위해 `personal_matches.origin`(match_requests.origin의 거울)을 두고 `replace_room_lineup`의 키를 request_id에서 **game_id**로 바꿨다(drop 후 재생성 — direct 행은 요청이 없다). 배치 코어는 `requireMemberPerTeam` → `memberRule`(none/perTeam/perGame)로, perGame은 **2단계**다 — 양 팀에 회원을 둘 수 있는 묶음이 있으면 반드시 그것(상호 확인 게임이 자유 기록보다 낫다 — 자유 기록은 두 번째 회원에게 기록이 안 남는다), 없을 때만 회원 1명 묶음. 회원이 모자라면 출전 계층에 덜 뛴 회원을 강제로 넣는다(`withMemberForced` — 안 그러면 두 번째 게임부터 회원이 후보에서 빠져 아무 게임도 못 만든다, 회원은 편차를 넘고 게스트끼리는 ≤1). 회원은 팀 안에서도 앞자리(`memberTeamFirst`) — 저장 뒤 다시 읽으면 소유자·requester가 team1[0]으로 오므로 미리보기와 같은 순서여야 편집한 자리가 제자리에 보인다. 기존 회귀 테스트(회원 2 + 게스트 3 · 4게임)가 원칙을 드러냈다 — 0075까지는 편차 규칙이 4번째 게임에서 회원 한 명만 허락해 3게임에서 **중단**했는데, 이제 그 게임은 자유 기록으로 만들어진다 |

| 49 | — | **매칭 룸·직접 기록 정밀 E2E 첫 전수 실행** — 절차서 `docs/e2e/match-room-scenarios.md`(S0~S10: 준비 · 단식 기본 · 이의·정정 · 방장+게스트(0076 회귀) · 복식 회원 4 만장일치·2면 · 로테이션 빌더·선점·종료 · 강퇴·재초대·나가기 · 비밀번호 입장·변경 · 목록·뱃지 항등식 · 직접 기록 · 권한·경계)를 만들고 Playwright MCP + SQL 컨텍스트 보조로 전량 실행했다(`docs/e2e/runs.md`). 계정 A~D(남자01~04), 코트명 `E2E-S<n>` 태그, 정리는 SQL(방 삭제는 출처 행을 남긴다). **P1은 0건**. 어긋남(P2) 5건 — 정산된 방에 [게임 추가]만 남는다(F-5), 복식 확인 다이얼로그가 제안자를 상대팀 이름으로 말한다(F-9), 룸 행 좌석 명단이 뷰어를 두 번 센다(F-10), 게임을 전부 확정해도 로테이션 세션이 풀 회원 전원에게 「결과 입력」 차례·뱃지로 남고 방장 배너는 비어 있다(F-11 = K-12 confirmed), 결과 미입력 게임을 둔 채 [방 나가기]하면 뱃지 1이 카드 0과 함께 남는다(F-13 = K-1 confirmed). 문구·표시(P3) 9건. 수정 계획은 `docs/e2e/findings.md` 「수정 계획 요약」에 3묶음(정산·차례 정합 / 협상 표시 / 문구)으로 — 별도 승인. 절차서 기대값 7건을 실제 동작에 맞춰 고쳤다(정산 방은 날짜 축에서도 종료 / 이의 사유 maxLength / 세션이 남으면 미정산 / 내 차례 우선 정렬은 참여 중인 매칭에만 / 직접 기록 폼에는 스코어 칸 없음 / 비밀번호 maxLength / 모집 중 게임은 폼에서 못 만든다). 도구 메모: Playwright MCP에서 입력이 페이지에 닿지 않는 상태가 간헐적으로 생겨 새 탭으로 갈아타는 우회를 절차에 넣었다 |

### 남은 일 (백로그)
- **배포**: Vercel + 환경변수(`NEXT_PUBLIC_SUPABASE_URL`·`_ANON_KEY`·`ANTHROPIC_API_KEY`), leaked password protection + URL 화이트리스트(`/auth/confirm`), 재설정 메일 템플릿, `metadataBase` 환경변수화
- **픽스처 잔여**: 클럽·대진표 `redesign-fixtures` → 실 쿼리 복원, 프로필 클럽/통합 탭 활성화, 타인 프로필 통계 픽스처화 여부
- **브라우저 E2E**: 절차서 `docs/e2e/match-room-scenarios.md`(S0~S10, Week 49). 실행 결과는 `docs/e2e/runs.md`, 결함은 `docs/e2e/findings.md`. 룸·협상·직접 기록을 건드리면 해당 시나리오를 다시 돌린다
- **알림·리마인더·만료 전무** — 매칭이 룸 중심이 되며 무응답이 방을 막는다. 이의 왕복 상한 없음(`dispute_count`만 셈)
- **Week 45 잔여**: 방 상세(`/match-rooms/[roomId]`)는 URL 접두사상 계속 **「매칭 리스트」**가 활성이다 — 주로 「참여 중인 매칭」에서 들어가므로 어긋나지만, 상세 URL을 옮기면 공유 링크가 깨진다(활성 판정에 예외를 넣으려면 `isNavItemActive`가 방 멤버십을 알아야 하는데 그것은 클라이언트가 모른다). [방 나가기]·방 삭제 후 착지도 여전히 `/match-rooms`다(나간 직후라면 「참여 중인 매칭」이 더 맞다). 「참여 중인 매칭」이라는 이름과 '종료된' 탭은 엄밀히는 어긋난다 — 탭 라벨로만 구분한다. `MY_ROOM_ID_LIMIT = 500`을 넘는 멤버십은 여전히 조용히 목록에서 빠진다(이제 탭 숫자는 `fetchOpenRoomCount`가 세므로 숫자와 목록이 함께 빠져 어긋나지는 않는다)
- **Week 41 잔여**: 스스로 나간 사람(declined)에게는 같은 가드가 없다 — 게임을 친 뒤 [방 나가기]를 하면 상세가 막혀(0067 게이트) 그 게임의 결과를 확인할 수 없다(0070이 강퇴에만 건 `member_has_games`를 `leave_match_room`에도 걸어야 대칭이 맞는다), 방장이 누구를 내보냈는지 화면에 남지 않는다(이름을 기억해야 다시 부를 수 있고, 초대 검색 결과에도 「강퇴됨」 표시가 없다 — `buildPlayerSuggestionGroups`가 방 상태를 모른다), 게임 추가 폼의 파트너·상대2 자동완성에 방 게스트가 뜨지 않는다(이름을 다시 친다), 게스트가 절반을 넘는 방은 「각 팀 회원 최소 1명」 제약으로 경기 수가 줄지만 별도 안내 없이 기존 warnings로만 드러난다, 강퇴 알림 없음(강퇴자는 방을 열어야 안다), 방장이 남의 stale 자유 기록을 정리할 경로 없음(`leave_match_room`에도 있던 기존 구멍), 손잡이 한글 라벨 4곳 중복(`formatDominantHand`만 신설), 팝업 하단 바를 **스크롤해도 바닥에 고정**하는 골격은 자동 대진표에만 있다(나머지는 본문과 함께 스크롤 — `PersonalMatchForm`이 스크롤 컨테이너가 되어야 옮길 수 있다)
- **Week 49 잔여(E2E 결함)**: `docs/e2e/findings.md` — P2 5건(F-5·F-9·F-10·F-11·F-13)과 P3 9건, 수정 계획 3묶음 승인 대기. S4b(혼합 복식) 미실행. E2E 자동화 후보: `@playwright/test` 도입(절차서가 스펙 골격), 네이티브 `confirm()` 9곳 → `AlertDialog`, 정리 SQL을 `scripts/e2e-cleanup.sql`로
- **Week 48 잔여**: 회원+회원 vs 게스트+게스트 복식 게임은 direct 행이라 **두 번째 회원의 개인 기록에 남지 않는다**(배치 코어가 양 팀 분할을 우선해 빈도를 줄일 뿐 — 손 편집으로는 만들 수 있다. 후속: direct 결과 입력 시 회원 파트너 관점 행 동기화). 소유자는 `/me/personal-matches/[id]/edit`에서 direct 라인업 행을 고치거나 지울 수 있고(RESTRICTIVE 잠금 대상이 아니다), 방장 소유 행의 메타 편집은 sync 트리거가 방 메타를 덮어쓴다(기존 방장 자유 기록과 같은 위험). `get_room_lineup_requests`의 request_id가 null일 수 있는데 생성 타입은 non-null이다(앱은 gameId만 쓴다). 자유 기록 라인업 게임에는 협상이 없어 방 참가자 눈에 "대진표 게임인데 소유자 혼자 확정"이 어색할 수 있다 — 팝업 경고 한 줄로만 말한다
- **Week 47 잔여**: 경기 시간별 시나리오 칩(B안) 미구현 — `recommendScenarios`(SLOT_MINUTES_OPTIONS마다 `recommendGames`)와 옵션 열림 안 칩 행이면 된다. 룸 힌트와 매칭 만들기 요약은 경기당 시간을 `DEFAULT_SLOT_MINUTES`(30분)로 가정한다 — 방장이 다이얼로그에서 다른 시간을 고르면 그때부터 두 자리의 숫자가 갈린다(방에 slot을 저장하지 않는 한 그대로다, Week 43 잔여와 같은 뿌리). 정산되지 않았지만 이미 게임이 있는 방에서도 힌트가 뜬다 — 「지금 N게임」과의 비교는 하지 않는다(라인업·손 추가가 섞여 1인당 환산이 애매하다)
- **Week 43 잔여**: 게임별 시작 시각은 Week 44가 **표시 계층에서** 해결했다(라운드 헤더의 예상 시각 — `played_time`에는 여전히 시 단위만 저장된다. `formatHourLabel`·`toHourValue`·`schedule-conflict`가 분을 버리는 것은 그대로이고, 셋 다 개인 경기 화면과 공유되어 고치면 룸 밖 표기까지 바뀐다). 남은 것: **경기당 시간(slot)을 방에 저장하지 않는다** — 저장된 대진의 라운드 시각은 예정 소요 시간을 라운드 수로 나눠 되짚으므로, 시간을 넘겨 짠 방에서는 방장이 고른 값과 다르게 읽힌다. 코트 **배정**도 여전히 없다(라운드·코트는 목록 순서에서 파생할 뿐 DB에 없어서, 저장 뒤 손으로 추가한 게임도 격자의 한 칸을 차지한다 — 「게임 3은 2번 코트」를 기록으로 남기려면 `create_room_lineup`에 코트 슬롯을 받는 확장이 된다). 룸의 중복 일정 경고는 여전히 없지만 이제 소요 시간이 있어 구간 겹침으로 정확히 판정할 수 있다
- **Week 42 잔여**: `origin` backfill 불가 — 0071 이전에 저장된 대진은 손 추가 게임과 구별할 방법이 없어 `'game'`으로 남고 [대진 편집] 대상이 되지 않는다, 편집은 게임 단위가 아니라 **전량 교체**라 한 자리만 고쳐도 그 방의 미확정 라인업 게임 id가 전부 바뀐다(결과·협상이 없는 행뿐이라 잃는 것은 없다), 게임 순서 바꾸기 없음(저장 시 `created_at` 순), 명단에 없는 자리(방을 나간 사람)는 화면이 「명단에 없음」으로 드러내지만 저장 전까지 자동으로 비우지는 않는다
- **Week 40 잔여**: 미확정 로테이션 복식 방에서는 [자동 대진표]와 로테이션 빌더가 함께 보인다(두 경로 공존 — 0072에서 **유지하기로 결정**했다. 방장은 미리 대진을 짤 수도, 참가자들이 친 뒤 빌더로 넣을 수도 있다. 다만 한 방에 상호 확인 게임과 세션 게임이 섞이고, 정산하려면 방장이 [게임 입력 종료]를 눌러야 한다), 빈 상태의 [자동 대진표] 안내는 Week 47이 넣었다(방장에게만)
- **Week 39 잔여**: 매칭 만들기에 중복 일정 경고 미적용(개인 경기 폼에는 있다), 룸 카드 그룹핑, `participants.ts`의 `classifyPendingRequest`·`groupRotationRequests`는 소비처 없이 테스트만 남음(방 밖 요청 재개 대비 보존)
- **보안·성능**: 비밀번호 시도 제한, anon EXECUTE 회수 잔여 15종, `search_path` 미설정 10종, RLS `auth.uid()` 재평가 56건, 미인덱스 FK 11건, 개인 경기 목록 페이지네이션
- **2차 기능**: 로테이션 그룹 단위 삭제, 방 게임 카드 목록 그룹핑(room_id), 방장 '닫기', 룸 필터, 슬롯에서 빠진 회원의 stale 초대 정리, 확정 시 `personal_ntrp` lazy 갱신, 진행도 분모 computed column, 룸 '참가자 채우기' → `RoomGameDialog initialData`, 티어 8계급 색 리마스터, 클럽 해동(redesign-fixtures → 실 쿼리)

## 데이터 흐름
```
Server Component (read)  → lib/queries/*.ts → createServerClient → PostgreSQL (RLS)
Server Action (mutation) → lib/actions/*.ts → RLS + 명시적 권한 체크 → revalidatePath() / redirect()
Client Component (read)  → lib/supabase/client.ts — RLS로 보호된 read-only만
```

## DB 스키마 현황
> 2026-09 재설계(`docs/redesign/`): 다형성 컬럼을 참가자 테이블로 정규화. 마이그레이션 0001~0076(0016부터 `supabase/migrations/*.sql`이 정본, 원격 적용은 MCP `apply_migration`). 원격 DB의 정의가 레포에 없으면 `execute_sql`로 읽어 마이그레이션에 편입한다.

| 테이블 | 핵심 규칙 |
|---|---|
| `users` | 본인만 UPDATE. 행 생성은 `handle_new_user` 트리거. `is_guest`·`personal_ntrp`·`deleted_at`(soft delete)·`racket_brand/model`·`ntrp`(가입 시 1회) |
| `clubs` / `club_members` / `club_invites` | 공개 클럽 전체 SELECT, owner만 UPDATE/DELETE. approved 멤버만 SELECT, owner/officer 승인. 초대는 SECURITY DEFINER RPC로만 |
| `match_games` + courts/rounds/time_slots/`match_game_matches`/`match_game_participants` | approved 멤버 SELECT/INSERT/UPDATE, owner DELETE. 참가자 `{match_id,user_id,side,is_ad}` 단식 2행/복식 4행. `winner_id`는 team1/team2/draw 리터럴 |
| `personal_matches` + `personal_match_participants` | 본인만 CRUD(INSERT/UPDATE는 `room_id is null or is_room_participant`). **`has_result`**(생성 컬럼 = set_scores 비어 있지 않음)가 확정/미확정 집합 분할 술어. `source_type` direct/confirmation/rotation, confirmation은 RESTRICTIVE 잠금. `is_perspective`(관점 복사본 — 방의 대표 게임 판정), `rotation_session_id`·`group_seq`(로테이션 묶음), `court_name`, `room_id`, **`origin`**(0076 — game: 손으로 저장 / lineup: 자동 대진표가 만든 자유 기록. match_requests.origin의 거울. cleanup 트리거는 origin=game에만 걸려 라인업 행 삭제로는 방이 지워지지 않는다). 참가자 슬롯 행은 이름이 있을 때만 |
| `match_requests` + `match_request_participants` | SELECT `is_request_party`(당사자 둘 + 복식 참가자). **생성은 `create_match_request` RPC 전용**, 수락도 RPC. **방 밖 요청의 `set_scores`는 언제나 빈 배열**(CHECK `match_requests_offroom_no_scores`, 스코어는 협상 행에만). 좌석 `participation_status` 기본 pending — BEFORE INSERT 트리거 `default_participation_status`가 방 안 경로·비회원·탈퇴자만 accepted로. `opponent_accepted_at`, `rotation_session_id`·`group_seq`(로테이션 파생 요청은 pending 중복 유니크에서 제외). **`origin`**(0071 — game: 참가자가 손으로 추가 / lineup: 방장의 자동 대진표)이 방장이 통째로 고칠 수 있는 게임을 가른다. 두 경로의 저장 결과가 구조적으로 동일해 사후 판별이 불가능하므로 **0071 이전 행은 backfill되지 않았다** |
| `match_result_negotiations` | request 1:1, 쓰기는 RPC 전용. `confirmed_by uuid[]`(제안자는 제안 시 포함, 활성 회원 좌석 전원이 들어가면 정산), `disputed_by`, `dispute_count`. BEFORE 트리거 `normalize_result_confirmations`: 제안·재제안 → `[제안자]`, 유일한 초기화는 `result_status='none'`. **협상 이력 컬럼은 상태 전이로 지워지지 않는다 — 현재 상태는 `result_status` 하나** |
| `rotation_sessions` + `rotation_session_participants` | 세션 SELECT = 본인 ∪ 방 참가자 ∪ 좌석 보유자(`is_rotation_session_seat`). ⚠ 세션 정책식이 세션을 되읽으면 `INSERT … RETURNING`이 42501 — 앞 두 항은 컬럼 비교, 세션을 되읽는 `is_rotation_session_party`는 참가자 테이블 정책 전용. UPDATE 정책 없음(풀 조작은 RPC). 좌석은 트리거 `sync_rotation_session_participants`가 `players`의 활성 회원에서 파생(스냅샷·role 없음, 소유자 행 없음, rejected/removed는 보존해 재초대 진입점), 방 세션은 accepted로 시작. 좌석 있는 세션은 finalize 후에도 남는다 |
| `match_rooms` / `match_room_secrets` / `match_room_members` | 방 메타 전원 SELECT, DELETE 방장. **`duration_minutes`·`court_count`**(0073) — 종료를 시각이 아니라 소요 시간으로 두는 이유는 자정 넘김에서 종료 < 시작이 되기 때문이고, 면 수는 권장 경기 수 계산과 표시에만 쓴다(경기에 코트를 배정하지 않는다). 이 둘만은 seed가 아니라 `create_match_room` 파라미터로 들어온다. secrets는 정책 0개(bcrypt, RPC 전용). 멤버 `{role host/player, status invited/joined/declined/removed}` — 비밀번호 입장 = `player/joined`, 정원 없음. `removed`(0068·0070)는 **방과 완전히 끊긴다** — 입장 RPC가 `room_member_removed`, 상세 RPC도 `not_member`(0070), `leave_match_room`도 막아 우회 불가, 트리거 `keep_removed_room_member`가 안전망. 그래서 **경기에 배정된 회원은 내보낼 수 없다**(`member_has_games`): 방을 못 보게 하면 결과를 확인할 수 없고 좌석 만장일치가 채워지지 않는다. 해제는 방장의 재초대뿐이고, **강퇴자는 명단에서 사라진다** — 되돌리는 경로는 방장의 [회원 초대] 검색이다(`inviteExcludedUserIds`가 방장에게만 후보로 남긴다). `is_settled` = 대표 게임 전부 확정 + 대기 요청·미확정 세션 없음. 출처 3테이블의 `room_id` FK(set null), 참조 행이 하나도 없을 때만 트리거가 방 삭제 |
| `match_room_guests` | 방에 등록된 비회원(0069). SELECT = 방 참가자, 쓰기는 RPC 전용(정책 0개). `unique(room_id, lower(btrim(name)))` — 명단·풀의 게스트 dedupe가 이름 기준이라 방 안 동명이인을 막는다. 방 삭제 시 cascade, 게스트를 빼도 이미 저장된 게임은 그대로 |
| `club_player_ratings` / `club_rating_history` / `ai_coaching_cache` | approved 멤버 SELECT, 쓰기 RPC · 본인 통계 해시 캐시 24h |

**헬퍼**: `is_club_owner/approved_member/owner_or_officer`, `is_request_party`, `is_rotation_session_party`·`is_rotation_session_seat`, `is_room_participant`, `is_active_member` (SECURITY DEFINER — 정책식의 상호 재귀 우회)

**RPC** (신규 RPC는 `revoke execute … from anon` 명시 — Supabase 기본 권한이 자동 부여, 트리거 함수는 PUBLIC도 회수):
- 대진표·클럽: `create/update_match_game`(참가자 배열), `add_guest_player`, 통계 4종(`get_user_match_stats_v2`·`get_user_head_to_head`·`get_user_doubles_court_stats`·`get_user_partner_stats`, `p_club_id` 선택), 클럽 랭킹 3종, `apply_club_rating_snapshot`, `get_invite_preview`·`join_club_via_invite`
- 확인 요청: `create_match_request`(스코어 거부 `set_scores_not_allowed`), `accept_match_request`(대표 수락 → 게이트), `maybe_materialize_request`(**전원 수락 게이트 단일 초크포인트**, 요청 행 락), `materialize_accepted_request`(회원 참가자 전원 관점 행), `respond_request_participation`, `respond_rotation_participation`(세션 단위 일괄 — 좌석 축까지 움직인다), `reject_match_request`(한 명의 거절 = 요청 종료), `backfill_rotation_perspectives`
- 결과 협상: `propose/confirm/dispute/reopen_match_result` — 자격 좌석 넷(`request_seat_of`), 제안은 `normalize_to_requester_perspective`로 요청자 관점 정규화, confirm은 `confirmed_by` 추가 후 `request_result_seats ⊆ confirmed_by`면 `settle_match_result`(boolean 반환, 멱등). 제안자 본인만 제안 수정(`result_already_proposed`는 타인), dispute는 제안자만 거부(확인한 좌석도 정산 전이면 가능), reopen은 확정 행 전부 비움 + disputed. 헬퍼 `invert_set_scores`·`validate_set_scores`·`normalize_set_scores`·`derive_public_ntrp`
- 로테이션: `finalize_rotation_session(session, games, expected_seq?)` — 기준 '나'는 호출자, 방 밖은 좌석 **전원 응답**해야 진입(`session_seats_pending`, 신원 검사가 먼저), `p_expected_seq ≠ max+1`이면 `session_games_changed`, allowlist(풀 ∪ 방 참가자 ∪ 소유자 − 거절자)로 위조 방어, 상대팀에 회원이 있으면 요청(accepted)+제안, 전원 비회원만 즉시 확정. `get_rotation_session_games`(좌석·소유자·방 참가자에게 대표 게임 전량), `respond_rotation_plan`(일정 응답 — 거절은 그 사람만 풀에서 뺀다), `add/remove_rotation_session_player`(방 밖 전용), `rotation_seats_accepted`, `close_rotation_room`
- 매칭 룸: `create_match_room`, `invite_room_members`(0065 — 방장·참가자가 회원 초대, 게스트·탈퇴·본인 조용히 제외, joined 강등 금지), `enter_match_room`(→ `join_match_room_as_player`: joined + 미확정 로테이션 풀 append + 방 요청 좌석 수락), `respond_room_invite`, `update_match_room_password`, `get_match_room_detail`(멤버 게이트 후 jsonb), `leave_match_room`(방장 불가), `create_room_game`(참가자가 만드는 상호 확인 게임 — seed 치환 순서 고정), `create_room_lineup`(0066·0071 — 방장이 짠 대진을 스코어 없는 게임들로 일괄 저장, requester가 호출자가 아니어도 된다 + 슬롯 정규화 `resolve_room_player`. 저장 루프는 내부 함수 `insert_room_lineup_games`로 빠져 교체 경로와 공유된다. **0076부터 게임마다 회원 분포로 경로가 갈린다** — 양 팀 회원이면 match_requests, 한 팀에만 회원이면 그 팀 첫 회원 소유의 personal_matches direct(origin=lineup, 관점 복사본 없음), 회원 0명이면 invalid_games. 남는 가드는 방장·`room_already_closed`뿐 — **방식(로테이션 여부)은 보지 않는다**(0072가 0071의 `room_not_ready`를 되돌렸다. 복식 방은 전부 로테이션 방이라 그 가드가 기능을 죽였다)), `replace_room_lineup`·`get_room_lineup_requests`(0071·0076 — 저장한 대진 고치기. 키는 **game_id**(personal_matches 대표 행 — 0076에서 request_id에서 바꿈, direct 라인업 행은 요청이 없다). 지정한 라인업 게임을 지우고 새 대진을 넣는 **교체**이고, 관점 행을 요청보다 먼저 지운다(`on delete set null`이라 순서를 바꾸면 고아가 남는다). 결과·협상이 시작됐거나 `origin='game'`인 게임이 섞이면 `lineup_locked`. 목록 RPC를 따로 두는 이유는 방장이 자기가 안 뛰는 게임의 요청 행을 읽을 수 없기 때문), `add_room_guest`·`remove_room_guest`(0069 — 비회원 등록·제거. 자격은 초대와 같은 눈높이(방장 ∨ joined), 정산된 방 금지, 제거는 방장 ∨ 등록한 본인), `kick_room_member`(0068·0070 — 방장 전용 강퇴. **배정된 경기가 없는 사람만**(`member_has_games`), 멤버 상태만 removed로 두고 로테이션 풀에서 빼며 요청·기록은 건드리지 않는다), `recompute_match_room_settled`, 관점 헬퍼 `copy_personal_match_perspective`·`swap_partner_perspective`·`swap_opponent_perspective`·`resolve_rotation_player`

⚠ supabase-js는 select 문자열을 **리터럴 타입**으로 파싱한다 — 상수 결합(`a + b`)이면 `GenericStringError`. 새 컬럼은 `types/supabase.ts`를 먼저 갱신해야 임베드 전체가 깨지지 않는다(배포 순서도 마이그레이션 → 앱).

## 도메인 어휘

| 용어 | 규칙 |
|---|---|
| **MatchGame / Match / is_fixed / winner_id** | 하루 단위 대진표 / 개별 경기(1코트×1타임슬롯) / 결과 확정(수정 잠금 + 통계 반영) / 사이드 리터럴 `team1`·`team2`·`draw` — 대진표는 경기 1건 = 게임 1개, 승자는 `resolveGameWinner`가 스코어에서 파생 |
| **듀스코트 / 애드코트** | 포핸드(기본, `team1AdPlayerId = null`) / 백핸드(`= playerId`). 개인 경기는 세트별 `myAd/oppAd` |
| **temp_id** | 대진표 생성 시 클라이언트 임시 UUID, RPC가 실제 id로 교체 |
| **is_guest / 탈퇴 회원** | Auth 없는 임시 선수 / `deleted_at` soft delete(익명화, 이름 복원·'탈퇴' 배지, 랭킹 제외, 확인 분모 제외) |
| **NTRP 3종 / 티어** | 자가선언 `users.ntrp`(가입 1회, 불변) / 클럽 ELO `club_player_ratings`(2.5 시작) / 개인 `users.personal_ntrp`(개인 경기 온더플라이). 티어 = 클럽 레이팅 8계급 밴딩(`TIER_BANDS`) |
| **명승부 / 라이벌 / 초대 토큰** | 대진표 특별매치 판정(`special-match.ts`) / 비공개 클럽 가입 토큰(RPC 전용) |
| **게임(세트)** | 세트 1개 = 게임 1개. `set_scores` 원소 하나가 게임 하나, 통계·표시 모두 게임 단위(`resolveSetWinner`·`tallySets`). 행 단위 승자 없음. 목록은 게임 2개 이상이면 헤더 + 게임 카드 N장, 배지·색은 `result-badge.ts` 단일 출처 |
| **결과 미확정 / 집합 분할** | `set_scores` 빈 배열(`hasResult` false) = 통계 제외. `has_result`가 확정/미확정을 가르고, **미확정 행이 놓이는 자리는 `room_id`가 가른다**(Week 39) — 방에 속한 행은 매칭 룸(과 매칭 리스트의 내 차례 필), 방 밖 행은 개인 경기 결과 상단 `PendingResultsSection`. Week 38의 "승인은 허브 / 입력은 개인 경기 결과"는 허브와 함께 철회. 입력 가능한 일정 카드는 게임이 전부 확정되고 경기일이 지나면 숨긴다(`isDormantSession`) |
| **확인 요청 / 상호 확인 경기** | 회원 간 단식·페어 고정 복식 요청(`match_requests`). **Week 39부터 방 안에서만 생긴다** — `create_room_game`이 `status='accepted'`로 즉시 만들고(입장=동의) 수락 단계가 없다. 방 밖 요청을 만드는 앱 경로는 사라졌다(`createMatchRequestAction` 삭제); RPC·전원 수락 게이트·`requiresAllMembers`는 안전망으로 DB와 순수 함수에 남는다. 복식 대표는 `resolveConfirmRep`(상대1→상대2), 생성 순간 회원 참가자 전원의 관점 행(`source_type='confirmation'`, 잠금) |
| **결과 제안 / 확인** | 협상 권한 = 회원 참가자 전원, 확정 = **좌석별 만장일치**(제안이 곧 제안자의 확인, 단식 1명·복식 3명). 재제안·이의·정정은 확인 초기화. 앱 술어: `canRespondToProposal`(확인: 제안자 아님 ∧ 미확인) / `canDisputeProposal`(이의: 제안자만 아니면 — 확인한 좌석도 정산 전이면 가능) / `isReentryTurn`(이의 후 다시 입력할 차례 = 제안자 — ⚠ `!disputedByMe`를 넣으면 reopen에서 교착) / `canReopenResult`(confirmed ∧ 좌석). 제안자 본인 수정 허용(타인 확인 초기화). 동시 입력은 RPC가 막고(`result_already_proposed`·`session_games_changed`) 앱은 `ActionResult.stale`로 팝업을 열어 둔 채 `router.refresh()` |
| **이의 / 이의 이력** | `dispute_count > 0`이 '이의를 거쳤다'의 권위 술어(이의자 탈퇴에도 남는다). 재제안 뒤에도 사유·이의자 보존 → 카드 `ReentryContextBadge`·`DisputeReasonLine`이 맥락을 말한다. 탭 위치는 **차례 축**을 따른다(내 차례 = 승인 요청 › 이의 신청, 상대 차례 = 상대 승인 대기) — 0062의 "확정까지 이의 탭"은 Week 38에 철회 |
| **로테이션 복식 / 세션** | 4명 이상 파트너 교대. **복식 신규 등록 기본 모드**. 등록 시 풀만 `rotation_sessions`에 저장, 빌더에서 게임(파트너·상대1·상대2 + 스코어 1줄)을 구성하면 finalize가 게임별 `personal_matches`로 분해(`rotation_session_id`·`group_seq`) |
| **로테이션 일정 / 세션 참여 동의** | 세션 = 경기 전 일정, 요청 = 경기 후 기록. 방 밖 세션은 풀의 회원 전원에게 참여 요청(좌석). **거절은 그 사람만 풀에서 뺀다**(세션 유지). **세션 수락 = 게임 참여 동의**(게임별 재수락 없음). 주최자·수락자가 회원을 초대할 수 있고(제거는 주최자만) 재초대하면 pending 복귀. **초대한 회원이 전원 응답해야 결과 입력 가능**(앱 `hasUnansweredSeats` = DB `session_seats_pending`, 소유자 예외 없음) — 0057~0063의 '선입력 후 선적립'은 사용자에게 이중 승인 화면이라 철회됐다. 무응답 탈출구 = 주최자가 명단에서 빼고 게스트로 기록(「상대 승인 대기」 세션 카드 → 참가자 편집 → [게스트로 대체], 명단에서 뺀 **뒤** 로컬 행 교체). **전원 수락된 일정은 허브를 떠나 개인 경기 결과 상단에서 입력한다**(Week 38). 세션 게임은 좌석 보유자 전원이 `get_rotation_session_games`로 보고 저장 시 `p_expected_seq`로 선점 감지. 앱 경계 = `canEnterRotationResult`·`classifyRotationSession`(enter/respond/awaitSeats/awaitOwner/none)·`canManageRotationPool` |
| **페어 고정 게스트 재요청** | 요청은 불변이라 미응답자를 바꾸려면 [게스트로 바꿔 다시 요청] = 취소 후 `/new?from=`에 프리필(`prefillFromRequest`: 미응답·거절 좌석의 `userId` 제거). 조회는 요청자 본인 ∧ canceled만(pending이면 dedup 유니크에 걸린다). `PersonalMatchForm.prefill`은 `initialData`(수정 모드 스위치)와 별개 |
| **코트명 / 경기 시각** | `court_name` ≤40자 선택(최근 코트 재선택) / `played_time` 시 단위 `HH:00` |
| **매칭 리스트 / 매칭 룸** | **매칭(방)이 1급 객체다**(Week 39) — 「매칭 만들기」(`/match-rooms/new`)가 유일한 생성 경로이고, 만들면 언제나 리스트에 오른다. 방식은 **단식/복식 둘뿐**이고 seed를 정한다: 단식은 참가자 없는 `personal_matches`, **복식은 곧 로테이션**이라 빈 풀 `rotation_sessions`. 페어 고정을 따로 두지 않는 이유는 빌더가 게임마다 파트너를 고르게 하므로 "매 게임 같은 파트너"가 그 특수 케이스이기 때문이다. 비밀번호(4~20자, bcrypt) 필수, 정원 없음, 제목 없음(자동). **시간은 시작 시각 + 소요 시간**이라 화면이 `10:00~12:00`으로 말하고(`formatRoomWhen`), **코트 면 수**가 동시에 도는 경기 수를 뜻한다 — 자동 대진표의 권장 경기 수가 여기서 갈린다(0073). **라운드 = 동시에 도는 한 묶음**(Week 44) — 저장하지 않고 게임 목록의 **순서에서 파생**한다(i번째 게임 = `floor(i/면수)`라운드 `i%면수`코트). 인원이 닿지 않으면 면을 다 못 쓰므로 실효 면 수는 `effectiveCourtCount`가 깎는다(11명으로 복식 3면은 2면) — 생성·추천·표시가 모두 이 값을 본다. 목록 화면은 **둘**이다(Week 45) — `/match-rooms`(전체 방, 고르러 오는 곳)와 `/me/match-rooms`(참여 중인 매칭 = 내 방 + 초대, 작업 큐). 둘 다 2탭이지만 **가르는 축이 다르다**(`RoomListAxis`): 매칭 리스트는 `schedule`(0049 규칙 — 종료 = `is_settled` ∨ 날짜 경과)로 "지금 들어갈 수 있나"를 묻고, 참여 중인 매칭은 `settlement`(진행 중 = `is_settled=false`, 날짜 무관)로 "끝났나"를 묻는다 — 결과 입력이 남은 방은 경기일이 지나도 내 할 일이라 진행 중에 남아야 하고(라벨도 '마무리됨'), 내 차례가 있는 방은 정의상 미정산이므로 **뱃지가 센 방이 전부 기본 탭에 모인다**. 날짜로 갈랐더니 뱃지 1이 '종료된' 탭에 숨어 어긋나던 것을 E2E에서 잡았다. 관계 축을 탭이 아니라 **라우트로** 가른 이유는 `fetchRoomPage`의 filter가 예나 지금이나 `open⏐past` 둘뿐이고 '내가 참여한'은 `roomIds` 좁히기라, 한 탭 바에 두면 같은 방이 두 탭에 겹치고 그 탭만 렌더 규칙이 달라지기 때문이다. 서버 필터 + keyset 커서(내 차례 우선 정렬은 **첫 페이지 안에서만**) |
| **방 게임 / 모집 중 / 관점 행 / 정산** | 방 참가자 누구나 룸 안 다이얼로그로 게임 추가 — 회원 상대면 상호 확인 게임(수락 단계 없음), 비회원 상대는 자유 기록. 모집 중 = 노출 + 참가자 비움(결과 입력 불가, "세트가 있으면 라인업 완성"이 불변식). 복식 상호 확인은 회원 참가자 전원에게 관점 행(대표 `invert`, 파트너 `swap_partner`, 상대2 합성). 방 상세는 `is_perspective=false` 대표 게임만. 게임 행은 개인 경기 카드와 같은 형태이고 **배지는 행마다 하나** — `roomGameStatusBadge`가 스코어 있는 행에 null을 주므로 상태 배지와 결과 배지가 겹치지 않는다(모집 중만 pending 톤, 나머지 상태는 spot). `is_settled` = 대표 게임 전부 확정 + 대기 없음. 2면 이상인 방의 게임 목록은 **라운드로 묶여** 그려진다(Week 44) — 자동 대진표가 「한 라운드 안에서 같은 사람이 두 코트에 서지 않게」 뽑으므로 그 묶음은 실제로 실행할 수 있는 일정이다. 로테이션 빌더가 넣은 게임(`group_seq`가 있다)은 사후 기록이라 묶지 않고 아래에 잇는다. **방장이 짠 대진은 나중에도 고칠 수 있다**(0071) — 결과도 협상도 없는 라인업 게임만, 게임 단위가 아니라 그 방의 미확정 라인업 **전량 교체**로. 자리를 바꾸면 requester가 달라져 관점의 기준이 통째로 바뀌기 때문이다. **게임마다 회원이 한 명은 있어야 한다**(0076) — 양 팀에 회원이 있으면 상호 확인 게임, 한 팀에만 있으면 그 회원의 자유 기록(결과를 넣으면 곧 확정)으로 저장된다. 게스트끼리는 짤 수 없다(소유자 없는 행은 모델에 없다). 배치는 양 팀 회원을 우선하고, 회원이 모자라면 회원이 편차를 넘어 더 자주 선다. 팀 줄의 **'나'는 당사자 전원**(작성자 포함, `isRoomGameParty`와 같은 집합)이고 제3자에게만 작성자 실명이 보인다(Week 46) — 단식이라도 첫 줄을 접지 않고 '나'를 그대로 보인다(방에는 남의 게임이 섞여 있다) |
| **방 초대 / 참가** | 매칭 만들기에서 지목한 회원과 룸 안 [회원 초대](`invite_room_members`, 0065)로 초대된다. 명단 헤더의 버튼은 둘 — [회원 초대]와 [비회원 초대], 각각 팝업이다. 초대받은 사람은 **비밀번호 없이** 수락만으로 참가(`respond_room_invite`) — 초대 카드는 매칭 리스트 최상단 「나를 초대한 매칭」과 룸 안 배너 두 곳에서 받는다. 비밀번호 입장자도 곧바로 참가, 미확정 로테이션 방이면 풀에 자동 추가. **비회원은 초대가 아니라 등록이다**(0069) — 수락할 계정이 없어 [참가자 추가 › 비회원]이 곧바로 명단에 올린다. 회원 멤버 행과 달리 users 행이 없어 이름이 정체성이고(방 안 유일), 자동 대진표·로테이션 빌더 풀에는 들어가지만 **게임 추가 폼의 상대 후보에는 넣지 않는다**(상호 확인 게임의 상대는 방 참가 회원이어야 한다). 명단은 **지금 방에 있는 사람만** 보여준다 — 나간 사람(declined)도 내보낸 사람(removed)도 행이 없고, 강퇴를 되돌리려면 방장이 [회원 초대]에서 그 사람을 다시 찾는다. **강퇴 = 그 방과 완전히 끊긴다**(0070) — 룸 상세도 보이지 않고(공개 메타 + 안내만), 그래서 경기에 배정된 회원은 애초에 내보낼 수 없다 |
| **직접 기록 / 매칭 경계** | `requiresRoom(players)` — **회원이 한 명이라도 끼면 매칭 룸을 거친다**(Week 39). 상대에게도 남는 기록이라 참여 동의와 결과 확인이 필요하고 그 절차는 룸 안에만 있다. 방 없는 「직접 기록」(`/me/personal-matches/new`)은 비회원끼리의 경기 전용 — 확인해 줄 상대가 없어 스코어를 넣는 순간 확정된다. DB 가드가 없으므로 **폼과 서버 액션 양쪽**이 이 술어를 본다. `player-suggestions`는 회원과 이름이 겹치는 '만나본 사람' 항목을 버린다(그 오선택이 곧 우회로) |
| **작업 큐 / 내 차례 / 룸 4단계** | **매칭 리스트가 방을 가로지르는 작업 큐**(Week 39). `classifyPendingMatch`가 미확정 행을 8버킷으로 나누고, `turnOfBucket`·`rollUpRoomTurns`(room-turn.ts)가 그것을 `room_id`로 접어 방마다 가장 급한 차례 하나 + 건수를 만든다(우선순위 reenter→reentryReview→confirm→enter→fillLineup→waiting). 룸 안에서는 같은 어휘를 `classifyRoomGameTurn`이 대표 게임에 직접 적용해 「지금 할 일」 배너를 그린다 — 두 경로가 같은 자격 술어(confirmation.ts)를 보므로 "배너는 할 일이 있다는데 버튼이 없는" 상태가 없다. 룸 단계는 `roomStage`가 모집 중/진행 중/결과 확인 중/종료로 파생(미확정 로테이션 방은 결코 '결과 확인 중'이 아니다). **한 행은 정확히 한 자리에만** — 경계는 `room_id` |
| **⚠ 뱃지 = 그려지는 카드 수** | 사이드바·모바일 뱃지 = `roomBadgeTotal(turns, inviteCount)` = **「참여 중인 매칭」(`/me/match-rooms`)에서 강조되는 카드 수**(방 초대 + 내 차례가 있는 방). 정의가 곧 "그 화면에 실제로 그려지는 강조 카드 수"라 뱃지와 목록이 어긋날 수 없다 — Week 38까지 알림(myTurnTotal)과 목차(hub-totals)가 따로 놀던 구조는 허브와 함께 사라졌다. **뱃지가 붙는 메뉴와 그 카드들이 그려지는 화면은 언제나 같아야 한다**(Week 45) — 매칭 리스트에 얹혀 있던 시절에는 뱃지를 눌러도 기본 탭이 전체 목록이라 정작 센 것들이 한 탭 뒤에 있었다. 뱃지 대상은 `NavItem.badge`가 데이터로 들고 있다(href 하드코딩 아님). 뺄셈으로 정의하지 않는다. 방 밖 직접 기록의 결과 입력은 뱃지 밖(확인해 줄 상대가 없어 알릴 일이 아니다). `QueueSection.count`는 반드시 실제 카드 수(0이면 children까지 사라진다) |

## 코딩 규칙
- TypeScript strict, `any` 금지. named export만(default export 금지). 파일 kebab-case, 컴포넌트 PascalCase, 함수 camelCase
- 컴포넌트 100줄 이내(길면 분리), props 타입 필수, shadcn/ui 우선 사용
- 폰트 사이즈는 시맨틱 토큰만: `text-display`·`text-h1~h4`·`text-body`·`text-body2`·`text-caption`(배지 전용 `text-micro`). `text-sm`·`text-xs`·`text-[13px]` 금지. 굵기·색은 `TYPO`로 조합(`docs/typography.md`)
- 색상은 시맨틱 토큰만: 베이스(background/foreground/card/muted/border/input/ring), 상태(primary/info/win/loss/destructive/spot + `-solid`·`-foreground`), 분류(cat-1~8). Tailwind 팔레트·`bg-[#hex]`·새 `dark:` 분기 금지(`docs/color-system.md`; 대기·주의 = spot, 클릭 = primary)
- 헤딩은 태그 = 아웃라인, 클래스 = 시각 레벨. 페이지 h1은 `PageHeader`, 카드 제목은 헤딩 태그 + `TYPO.h4`
- 폼·팝업 하단의 저장/취소는 언제나 `FormActions`(치수는 `FORM_ACTION_ROW`·`FORM_SUBMIT`·`FORM_CANCEL`) — 저장은 라임(`variant="accent"`) 왼쪽, 취소는 outline 오른쪽. 팝업이면 `DialogFooter` 바 안에 넣고 `showCloseButton`은 쓰지 않는다(영문 'Close'가 노출된다). 파괴적 확인만 예외로 `variant="destructive"`를 지킨다
- input/textarea/select는 전 뷰포트 16px(iOS 줌 방지) — 작은 사이즈 클래스 금지
- 순수 규칙(분류·자격·검증)은 `lib/`의 순수 함수로 두고 vitest로 고정. 앱 술어는 DB RPC 가드의 거울이어야 한다(예: `canEnterRotationResult` ↔ finalize 가드)

### Supabase
- 읽기: Server Component에서 `lib/supabase/server.ts`. 쓰기: `lib/actions/*` Server Action으로만. Client Component는 `lib/supabase/client.ts` read-only
- 권한 판단은 `club_members.role = 'owner'` 기준(`clubs.owner_id` 직접 비교 금지). 환경변수는 `.env.local`만
- 마이그레이션은 `supabase/migrations/00NN_slug.sql`이 정본. 새 RPC는 anon EXECUTE 회수, pgcrypto는 `set search_path = public, extensions`. RLS/RPC 검증은 `execute_sql`에 `begin; … rollback;` 롤백 스모크(사용자 컨텍스트는 `set_config('request.jwt.claims', …)`)

## 타입 정의 요약 (src/types/index.ts)
```ts
export type MatchResult = { sets: Array<{ team1: number; team2: number }>; winnerId: 'team1' | 'team2' | 'draw' }
export type Match = {
  id: string; matchGameId: string; matchType: MatchType
  player1Id?: string; player2Id?: string          // 단식
  team1?: string[]; team2?: string[]              // 복식
  team1AdPlayerId?: string; team2AdPlayerId?: string
  status: 'scheduled' | 'finished'; result?: MatchResult
}
export type MatchGame = { id: string; clubId: string; name: string; date: string; courts: Court[]; rounds: Round[]; matches: Match[]; isFixed: boolean; createdAt: string }
```
개인 경기·요청·협상·세션 타입(`PersonalMatch`, `PersonalMatchConfirmation`, `MatchRequest`, `MatchRequestSeat`, `RotationSession`)은 `src/types/index.ts` 주석이 정본.

## 자주 쓰는 커맨드
```bash
npm run dev · npm run build · npm run lint · npx tsc --noEmit · npx vitest run
```

## 관리자 계정
admin@admin.com / 123123

## 절대 하지 말 것
- `any` 타입, default export, `console.log` 커밋
- `components/ui/` 직접 수정, 환경변수 하드코딩
- 시맨틱 타이포·컬러 토큰 외 클래스(`text-sm`·`bg-sky-500`·`bg-[#hex]`), `globals.css` 밖 hex(예외: components/ui·`lib/rating/tier.ts`·`lib/og/brand.ts`·`app/layout.tsx` 미러)
- `match_requests`·`match_result_negotiations`·`rotation_session_participants`·`match_room_secrets` 직접 INSERT/UPDATE(RPC·트리거 전용)

## 작업 완료 후 체크리스트
- [ ] `npx tsc --noEmit` · `npm run lint` · `npm run build` · `npx vitest run`
- [ ] DB 변경 시 롤백 SQL 스모크 + `types/supabase.ts` 갱신
- [ ] CLAUDE.md의 이력 표·백로그 갱신(배경 서사는 `docs/history/`)
- [ ] 룸·협상·직접 기록 흐름을 건드렸으면 `docs/e2e/match-room-scenarios.md`의 해당 시나리오를 다시 돌리고 `docs/e2e/runs.md`에 한 줄
- [ ] git commit (conventional commits)
