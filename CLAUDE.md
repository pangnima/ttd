# 테니스 클럽 플랫폼 — CLAUDE.md

> 이 문서는 **현재 규칙과 구조**만 담는다. Week별 결정 배경·결함 분석·검증 기록 전문은 `docs/history/claude-md-2026-09-08.md`(정리 전 원본), 설계 문서는 `docs/`(match-flow-refactor·rating-system·color-system·typography·redesign/)에 있다.

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
│   │   ├── me/                   # analytics(→profile 리다이렉트) / personal-matches(확정 전적 + 방 밖 결과 입력 대기, new=직접 기록/edit) / match-requests(→/match-rooms 리다이렉트)
│   │   ├── match-rooms/          # 매칭 리스트 3탭 + [roomId] 매칭 룸 상세(비밀번호 게이트 → 참가자·게임·결과 입력)
│   │   ├── profile/              # [userId](본인=분석 풀버전, 타인=공개 요약) / settings
│   └── page.tsx                  # 랜딩
├── components/
│   ├── ui/                       # shadcn 자동 생성 — 직접 수정 금지
│   ├── common/                   # PageHeader(h1·badge 슬롯), Header, Sidebar(3메뉴), MobileNav, LinkTabs(URL 탭 바), FieldToggle, RacketField, NameStatusLine, TierIcon 등
│   ├── clubs/ club-dashboard/ match-games/ profile/ onboarding/ stats/ auth/ landing/ theme/
│   ├── personal-matches/         # PersonalMatchForm(= use-personal-match-form-state + use-personal-match-submit), PlayerPicker, PersonalMatchCard + MatchGroupList/Header,
│   │                             #   MatchActions(확정) / MutualResultActions·ConfirmedSeatActions·DisputedResultActions(미확정 협상 — 개인 카드·룸 행 공용), NegotiationDialog + MatchResultDialog + use-result-dialog,
│   │                             #   RotationSessionCard + RotationGamesDialog + rotation/(풀·게임 빌더), PendingResultsSection(방 밖 「결과 입력 대기」), QueueSection/PendingMatchSection/PendingMatchActions,
│   │                             #   NegotiationTurnActions(내 차례 꼬리 — 개인 카드·룸 행 공용), SeatProgressBadge, MemberNeedsRoomNotice, result-badge 단일 출처
│   └── match-rooms/              # MatchRoomForm(매칭 만들기) + form-sections(format/password/invitee), MatchRoomCard(내 차례 필), RoomInvitesSection/RoomInviteCard, RoomListBody,
│                                 #   RoomDetailHeader + RoomStageBadge, RoomTurnBanner, RoomSettledNotice, RoomMembersSection + RoomInviteMembers, RoomGamesSection,
│                                 #   RoomGameActions → RoomGameNegotiationActions/RoomFreeGameActions, RoomGameDialog, RoomRotationBuilder, RoomHostActions, RoomGateView,
│                                 #   RoomLineupButton → RoomLineupDialog(= use-room-lineup + lineup-options/participant-chips + RoomLineupPreview → RoomLineupGameCard, RoomLineupNotices),
│                                 #   MemberMetaLine(NTRP·주력손·라켓), RoomMemberHostActions(내보내기·다시 초대), RoomRemovedNotice,
│                                 #   RoomInviteMembers(회원 초대 ↔ 비회원 추가 2모드) → RoomInviteMemberSearch/RoomGuestForm, RoomGuestRemoveButton
├── lib/
│   ├── supabase/                 # client.ts(브라우저) / server.ts(서버) / middleware.ts
│   ├── actions/                  # Server Actions — auth, clubs, club-members, match-games, personal-matches, match-requests, match-results, rotation-sessions, match-rooms, profile, ratings, ai-coaching
│   ├── queries/                  # read-only — match-queue.ts(fetchMatchQueue, React cache: 미확정 단일 소스), room-queue.ts(매칭 리스트 작업 큐·뱃지), room-detail-extras, personal-matches, rotation-sessions, match-rooms, rotation-builder-context, analytics, player-profile, club-dashboard, ratings, stats, users
│   ├── match-requests/           # 순수(vitest): queue.ts(미확정 8버킷 분류) / participants.ts(좌석 규칙)
│   ├── personal-matches/         # 순수: lineup, map/explode/grouping/winner, match-groups, confirmation(협상 관점·자격 술어), perspective, confirm-flow, labels, validate-input,
│   │                             #   rotation·rotation-pool·rotation-rep·rotation-participation·rotation-entered, session-visibility, direct-record(회원이 끼면 매칭 룸), schedule-conflict, player-suggestions, seat-status
│   ├── match-rooms/              # 순수 + server-only: create-match(매칭 만들기 규칙 — 복식 = 로테이션), room-stage(4단계), room-turn(내 차례·방 롤업·뱃지 총계), room-sort, password,
│                                 #   title/split/headcount/members-view, parse-detail, room-context, game-status, game-labels, tabs, room-cursor, revalidate, create-room,
│                                 #   lineup(자동 대진표 — 프리셋 3종·시드 난수·출전 균등), lineup-balance(전력차 → 등급), kick(강퇴·재초대 자격)
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
/match-rooms                        매칭 리스트 = 작업 큐. 최상단 「나를 초대한 매칭」 + 3탭(진행 중 / ?tab=mine 내가 참여한 / ?tab=past 종료된), 카드에 내 차례 필
/match-rooms/new                    매칭 만들기 (방식 단식/복식 · 일시·표면·코트·비밀번호·상대 초대 — 스코어 없음)
/match-rooms/[roomId]               매칭 룸 상세 = 단일 작업 공간(단계 칩 · 「지금 할 일」 배너 · 참가자·초대 · 대진 · 결과/확인/이의/정정)
/me/match-requests                  → /match-rooms 리다이렉트 (Week 39 허브 철거)
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
| 41 | 0067~0069 | **대진표 시인성 · 참가자 메타 · 방장 강퇴** — 대진 카드를 팀 두 줄 + 색 바(cat-1/cat-5)·구분선으로 갈라 `vs` 폐기, 균형 등급(`lineup-balance`), `DialogFooter`로 저장 버튼 고정, 옵션 접기. 룸 명단에 NTRP·주력손·라켓(`get_match_room_detail` 확장, `derive_public_ntrp` 경유). 방장 강퇴 `kick_room_member` — **removed = 읽기는 남고 참가만 끊긴다**(결과 확인 UI가 룸 안에만 있어 막으면 게임이 영영 미확정), `leave_match_room` 우회 차단 + 트리거 안전망, 방장만 재초대로 해제. 룸 「게임」 섹션 시인성 — 헤더 액션 3종(자동 대진표·게임 입력·게임 추가)을 ghost 링크에서 outline 버튼으로 통일(「참가자 초대」 관용구), 게임 행을 개인 경기 카드 형태(색 바 + 팀 두 줄 + **배지 하나** + 하단 스코어↔액션)로 재구성, `buildRoomGameTeams`·`roomGameStatusBadge` 신설. **룸 비회원 참가자**(0069 `match_room_guests`) — 게임에 이름을 적기 전부터 명단에 오르고 자동 대진표의 배치 대상이 된다(`add/remove_room_guest`, 상세 RPC에 `guests` 키). 게임 행은 머리줄 「타입 배지 · 게임 N ↔ 배지 하나」 → 팀 두 줄 → 스코어↔액션 순 |

### 남은 일 (백로그)
- **배포**: Vercel + 환경변수(`NEXT_PUBLIC_SUPABASE_URL`·`_ANON_KEY`·`ANTHROPIC_API_KEY`), leaked password protection + URL 화이트리스트(`/auth/confirm`), 재설정 메일 템플릿, `metadataBase` 환경변수화
- **픽스처 잔여**: 클럽·대진표 `redesign-fixtures` → 실 쿼리 복원, 프로필 클럽/통합 탭 활성화, 타인 프로필 통계 픽스처화 여부
- **브라우저 E2E 수동 검증**(계정 2~3개, 최우선): Week 39 흐름 — 매칭 만들기 → 초대 수락(비번 없이) / 비번 입장 → 룸 게임 → 제안·확인·이의 → 정산 → 개인 경기 결과, 로테이션 방(빈 풀 → 입장으로 채움 → 빌더), 직접 기록의 회원 차단, 레거시 URL(/me/match-requests·/guide)
- **알림·리마인더·만료 전무** — 매칭이 룸 중심이 되며 무응답이 방을 막는다. 이의 왕복 상한 없음(`dispute_count`만 셈)
- **Week 41 잔여**: 게임 추가 폼의 파트너·상대2 자동완성에 방 게스트가 뜨지 않는다(이름을 다시 친다), 게스트가 절반을 넘는 방은 「각 팀 회원 최소 1명」 제약으로 경기 수가 줄지만 별도 안내 없이 기존 warnings로만 드러난다, 강퇴 알림 없음(강퇴자는 방을 열어야 안다), 방장이 남의 stale 자유 기록을 정리할 경로 없음(`leave_match_room`에도 있던 기존 구멍), 손잡이 한글 라벨 4곳 중복(`formatDominantHand`만 신설), `DialogFooter`를 room-game/rotation-games 다이얼로그로 확산
- **Week 40 잔여**: 미확정 로테이션 복식 방에서는 [자동 대진표]와 로테이션 빌더가 함께 보인다(두 경로 공존), 저장한 대진의 일괄 삭제·재생성 없음
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
> 2026-09 재설계(`docs/redesign/`): 다형성 컬럼을 참가자 테이블로 정규화. 마이그레이션 0001~0068(0016부터 `supabase/migrations/*.sql`이 정본, 원격 적용은 MCP `apply_migration`). 원격 DB의 정의가 레포에 없으면 `execute_sql`로 읽어 마이그레이션에 편입한다.

| 테이블 | 핵심 규칙 |
|---|---|
| `users` | 본인만 UPDATE. 행 생성은 `handle_new_user` 트리거. `is_guest`·`personal_ntrp`·`deleted_at`(soft delete)·`racket_brand/model`·`ntrp`(가입 시 1회) |
| `clubs` / `club_members` / `club_invites` | 공개 클럽 전체 SELECT, owner만 UPDATE/DELETE. approved 멤버만 SELECT, owner/officer 승인. 초대는 SECURITY DEFINER RPC로만 |
| `match_games` + courts/rounds/time_slots/`match_game_matches`/`match_game_participants` | approved 멤버 SELECT/INSERT/UPDATE, owner DELETE. 참가자 `{match_id,user_id,side,is_ad}` 단식 2행/복식 4행. `winner_id`는 team1/team2/draw 리터럴 |
| `personal_matches` + `personal_match_participants` | 본인만 CRUD(INSERT/UPDATE는 `room_id is null or is_room_participant`). **`has_result`**(생성 컬럼 = set_scores 비어 있지 않음)가 확정/미확정 집합 분할 술어. `source_type` direct/confirmation/rotation, confirmation은 RESTRICTIVE 잠금. `is_perspective`(관점 복사본 — 방의 대표 게임 판정), `rotation_session_id`·`group_seq`(로테이션 묶음), `court_name`, `room_id`. 참가자 슬롯 행은 이름이 있을 때만 |
| `match_requests` + `match_request_participants` | SELECT `is_request_party`(당사자 둘 + 복식 참가자). **생성은 `create_match_request` RPC 전용**, 수락도 RPC. **방 밖 요청의 `set_scores`는 언제나 빈 배열**(CHECK `match_requests_offroom_no_scores`, 스코어는 협상 행에만). 좌석 `participation_status` 기본 pending — BEFORE INSERT 트리거 `default_participation_status`가 방 안 경로·비회원·탈퇴자만 accepted로. `opponent_accepted_at`, `rotation_session_id`·`group_seq`(로테이션 파생 요청은 pending 중복 유니크에서 제외) |
| `match_result_negotiations` | request 1:1, 쓰기는 RPC 전용. `confirmed_by uuid[]`(제안자는 제안 시 포함, 활성 회원 좌석 전원이 들어가면 정산), `disputed_by`, `dispute_count`. BEFORE 트리거 `normalize_result_confirmations`: 제안·재제안 → `[제안자]`, 유일한 초기화는 `result_status='none'`. **협상 이력 컬럼은 상태 전이로 지워지지 않는다 — 현재 상태는 `result_status` 하나** |
| `rotation_sessions` + `rotation_session_participants` | 세션 SELECT = 본인 ∪ 방 참가자 ∪ 좌석 보유자(`is_rotation_session_seat`). ⚠ 세션 정책식이 세션을 되읽으면 `INSERT … RETURNING`이 42501 — 앞 두 항은 컬럼 비교, 세션을 되읽는 `is_rotation_session_party`는 참가자 테이블 정책 전용. UPDATE 정책 없음(풀 조작은 RPC). 좌석은 트리거 `sync_rotation_session_participants`가 `players`의 활성 회원에서 파생(스냅샷·role 없음, 소유자 행 없음, rejected/removed는 보존해 재초대 진입점), 방 세션은 accepted로 시작. 좌석 있는 세션은 finalize 후에도 남는다 |
| `match_rooms` / `match_room_secrets` / `match_room_members` | 방 메타 전원 SELECT, DELETE 방장. secrets는 정책 0개(bcrypt, RPC 전용). 멤버 `{role host/player, status invited/joined/declined/removed}` — 비밀번호 입장 = `player/joined`, 정원 없음. `removed`(0068)는 **읽기는 남고 참가만 끊긴다**(입장 RPC가 `room_member_removed`, `leave_match_room`도 막아 우회 불가, 트리거 `keep_removed_room_member`가 안전망). 해제는 방장의 재초대뿐. `is_settled` = 대표 게임 전부 확정 + 대기 요청·미확정 세션 없음. 출처 3테이블의 `room_id` FK(set null), 참조 행이 하나도 없을 때만 트리거가 방 삭제 |
| `match_room_guests` | 방에 등록된 비회원(0069). SELECT = 방 참가자, 쓰기는 RPC 전용(정책 0개). `unique(room_id, lower(btrim(name)))` — 명단·풀의 게스트 dedupe가 이름 기준이라 방 안 동명이인을 막는다. 방 삭제 시 cascade, 게스트를 빼도 이미 저장된 게임은 그대로 |
| `club_player_ratings` / `club_rating_history` / `ai_coaching_cache` | approved 멤버 SELECT, 쓰기 RPC · 본인 통계 해시 캐시 24h |

**헬퍼**: `is_club_owner/approved_member/owner_or_officer`, `is_request_party`, `is_rotation_session_party`·`is_rotation_session_seat`, `is_room_participant`, `is_active_member` (SECURITY DEFINER — 정책식의 상호 재귀 우회)

**RPC** (신규 RPC는 `revoke execute … from anon` 명시 — Supabase 기본 권한이 자동 부여, 트리거 함수는 PUBLIC도 회수):
- 대진표·클럽: `create/update_match_game`(참가자 배열), `add_guest_player`, 통계 4종(`get_user_match_stats_v2`·`get_user_head_to_head`·`get_user_doubles_court_stats`·`get_user_partner_stats`, `p_club_id` 선택), 클럽 랭킹 3종, `apply_club_rating_snapshot`, `get_invite_preview`·`join_club_via_invite`
- 확인 요청: `create_match_request`(스코어 거부 `set_scores_not_allowed`), `accept_match_request`(대표 수락 → 게이트), `maybe_materialize_request`(**전원 수락 게이트 단일 초크포인트**, 요청 행 락), `materialize_accepted_request`(회원 참가자 전원 관점 행), `respond_request_participation`, `respond_rotation_participation`(세션 단위 일괄 — 좌석 축까지 움직인다), `reject_match_request`(한 명의 거절 = 요청 종료), `backfill_rotation_perspectives`
- 결과 협상: `propose/confirm/dispute/reopen_match_result` — 자격 좌석 넷(`request_seat_of`), 제안은 `normalize_to_requester_perspective`로 요청자 관점 정규화, confirm은 `confirmed_by` 추가 후 `request_result_seats ⊆ confirmed_by`면 `settle_match_result`(boolean 반환, 멱등). 제안자 본인만 제안 수정(`result_already_proposed`는 타인), dispute는 제안자만 거부(확인한 좌석도 정산 전이면 가능), reopen은 확정 행 전부 비움 + disputed. 헬퍼 `invert_set_scores`·`validate_set_scores`·`normalize_set_scores`·`derive_public_ntrp`
- 로테이션: `finalize_rotation_session(session, games, expected_seq?)` — 기준 '나'는 호출자, 방 밖은 좌석 **전원 응답**해야 진입(`session_seats_pending`, 신원 검사가 먼저), `p_expected_seq ≠ max+1`이면 `session_games_changed`, allowlist(풀 ∪ 방 참가자 ∪ 소유자 − 거절자)로 위조 방어, 상대팀에 회원이 있으면 요청(accepted)+제안, 전원 비회원만 즉시 확정. `get_rotation_session_games`(좌석·소유자·방 참가자에게 대표 게임 전량), `respond_rotation_plan`(일정 응답 — 거절은 그 사람만 풀에서 뺀다), `add/remove_rotation_session_player`(방 밖 전용), `rotation_seats_accepted`, `close_rotation_room`
- 매칭 룸: `create_match_room`, `invite_room_members`(0065 — 방장·참가자가 회원 초대, 게스트·탈퇴·본인 조용히 제외, joined 강등 금지), `enter_match_room`(→ `join_match_room_as_player`: joined + 미확정 로테이션 풀 append + 방 요청 좌석 수락), `respond_room_invite`, `update_match_room_password`, `get_match_room_detail`(멤버 게이트 후 jsonb), `leave_match_room`(방장 불가), `create_room_game`(참가자가 만드는 상호 확인 게임 — seed 치환 순서 고정), `create_room_lineup`(0066 — 방장이 짠 대진을 스코어 없는 게임들로 일괄 저장, requester가 호출자가 아니어도 된다 + 슬롯 정규화 `resolve_room_player`), `add_room_guest`·`remove_room_guest`(0069 — 비회원 등록·제거. 자격은 초대와 같은 눈높이(방장 ∨ joined), 정산된 방 금지, 제거는 방장 ∨ 등록한 본인), `kick_room_member`(0068 — 방장 전용 강퇴. 멤버 상태만 removed로 두고 로테이션 풀에서 빼며 요청·기록은 건드리지 않는다), `recompute_match_room_settled`, 관점 헬퍼 `copy_personal_match_perspective`·`swap_partner_perspective`·`swap_opponent_perspective`·`resolve_rotation_player`

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
| **매칭 리스트 / 매칭 룸** | **매칭(방)이 1급 객체다**(Week 39) — 「매칭 만들기」(`/match-rooms/new`)가 유일한 생성 경로이고, 만들면 언제나 리스트에 오른다. 방식은 **단식/복식 둘뿐**이고 seed를 정한다: 단식은 참가자 없는 `personal_matches`, **복식은 곧 로테이션**이라 빈 풀 `rotation_sessions`. 페어 고정을 따로 두지 않는 이유는 빌더가 게임마다 파트너를 고르게 하므로 "매 게임 같은 파트너"가 그 특수 케이스이기 때문이다. 비밀번호(4~20자, bcrypt) 필수, 정원 없음, 제목 없음(자동). 3탭(진행 중/내가 참여한/종료된), 진행/종료 = `is_settled` ∨ 날짜 경과, 서버 필터 + keyset 커서(내 차례 우선 정렬은 **첫 페이지 안에서만**) |
| **방 게임 / 모집 중 / 관점 행 / 정산** | 방 참가자 누구나 룸 안 다이얼로그로 게임 추가 — 회원 상대면 상호 확인 게임(수락 단계 없음), 비회원 상대는 자유 기록. 모집 중 = 노출 + 참가자 비움(결과 입력 불가, "세트가 있으면 라인업 완성"이 불변식). 복식 상호 확인은 회원 참가자 전원에게 관점 행(대표 `invert`, 파트너 `swap_partner`, 상대2 합성). 방 상세는 `is_perspective=false` 대표 게임만. 게임 행은 개인 경기 카드와 같은 형태이고 **배지는 행마다 하나** — `roomGameStatusBadge`가 스코어 있는 행에 null을 주므로 상태 배지와 결과 배지가 겹치지 않는다(모집 중만 pending 톤, 나머지 상태는 spot). `is_settled` = 대표 게임 전부 확정 + 대기 없음 |
| **방 초대 / 참가** | 매칭 만들기에서 지목한 회원과 룸 안 [참가자 초대](`invite_room_members`, 0065)로 초대된다. 초대받은 사람은 **비밀번호 없이** 수락만으로 참가(`respond_room_invite`) — 초대 카드는 매칭 리스트 최상단 「나를 초대한 매칭」과 룸 안 배너 두 곳에서 받는다. 비밀번호 입장자도 곧바로 참가, 미확정 로테이션 방이면 풀에 자동 추가. **비회원은 초대가 아니라 등록이다**(0069) — 수락할 계정이 없어 [참가자 추가 › 비회원]이 곧바로 명단에 올린다. 회원 멤버 행과 달리 users 행이 없어 이름이 정체성이고(방 안 유일), 자동 대진표·로테이션 빌더 풀에는 들어가지만 **게임 추가 폼의 상대 후보에는 넣지 않는다**(상호 확인 게임의 상대는 방 참가 회원이어야 한다) |
| **직접 기록 / 매칭 경계** | `requiresRoom(players)` — **회원이 한 명이라도 끼면 매칭 룸을 거친다**(Week 39). 상대에게도 남는 기록이라 참여 동의와 결과 확인이 필요하고 그 절차는 룸 안에만 있다. 방 없는 「직접 기록」(`/me/personal-matches/new`)은 비회원끼리의 경기 전용 — 확인해 줄 상대가 없어 스코어를 넣는 순간 확정된다. DB 가드가 없으므로 **폼과 서버 액션 양쪽**이 이 술어를 본다. `player-suggestions`는 회원과 이름이 겹치는 '만나본 사람' 항목을 버린다(그 오선택이 곧 우회로) |
| **작업 큐 / 내 차례 / 룸 4단계** | **매칭 리스트가 방을 가로지르는 작업 큐**(Week 39). `classifyPendingMatch`가 미확정 행을 8버킷으로 나누고, `turnOfBucket`·`rollUpRoomTurns`(room-turn.ts)가 그것을 `room_id`로 접어 방마다 가장 급한 차례 하나 + 건수를 만든다(우선순위 reenter→reentryReview→confirm→enter→fillLineup→waiting). 룸 안에서는 같은 어휘를 `classifyRoomGameTurn`이 대표 게임에 직접 적용해 「지금 할 일」 배너를 그린다 — 두 경로가 같은 자격 술어(confirmation.ts)를 보므로 "배너는 할 일이 있다는데 버튼이 없는" 상태가 없다. 룸 단계는 `roomStage`가 모집 중/진행 중/결과 확인 중/종료로 파생(미확정 로테이션 방은 결코 '결과 확인 중'이 아니다). **한 행은 정확히 한 자리에만** — 경계는 `room_id` |
| **⚠ 뱃지 = 그려지는 카드 수** | 사이드바·모바일 뱃지 = `roomBadgeTotal(turns, inviteCount)` = **매칭 리스트에서 내 차례로 강조되는 카드 수**(방 초대 + 내 차례가 있는 방). 정의가 곧 "그 화면에 실제로 그려지는 강조 카드 수"라 뱃지와 목록이 어긋날 수 없다 — Week 38까지 알림(myTurnTotal)과 목차(hub-totals)가 따로 놀던 구조는 허브와 함께 사라졌다. 뺄셈으로 정의하지 않는다. 방 밖 직접 기록의 결과 입력은 뱃지 밖(확인해 줄 상대가 없어 알릴 일이 아니다). '내 차례 있음'은 숫자가 아니라 강조색(`LinkTabs emphasis`)이 전달. `QueueSection.count`는 반드시 실제 카드 수(0이면 children까지 사라진다) |

## 코딩 규칙
- TypeScript strict, `any` 금지. named export만(default export 금지). 파일 kebab-case, 컴포넌트 PascalCase, 함수 camelCase
- 컴포넌트 100줄 이내(길면 분리), props 타입 필수, shadcn/ui 우선 사용
- 폰트 사이즈는 시맨틱 토큰만: `text-display`·`text-h1~h4`·`text-body`·`text-body2`·`text-caption`(배지 전용 `text-micro`). `text-sm`·`text-xs`·`text-[13px]` 금지. 굵기·색은 `TYPO`로 조합(`docs/typography.md`)
- 색상은 시맨틱 토큰만: 베이스(background/foreground/card/muted/border/input/ring), 상태(primary/info/win/loss/destructive/spot + `-solid`·`-foreground`), 분류(cat-1~8). Tailwind 팔레트·`bg-[#hex]`·새 `dark:` 분기 금지(`docs/color-system.md`; 대기·주의 = spot, 클릭 = primary)
- 헤딩은 태그 = 아웃라인, 클래스 = 시각 레벨. 페이지 h1은 `PageHeader`, 카드 제목은 헤딩 태그 + `TYPO.h4`
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
- [ ] git commit (conventional commits)
