# 경기 기록 도메인 플로우 재정립 — 개인 결과 / 확인 요청 / 매칭 리스트 / 매칭 룸

> **진행 상황 (2026-09-05 기준)**
>
> | Step | 상태 | 비고 |
> |---|---|---|
> | 0 · 순수 함수 + 캐시 무효화 보강 | ✅ 완료 | `lib/match-rooms/{revalidate,game-labels}.ts` 신설, 기존 revalidate 결함 3건 수정 |
> | 1 · 마이그레이션 0051 (`has_result`) | ✅ 완료 | **원격 Supabase에 적용됨 — 다시 적용하지 말 것** |
> | 2 · 순수 분류기 `match-requests/queue.ts` | ✅ 완료 | 테스트 18개 (`viewerIsParty` 케이스 포함) |
> | 3 · 쿼리 계층 | ✅ 완료 | `queries/match-queue.ts`(`fetchMatchQueue`, React cache) + 개인 경기 확정/미확정 분할 + `viewerIsParty`·`isPerspective` 매핑 |
> | 4 · 허브 실 연동 | ✅ 완료 | 픽스처·`result-confirm-card` 제거, 내 차례/상대 대기 2탭 8섹션 |
> | 5 · 개인 결과 축소 + 배너 | ✅ 완료 | `QueueSummaryBanner`, `MatchActions` 축소, 저장 후 목적지 교정 |
> | 6 · 뱃지 단일화 + 죽은 코드 제거 | ✅ 완료 | 뱃지 = `myTurnTotal`, 구 쿼리 6종·`RotationSessionList` 삭제 |
> | 7 · 매칭 리스트 3탭 | ✅ 완료 | `lib/match-rooms/tabs.ts`(+테스트)·`LinkTabs`·`RoomListSection`·`ROOM_LIST_LIMIT` |
> | 8 · 룸 안 게임 추가 | ✅ 완료 | `RoomGameDialog`, 폼 `variant='dialog'`+`SubmitNavigation`, `metaOk` 결함 수정, `?room=` redirect |
> | 9 · 룸 안 결과 입력·로테이션 빌더 | ✅ 완료 | `RoomGameActions`(자격 = 협상 행 존재)·`RoomRotationBuilder`·`fetchRoomGameConfirmations` |
> | 10 · 라벨 전수 교체 | ✅ 완료 | 매칭 리스트/매칭 룸/개인 경기 결과, 사이드바 생애 순서 재배열, `'방장'` 판정 키 보존 |
> | 11 · 마이그레이션 0052 | ✅ 완료 | **원격 Supabase에 적용됨 — 다시 적용하지 말 것.** `is_request_party` 헬퍼 + SELECT 정책 3종 교체, 파트너·상대2 대기 배지를 실제 상태로 승격(`bystanderWaitingBadge`) |
> | 12 · 서버 필터·페이지네이션 | ⬜ 범위 밖 | 후속 |
>
> 종료 시점에 `npx tsc --noEmit` · `npm run lint` · `npm run build` · `npx vitest run` 전부 통과(테스트 404).
> **엔드투엔드 수동 시나리오 8종도 완료**(아래 "검증") — 표시 결함 3건을 찾아 수정했다. 남은 것은 Step 12(후속·범위 밖)뿐이다.

## Context

Week 17~26을 거치며 기능이 화면 단위로 증식한 결과, **같은 "미확정 경기" 상태가 세 화면에 중복·누락 노출**되고 있다.

- `/me/personal-matches`("개인 경기 기록")가 확정·미확정·모집 중·로테이션 대기를 한 목록에 섞어 보여준다.
- `/me/match-requests`("경기 확인 요청")는 **아직 더미 픽스처로 동작**한다(`page.tsx:4-7,31-33`). 실 쿼리 3종은 구현돼 있으나 호출부가 0곳이고, `FIXTURE_SELF_ID='fixture-self'` 픽스처에 실제 `user.id`를 `viewerId`로 넘겨(`:88`) 관점 반전이 항상 틀린 분기로 떨어진다.
- `/match-rooms/[roomId]`("경기 방")은 상태 칩만 있고 액션이 0개라, 게임 추가는 `/me/personal-matches/new?room=`으로, 결과 입력은 `/me/personal-matches`로 **룸을 두 번 이탈**시킨다(`room-games-section.tsx:35`, `room-game-row.tsx:46`).

결과적으로 사용자는 "지금 뭘 해야 하고 어디로 가야 하는지"를 알 수 없다.

### 목표 IA

| 화면 | 정체성 | 담는 상태 |
|---|---|---|
| **개인 경기 결과** `/me/personal-matches` | 내 확정 전적 아카이브 + 경기 추가 진입점 | 확정 경기만. 미확정은 상단 요약 배너로만 |
| **경기 확인 요청** `/me/match-requests` | 미확정 전량의 단일 작업 큐 (**내 차례 / 상대 대기** 2탭) | 요청 대기·결과 미입력·확인 대기·이의·로테이션 미입력·모집 중·룸 초대 |
| **매칭 리스트** `/match-rooms` | 전 회원 공개 방 목록 | **진행 중 / 내가 참여한 / 종료된** 3탭 |
| **매칭 룸** `/match-rooms/[roomId]` | 참여자 정보 + **게임 입력 공간** | 룸 안에서 게임 추가·결과 입력까지 완결 |

관통 원칙: **미확정은 확인 요청, 확정은 개인 결과, 입력은 룸 안에서.**
사이드바 메뉴도 생애 순서로 재배열한다: **매칭 리스트 → 경기 확인 요청 → 개인 경기 결과**.

### 설계를 지배하는 불변식

두 화면의 분할을 조건문이 아니라 **집합 분할**로 보장한다:

```
personal_matches(user_id = 나)
  ├── setScores.length > 0  → 개인 경기 결과   (100% 확정)
  └── setScores.length == 0 → 경기 확인 요청   (100% 미확정)
+ 아직 personal_matches 행이 없는 단계(pending 요청 · 룸 초대 · 미입력 로테이션 세션) → 허브 전용
```

술어는 이미 존재하는 `hasResult`(`lib/personal-matches/winner.ts:10`) — `explode.ts:19` 통계 초크포인트와 같은 규칙이다. 분할을 이 술어에 걸면 **새 상태가 추가돼도 자동으로 한쪽에만 들어간다.**

> **불변식의 적용 범위**: 위 분할은 *`personal_matches` 행*에 대한 것이다. **로테이션 세션과 방 게임의 입력 진입점은 허브와 룸 양쪽에 의도적으로 둔다** — 허브는 "내가 처리할 일 목록", 룸은 "그 자리에서 입력하는 도구"라는 서로 다른 역할이다(개인 결과 화면의 `+ 경기 추가`와 룸의 `+ 게임 추가`가 공존하는 것과 같다). 중복이 금지되는 것은 **같은 경기 카드가 두 목록에 뜨는 것**이다.

### 이 작업이 싼 이유

1. **입력 UI는 이미 전부 있고, 배치만 옮기는 일이다.** `MutualResultActions`(4상태 분기 완비)·`FreeMatchActions`·`MatchResultDialog`(mode `propose`/`review`)·`RotationSessionList`+`RotationGamesDialog`. 그리고 `MatchActions`/`MutualResultActions`의 props는 `{ match: PersonalMatch }` **단 하나**라 어느 화면으로든 그대로 이식된다.
2. **허브 쿼리는 신규 작성이 아니라 쪼개기다.** `fetchPersonalMatchesWithConfirmation`(`queries/personal-matches.ts:29`)이 이미 내 관점 행 + 협상 상태(`confirmation`)를 붙여 준다.
3. **쓰기 RPC 추가 0건.** 기존 `propose/confirm/dispute_match_result`·`updatePersonalMatchSetsAction`·`finalize_rotation_session`·`create_room_game` 재사용으로 9종 전 상태의 액션이 커버된다.
4. **`propose_match_result`가 호출자 관점 입력을 서버에서 정규화한다**(`0037_match_result_confirmation.sql:154-157` — 호출자가 opponent면 `invert_set_scores`). 룸에서 결과를 입력할 때 **반전 로직을 새로 쓸 필요가 없고, 뷰어 관점 팀 라벨만 만들어 주면 된다.**

---

## 실행 원칙

**어느 중간 단계에서도 "결과를 입력할 화면이 하나도 없는 상태"가 생기면 안 된다.** 미확정 액션 UI의 현재 유일한 서식지가 개인 경기 목록이므로, 목록을 먼저 축소하면 사용자가 결과를 입력할 곳이 사라진다. **추가 → 이전 → 제거** 순으로만 진행한다. Step 4 종료 시 두 화면에 일시적으로 중복 노출되는 것은 의도된 안전장치이며 Step 5에서 해소된다.

각 Step 종료 시: `npx tsc --noEmit` · `npm run lint` · `npm run build` · `npx vitest run`

---

## Step 0 — 순수 함수 + 캐시 무효화 보강 (UI 변화 0, 독립 가치)

**신규 `src/lib/match-rooms/revalidate.ts`** (server-only)
```ts
/** 방 목록 + 방 상세 무효화 — 방을 건드리는 모든 액션의 단일 출처 */
export function revalidateRoomPaths(roomId?: string | null): void
```
`match-rooms.ts:43-46`의 로컬 `revalidateRoom`을 이 헬퍼 호출로 대체하고, 아래 누락을 메운다.

| 액션 | 현재 | 수정 |
|---|---|---|
| `updateRoomPasswordAction` (`match-rooms.ts:83-92`) | revalidate 없음 | `revalidateRoomPaths(roomId)` — "방 상태를 바꾼 액션은 방 경로를 무효화한다"는 불변식을 코드로 지킨다 |
| **`updatePersonalMatchSetsAction`** (`personal-matches.ts:286-289`) | `/me/*`만 — **기존 버그** | `match`를 이미 읽고 있으므로(`:264`) `revalidateRoomPaths(match.roomId)` 추가. `is_settled` 트리거를 깨우면서 방 화면을 갱신하지 않던 결함 |
| **`deletePersonalMatchAction`** (`:242-245`) | `/me/*`만 — **기존 버그** | 삭제 **전에** `room_id`를 읽고, 삭제 후 `revalidateRoomPaths(roomId)`. cleanup 트리거가 방을 지우거나 정산을 재계산한다 |
| `propose/confirm/disputeMatchResultAction` (`match-results.ts:40-44` `revalidateResultPaths`) | `/match-rooms` 전무 | `revalidateResultPaths(roomId?)`로 확장. `roomId`는 `select('room_id').eq('id', requestId).maybeSingle()` 1회 조회 — **`match_requests.room_id`가 방 게임·로테이션 게임 모두에 채워진다**(`0049:374-380`, `0050:547-552`). 당사자 SELECT 정책으로 안전 |
| `updatePersonalMatchSetsAction` | `/me/match-requests` 누락 | 추가 (허브 이주 후 필수) |
| `rotation-sessions.ts:81,118` | 일부 누락 | 동일 보강 |

**신규 순수 함수 + 테스트**
- `src/lib/match-rooms/headcount.ts`에 추가 (`viewerStatusLabel:16` 옆, `headcount.test.ts`에 케이스):
  ```ts
  /** 방장·참가자 — '참가 인원'에 잡히는 실제 참여 */
  export function isViewerJoined(viewer?: ViewerLike): boolean
  /** '내가 참여한 경기' 탭 술어 — 초대 대기(invited)도 내 경기로 본다. declined 제외 */
  export function isViewerInvolved(viewer?: ViewerLike): boolean
  ```
  `invited`를 포함하는 근거: 초대는 방장이 기록에 내 이름을 넣은 상태라 이미 내 경기이고, `MatchRoomCard:33-37`이 `viewerStatusLabel`로 '초대됨' 칩을 붙여 구분해 준다. 엄격하게 갈 여지를 남기려 두 함수로 분리한다.
- **신규 `src/lib/match-rooms/game-labels.ts`** (+ 테스트) — Step 9에서 쓴다.
  ```ts
  /**
   * 방 게임 참가자 → 뷰어 관점 팀 라벨.
   *  - 뷰어 = 작성자: opponent/partner/opponent2 그대로
   *  - 뷰어 = 상대팀 회원: 내 팀 = 상대팀에서 나를 뺀 사람, 상대팀 = 작성자 + 작성자 파트너
   */
  export function buildRoomGameLabels(game: MatchRoomGame, viewerId: string): TeamLabelSource
  ```
  이 함수 하나로 `formatOpponents`·`formatTeams`·`buildAdLabels`(복식 애드 토글)가 올바른 관점으로 동작한다(`lib/personal-matches/labels.ts:8-13`).
- `src/lib/match-rooms/game-status.ts`로 `roomGamesEmptyMessage(detail)` 이전(현 `room-games-section.tsx:9-17`) + 테스트 — Step 9에서 그 컴포넌트의 props가 늘어나므로 100줄 규칙 대비 선분리.

**리스크**: 낮음. 이 단계만으로도 기존 캐시 결함 2건이 수정된다.

---

## Step 1 — 마이그레이션 0051: `personal_matches.has_result` 생성 컬럼

```sql
-- 0051_personal_match_has_result.sql
-- '결과 확정' 술어를 DB 1급 컬럼으로 승격. TS hasResult(winner.ts:10)와 미러 규칙
-- (validate_set_scores ↔ validateSetScores 선례). match_rooms.has_result는 0049에서
-- is_settled로 개명됐으므로 이름 충돌 없음.
alter table public.personal_matches
  add column has_result boolean
  generated always as (jsonb_array_length(set_scores) > 0) stored;

comment on column public.personal_matches.has_result is
  '결과 확정 여부(set_scores 비어 있지 않음). 개인 경기 결과 ↔ 확인 요청 큐 분할 술어(0051)';

create index personal_matches_pending_idx
  on public.personal_matches (user_id, played_at desc) where has_result = false;
create index personal_matches_settled_idx
  on public.personal_matches (user_id, played_at desc) where has_result = true;
```

**왜 필요한가**: 뱃지 카운트가 `(main)/layout.tsx`에서 **매 화면** 실행된다. 앱단 필터로는 전기간 개인 경기를 매번 끌어와야 해서 레이아웃 경로에 넣을 수 없다. 생성 컬럼 + 부분 인덱스면 미확정 큐가 소형 쿼리(보통 10건 미만)가 된다.
`generated always ... stored`이므로 **INSERT/UPDATE 경로 코드 변경 0**(RPC의 `set_scores` 갱신에도 자동 반영). 적용 후 `supabase gen types`로 `types/supabase.ts` 갱신.

**리스크**: 낮음.

---

## Step 2 — 순수 분류기 + 테스트 (화면 미연결)

**신설 `src/lib/match-requests/queue.ts`** (`lib/match-rooms/game-status.ts` 선례를 따른 순수 모듈)

```ts
export type MatchQueueBucket =
  | 'confirmResult' | 'enterResult' | 'fillLineup' | 'awaitingCounterpart'

/** 미확정 personal_matches 1행 → 버킷. hasResult(m) === false 전제. */
export function classifyPendingMatch(m: PersonalMatch): MatchQueueBucket

export type MatchQueueCounts = {
  participation: number   // 섹션 1
  confirmResult: number   // 섹션 2
  enterResult: number     // 섹션 3
  fillLineup: number      // 섹션 4
  waiting: number         // 섹션 5·6·7 (뱃지 제외)
}
export function myTurnTotal(c: MatchQueueCounts): number  // 1+2+3+4
```

판정 순서 (위→아래 우선):
1. `isRecruiting(m)`(`lineup.ts:46-50`) → `fillLineup`
2. `!m.sourceRequestId` (자유 기록) → `isLineupComplete(m) ? 'enterResult' : 'fillLineup'`
3. `!m.confirmation || !m.confirmation.viewerIsParty` → `awaitingCounterpart` (RLS 한계, Step 11)
4. `c.status === 'proposed'` → `c.proposedByMe ? 'awaitingCounterpart' : 'confirmResult'`
5. `c.status === 'none' | 'disputed'` → `enterResult`
6. `c.status === 'confirmed'` (세트 없음 = 불가능) → `awaitingCounterpart` (방어)

버킷 소비 `switch`에 `default: const _x: never = bucket`을 두어 **버킷 추가 시 UI 누락이 컴파일 에러로 잡히게** 한다.

**`queue.test.ts`**: 9종 상태 조합 전량을 단언. 지금 `redesign-fixtures/match-requests.ts`가 갖고 있는 상태 조합 지식을 **테스트로 이관**한다 — 픽스처를 버리기 전에 그 가치를 보존.

**리스크**: 없음.

---

## Step 3 — 쿼리 계층 (구 함수 미삭제, 화면 무변경)

### 두 매핑 경로는 통일하지 않고 **책임을 분리**한다

| 경로 | 담당 | 근거 |
|---|---|---|
| `mapPersonalMatchRow` (`lib/personal-matches/map.ts:13`) | **경기가 된 뒤** 미확정 전량 (섹션 2·3a-c·4·5·7) | 이 행들이 승격 대상 그 자체이고 `buildConfirmation`으로 4상태가 이미 붙는다 |
| `mapMatchRequestRow` (`queries/match-requests.ts:32`) | **아직 경기가 안 된 요청** (섹션 1·6·8) | `pending`/`rejected`/`canceled`는 `personal_matches` 행이 없다 |

단일 유니온으로 강제 정규화하면 필드 집합(`respondedAt`/`disputeReason` vs `groupSeq`/`roomId`)과 표시 컴포넌트(`RequestTeamLine` vs `PersonalMatchCard`)가 갈려 순이익이 없다. 대신 **경계를 `status='pending'`으로 명확히 그어** 두 경로가 절대 같은 경기를 표현하지 않게 한다. (현 픽스처가 `accepted` 건을 '받은 요청'에 담고 있는 것이 중복의 씨앗이다.)

### 신설 `src/lib/queries/match-queue.ts` (server-only)

```ts
export type MatchQueue = {
  // A축: personal_matches 행이 없는 단계
  receivedRequests: MatchRequestWithUser[]   // status='pending', opponent=나
  sentRequests:     MatchRequestWithUser[]   // status='pending', requester=나
  closedRequests:   MatchRequestWithUser[]   // rejected|canceled 양방향
  roomInvites:      MatchRoomInvite[]
  // B축: 경기가 된 뒤 결과 미확정
  pendingMatches:   { match: PersonalMatch; bucket: MatchQueueBucket }[]
  rotationSessions: RotationSession[]
  /** 내가 이미 게임을 넣은 방 세션 id — 뱃지 카운트 제외용 */
  enteredSessionIds: string[]
  counts: MatchQueueCounts
}

/** 허브·요약 배너·사이드바 뱃지의 단일 데이터 소스. React cache()로 요청 내 1회만 실행. */
export const fetchMatchQueue: (userId: string) => Promise<MatchQueue>
```

**⚠ `enteredSessionIds`가 필요한 이유**: 0050 이후 방 로테이션 세션은 finalize 후에도 남는다(종료는 방장의 `close_rotation_room`). 그대로 세면 세션 카드가 **영구히 `enterResult`로 잡혀 뱃지가 절대 안 내려간다.** 내가 이미 게임을 넣은 세션을 `.in()` 1회로 구해 **카운트에서만 제외**하고, 카드는 "추가 입력" 라벨로 계속 노출한다.

**쿼리 4~5회, 2웨이브**

| # | 대상 | 필터 | 웨이브 |
|---|---|---|---|
| 1 | `personal_matches` + participants | `user_id=나` ∧ **`has_result=false`** (0051) | 1 |
| 2 | `match_requests` + `negotiation` | `.in('id', sourceRequestIds)` — 0건이면 생략 | 2 |
| 3 | `match_requests` + 양쪽 `users` + `REQUEST_JOINS` | `.or('requester_id.eq.X,opponent_user_id.eq.X')` — pending/closed 한 번에 | 1 |
| 4 | `match_room_members` + room·host | `user_id=나` ∧ `status.in(('invited','joined'))` — **초대 + 로테이션용 roomIds 동시 획득** | 1 |
| 5 | `rotation_sessions` | `.or('user_id.eq.X,room_id.in.(...)')` — 현 2쿼리를 1로 | 2 |

N+1 회피 3지점: ① `sourceRequestId` → `.in()` 1회(기존 `:31-38` 패턴) ② 룸 초대 조회와 로테이션용 `joined` 방 목록을 한 쿼리로 병합(현재 `fetchPendingRoomInvites` + `fetchPendingRotationSessions` 내부가 중복 조회) ③ 방 참가자 후보는 배치 함수 1회.

정렬은 기존 규칙 승계: `pendingMatches`는 `played_at desc, played_time desc, group_seq asc`(`personal-matches.ts:16-19` — `match-groups.ts:29-37` `compareMatches`와 동일 규칙이라 목록↔허브 순서가 일관), 요청류는 `created_at desc`, 로테이션은 `played_at desc, created_at desc`.

### `src/lib/queries/personal-matches.ts` 재편

```ts
/** 확정 경기만 — 개인 경기 결과 본문. confirmation 불필요('상호 확인' 잠금 배지만) */
export async function fetchSettledPersonalMatches(userId: string): Promise<PersonalMatch[]>
/** 미확정 경기만 — 허브. confirmation 부착 필수 */
export async function fetchPendingPersonalMatches(userId: string): Promise<PersonalMatch[]>
/** 기존 :35-57 로직 추출 — 위 2함수 + 룸 상세(Step 9)가 공용 */
export async function attachConfirmations(matches: PersonalMatch[], userId: string): Promise<PersonalMatch[]>
```

- **`fetchPersonalMatchesByUser`(`:10-22`)는 절대 손대지 않는다** — 통계·레이팅·AI 코칭 공용(`queries/analytics.ts:49`, `actions/ai-coaching.ts:92`, `actions/personal-matches.ts:87`).
- `fetchPersonalMatchesWithConfirmation`(`:29-58`)은 호출부 1곳뿐이므로 위 함수들로 대체 후 삭제(Step 6).

### 기타 쿼리·타입

- `queries/match-requests.ts`: `fetchMyMatchRequests(userId)` 추가(당사자 요청 전량 1회 조회, 양쪽 users 임베드 후 viewer 기준 counterpart 선택). `mapMatchRequestRow`에 `roomId: row.room_id ?? undefined` 추가 — **컬럼은 있는데 매핑이 없다**(`:32-66`).
- `queries/match-rooms.ts`: `fetchRoomParticipantCandidatesByRooms(roomIds, excludeUserId)` 추가 — 현 `personal-matches/page.tsx:31-33`의 N+1 제거. 단건(`:112`)은 룸 게임 폼·로테이션 빌더가 쓰므로 유지.
- `types/index.ts`: `MatchRequest.roomId?: string`, `PersonalMatchConfirmation.viewerIsParty: boolean` 추가. `attachConfirmations`의 select에 `opponent_user_id`를 넣어 `buildConfirmation`(`confirmation.ts:18`)이 `requester_id === viewerId || opponent_user_id === viewerId`로 계산.
- `mapPersonalMatchRow`에 `isPerspective: row.is_perspective` 매핑 추가(0050 컬럼이 앱에서 처음 읽힌다).
  **⚠ `is_perspective`는 파트너뿐 아니라 수락자(대표) 행도 true다**(`0050:43-48` 백필). 대표는 당사자이므로 이 필드를 "액션 불가"의 술어로 쓰면 안 된다 — 판정은 반드시 `viewerIsParty`로.

**리스크**: 중. `.or('user_id.eq.X,room_id.in.(...)')` 문법과 `.in()` 빈 배열 처리(0건이면 쿼리 스킵)를 확인해야 한다. `has_result` 필터가 미확정 로테이션 관점 행까지 정확히 잡는지 실데이터 검증.

---

## Step 4 — 허브 실 연동 + 확장 (픽스처 제거)

### 탭 1 「내 차례」 (기본, 뱃지 대상)

| # | 섹션 | 상태 조합 | 액션 (전부 기존 컴포넌트) |
|---|---|---|---|
| 1 | **경기 참여 확인** | `status='pending'` ∧ `opponent=나` **+** 룸 초대 `invited` | `ReceivedRequestCard` 수락/거절 · `RoomInviteCard` 수락/거절 (**props 불변**) |
| 2 | **결과 확인 대기** | `accepted` ∧ `proposed` ∧ 제안자≠나 | `PersonalMatchCard` + `MutualResultActions` review(`:51,71-84`) → `confirm/disputeMatchResultAction` |
| 3 | **결과 입력 대기** | (a) `accepted` ∧ `none` — **방 게임 전량 포함** (b) `disputed` (c) 자유 기록 `!hasResult` ∧ 라인업 완성 (d) 미입력 로테이션 세션 | (a)(b) `MutualResultActions` propose(`:85-104`) (c) `FreeMatchActions`(`match-actions.tsx:43-61`) → `updatePersonalMatchSetsAction` (d) `RotationSessionCard` → `RotationGamesDialog` → `finalizeRotationSessionAction` |
| 4 | **참가자 채우기** | `isRecruiting(m)` | 작성자면 `/me/personal-matches/[id]/edit` + `RoomLink`, 아니면 안내 문구(현 `match-actions.tsx:40-42` 승계) |

### 탭 2 「상대 대기」 (`?tab=waiting`, 뱃지 제외)

| # | 섹션 | 상태 조합 | 액션 |
|---|---|---|---|
| 5 | **내 제안 확인 대기** | `proposed` ∧ 제안자=나 | `MutualResultActions` editingOwn(`:52,56`) → [제안 수정] |
| 6 | **상대 수락 대기** | `status='pending'` ∧ `requester=나` | `SentRequestCard` [취소] (**props 불변**) |
| 7 | **대표 확인 대기** | `sourceRequestId` 있음 ∧ `!viewerIsParty` (복식 파트너·상대2 관점 행) | 읽기 전용 배지. Step 11(0052) 이후 `bystanderWaitingBadge`가 결과 입력 대기/대표 확인 대기/이의 제기됨을 구분해 표시 |
| 8 | **종료된 요청** (`<details>` 접힘) | `rejected`/`canceled` 양방향 | 없음 (이력) |

**승격 규칙**: `confirm_match_result` 성공 → `set_scores` 채워짐 → `hasResult` true → 허브에서 사라지고 개인 결과에 나타난다. **별도 코드 없이 불변식이 처리한다.**

**빈 상태**: 탭1 전 섹션 0건이면 "확인할 경기가 없습니다. 확정된 경기는 [개인 경기 결과]에서 볼 수 있습니다." — 역방향 링크로 두 화면을 짝짓는다.

### 컴포넌트 — props 계약 변경은 사실상 0

**허브에서도 `PersonalMatchCard`를 그대로 재사용한다.** 이미 미확정/모집 중 배지(`:25-27,39-45`)·`MatchDateColumn`·`MatchMetaLine`·`RoomLink`(`:68-73`)·`actions` 슬롯(`:90`)을 갖췄다. 새 카드를 만들지 않는다.

| 컴포넌트 | 이주 | props 변경 |
|---|---|---|
| `MutualResultActions` | 파일 이동 없음, 허브가 **유일한 호출부**가 됨 | 없음 |
| `MatchResultDialog` + `useResultDialog` | 이동·수정 없음 | 없음 |
| `RotationSessionList`/`Card`/`RotationGamesDialog` | `personal-matches/page.tsx:54-59` → 허브 탭1 섹션 3으로 **호출부만 이동** | 없음 |
| `ReceivedRequestCard`/`SentRequestCard`/`RoomInviteCard` | 실 데이터로 전환 | 없음 |

**신설** (`src/components/match-requests/`): `queue-section.tsx`(~30줄, 0건이면 `null`) · `pending-match-actions.tsx`(~60줄, 버킷→액션 디스패처) · `my-turn-panel.tsx`(~90줄) · `waiting-panel.tsx`(~80줄). 페이지는 조회 + 패널 분기만 남겨 ~60줄 → 100줄 규칙 준수. 탭 바는 Step 7의 `LinkTabs`를 쓰거나, Step 7보다 먼저 필요하면 여기서 `LinkTabs`를 먼저 만든다.

**삭제**: `components/match-requests/result-confirm-card.tsx` — 섹션 2가 `PersonalMatchCard` + `MutualResultActions` review로 같은 일을 하고, `:24-26`의 자체 반전 로직이 `buildConfirmation`과 **중복된 두 번째 반전 경로**다. 삭제하면 관점 반전 코드 경로가 1개로 줄어든다. `src/lib/redesign-fixtures/match-requests.ts`도 삭제(`_scenario.ts` 참조 확인 후).

**리스크**: 높음 — 첫 실 데이터 노출. 관점 반전(요청자/대표/파트너 3관점)·복식 애드 표기·`viewerId` 전달이 실제로 맞는지 수동 검수. 특히 방 게임이 섹션 3a에 들어오는지, 로테이션 관점 복사본이 섹션 7로 가는지.

---

## Step 5 — 개인 경기 결과 축소 + 요약 배너

이 시점에 **중복 노출 0**이 성립한다.

**`src/app/(main)/me/personal-matches/page.tsx`**
- `fetchSettledPersonalMatches` + `queue.counts`로 전환.
- `RotationSessionList`·`roomParticipants` 블록(`:29-36,53-59`) **제거** → 페이지가 크게 단순해진다.
- 빈 상태 분기(`:61-75`)가 `sessions` 의존을 잃으므로 재작성 — "확정 0건 + 미확정 N건"일 때는 "첫 경기를 기록해보세요"가 아니라 **배너로 유도**해야 한다.

**신설 `src/components/match-requests/queue-summary-banner.tsx`** (~35줄)
```
┌──────────────────────────────────────────────────────────┐
│ ⏳ 결과 입력 대기 3건 · 확인 대기 1건      확인 요청 가기 → │
└──────────────────────────────────────────────────────────┘
```
- props `{ counts: MatchQueueCounts }`, 서버 컴포넌트, 상태 없음. `PageHeader` 바로 아래.
- 매핑: 입력 대기 `= enterResult + fillLineup` / 확인 대기 `= confirmResult + participation`
- 스타일: `CARD_BASE` + `PENDING_RESULT_BAR`/`text-spot`(`lib/dashboard/outcome.ts` 재사용, `--spot` = 주의·대기 시맨틱). 하드코딩 색 금지.
- **`myTurnTotal(counts) === 0`이면 렌더하지 않는다** — 상시 노출되어 잡음이 되지 않게.

**`match-actions.tsx` 축소** (20줄대로)
```ts
export function MatchActions({ match }: { match: PersonalMatch }) {
    if (match.sourceRequestId) return <MutualLockedBadge />   // 현 mutual-result-actions.tsx:43-49 이관
    return <FreeMatchEditActions match={match} />             // 수정/삭제 (현 :62-67)
}
```
제거되는 분기 `:40-42`·`:43-61`은 허브 섹션 4·3c로 이동.

### `MatchGroupList` 공용 경로를 깨지 않는 필터 위치

`MatchGroupList`(`match-group-list.tsx:17`) → `buildMatchGroups` → `groupByMonth`는 **전부 무수정**. 필터는 데이터 진입점 두 곳에만 둔다:

| 진입점 | 필터 위치 | 이유 |
|---|---|---|
| 개인 경기 결과 → `PersonalMatchList` | **쿼리 레벨** `.eq('has_result', true)` | 전기간 행을 끌어오지 않음 |
| 프로필 미리보기 `stats/personal-matches-preview.tsx:12` | **컴포넌트 1줄** `groupByMonth(personalMatches.filter(hasResult))` | `bundle.personalMatches`는 통계 원본 — `fetchAnalyticsBundle`에 손대면 위험 |
| `personal-match-month-browser.tsx:64` | **무수정** | 상위에서 이미 걸러짐 |

**부수 이득**: 미확정 행이 `buildMatchGroups`에 도달하지 않으므로 `match-groups.ts:77`의 `gameCount += Math.max(1, m.setScores.length)` 과대계상이 **자연 소멸**한다. `match-groups.ts`는 손대지 않는다.

### ⚠ 함께 고쳐야 할 것 1 — 저장 후 리다이렉트 목적지

`use-personal-match-submit.ts`의 4갈래는 **전부 미확정 기록을 만든다**(폼이 세트를 받지 않는다, `:17` 주석). 현재 목적지로 보내면 사용자는 **방금 저장한 기록이 없는 화면**에 도착한다.

| 갈래 | 현재 | 변경 후 |
|---|---|---|
| ① 로테이션 세션 | `:48` `/me/personal-matches` | `/me/match-requests` |
| ③ 상호 확인 요청 | `:106` `/me/match-requests?tab=sent` | 새 탭 키 `?tab=waiting` |
| ④ 자유 기록 신규 | `:117` `/me/personal-matches` | `/me/match-requests` (항상 미확정) |
| ④ 자유 기록 수정 | `:117` 동일 | 결과 유무로 분기, 또는 `router.back()` |

방 게임(②, `:75`)과 방 컨텍스트(`:117`의 `s.roomId` 분기)는 이미 `/match-rooms/{id}`로 가므로 정상.

### ⚠ 함께 고쳐야 할 것 2 — 룸 상세의 목적지 소실 (임시 조치)

`room-games-section.tsx:35`와 `room-game-row.tsx:46`이 `/me/personal-matches`로 결과 입력을 떠넘긴다. 이 단계에서 그 목적지가 사라지므로 **두 링크를 `/me/match-requests`로 임시 재지정**한다. Step 9에서 룸 내 다이얼로그로 대체되며 링크 자체가 사라진다.

**리스크**: 중.

---

## Step 6 — 뱃지 단일화 + 죽은 코드 제거

현재 어긋남의 원인은 소스가 **셋**이다: 사이드바는 SQL count 3개 합산(`queries/match-requests.ts:151-169`), 페이지 탭은 픽스처 길이(`page.tsx:37`), 섹션 렌더는 또 다른 배열.

```
fetchMatchQueue(userId)                      ← React cache()로 감싼 유일한 소스
  ├── (main)/layout.tsx:17-18   → myTurnTotal(queue.counts) → Sidebar/Header/MobileNav
  ├── me/match-requests/page.tsx → queue 전체 (탭 뱃지 = 같은 counts)
  └── me/personal-matches/page.tsx → queue.counts (배너)
```

- `fetchPendingReceivedCount` 삭제 → 임의 SQL 합산식이 사라지고 뱃지 정의가 `myTurnTotal` 순수 함수 1개로 수렴.
- `Sidebar`/`MobileNav`/`Header` prop 이름만 `pendingRequestCount` → `myTurnCount`. 판정식(`sidebar.tsx:98`, `mobile-nav.tsx:89`)은 그대로.
- **`cache()` 첫 도입**(레포에 사용례 없음). `layout.tsx`와 `page.tsx`는 같은 요청 안에서 렌더되므로 중복 호출이 제거된다. 안 되면 레이아웃에만 경량 counts 경로를 두되 **`classifyPendingMatch`를 공유**하는 형태로 폴백.
- `fetchMatchQueue`에 **넣지 않는 것**: `fetchOpponentCandidates`·`fetchPastOpponents`·배치 참가자 후보(로테이션 빌더 picker). 허브 페이지에서만 별도 조회 — 레이아웃 경로에 무거운 후보 조회가 섞이지 않게.
- 구 함수 삭제: `fetchReceivedMatchRequests`·`fetchSentMatchRequests`·`fetchPendingResultConfirmations`·`fetchPersonalMatchesWithConfirmation`. (`fetchPendingResultConfirmations`의 `.eq('result_status','proposed')` + `.neq('proposed_by')` 필터는 `classifyPendingMatch` 4번으로 이관 — SQL 필터가 순수 함수가 되어 테스트 가능해진다.)

**리스크**: 중.

---

## Step 7 — 매칭 리스트 3탭

세 탭은 **상호배타가 아니다**(내가 참여한 진행 중 방은 1·2탭에 모두 나온다). `todayIso = todayIsoKst()`, `isPast(r) = r.isSettled || r.playedAt < todayIso` (기존 `split.ts:18` 규칙 그대로).

| 탭 | key | 술어 | 정렬 |
|---|---|---|---|
| 진행 중인 경기 | `open` (기본, 파라미터 없음) | `!isPast(r)` — 전 회원 공개, 내 참여 무관 | 가까운 순 asc |
| 내가 참여한 경기 | `mine` | `isViewerInvolved(r.viewer)` — 진행·종료 **모두** | 진행 중 asc → 종료 desc (**두 서브섹션**) |
| 종료된 경기 | `past` | `isPast(r)` | 최근순 desc |

**'내가 참여한'에 종료된 방도 포함하는 근거**: (a) 이 탭은 "내 경기함" 역할이라 지난 경기 결과·정산 확인이 주 용도, (b) 종료 방을 빼면 룸 안 결과 입력으로 가는 경로가 전체 종료 목록뿐이 되어 자기 경기를 찾기 어렵다, (c) `mine`은 원래 1·3탭과 교차하는 "관점 필터"라 배타성을 요구하지 않는다.

- **`splitRooms`는 무변경**. "예정/지난 2분할 + 정렬"이라는 단일 책임을 `split.test.ts`가 고정해 놨고, `mine`은 직교하는 참여 필터라 같은 함수에 넣으면 `viewer`를 아는 타입 제약이 생겨 순수성이 나빠진다. 참여 판정은 Step 0에서 만든 `isViewerInvolved`가 담당한다.
- **신규 `src/lib/match-rooms/tabs.ts`** (+ 테스트) — `resolveRoomListTab(raw?: string): RoomListTab` + 탭 메타 상수. 레거시 `?tab=upcoming`과 미지의 값은 `open`으로 폴백하고, **`?tab=past`는 값을 그대로 유지**해 외부 링크·뒤로가기 호환.
- **쿼리는 그대로 둔다**(1단계): `fetchMatchRooms(viewerId)` 시그니처 무변경 + JS 필터. 근거 — `mapRoomRow:51,65`가 이미 `viewer`를 계산하므로 서버 재필터는 중복 판정이고, inner join + eq는 임베드 `members`까지 잘라 `joinedCount`를 1로 깨뜨리며, **세 탭 카운트를 동시에** 계산해야 하므로 어차피 전체 집합이 필요하다.
- **`limit(200)`의 실제 성질**: `.order('played_at', {ascending:false}).limit(200)`(`:75-76`)은 최신 날짜 200건을 남기므로 **미래 경기는 안전하고 오래된 종료 방부터 잘린다** → '진행 중' 탭 정확도에는 영향이 없다. 이 사실을 주석으로 못 박고, `ROOM_LIST_LIMIT` 상수화 + `data.length === ROOM_LIST_LIMIT`일 때 하단에 "최근 200건만 표시합니다" 캡션(진실을 숨기지 않기). 탭별 서버 필터·커서 페이지네이션은 Step 12(후속).
- **신규 `src/components/common/link-tabs.tsx`** — `match-rooms/page.tsx:28-32`와 `me/match-requests/page.tsx:39-45`의 동일 `tabClass`를 흡수. 서버 컴포넌트.
  ```ts
  export type LinkTabItem = { key: string; label: string; href: string; count?: number; emphasis?: boolean }
  export function LinkTabs({ items, activeKey, ariaLabel }: Props)
  ```
  클래스 문자열은 현행 그대로 이관 + `aria-current="page"` 추가. `emphasis`가 허브의 spot `Badge`(`match-requests/page.tsx:59-63`) 동작을 보존한다.
- **`src/app/(main)/match-rooms/page.tsx`**: `:14` searchParams, `:23-26` 탭 선택, `:46-52` 탭 바 → `LinkTabs`, `:54-64` 빈 상태를 탭별로 재작성. 100줄을 넘으면 `components/match-rooms/room-list-section.tsx`(빈 상태 + 카드 리스트)로 분리.
- 카운트 배지는 **행동이 필요한 탭에만**(`open`·`mine`). `past`는 200건 상한 때문에 숫자가 진실이 아니므로 붙이지 않는다.
- 빈 상태 문구: open `진행 중인 경기가 없습니다.` + `경기를 등록하고 매칭 리스트에 노출해보세요` / mine `참여한 경기가 없습니다.` + `진행 중인 경기에 입장해보세요` / past `종료된 경기가 없습니다.`

**검증**: `/match-rooms`, `?tab=mine`, `?tab=past`, `?tab=garbage`(→open), `?tab=upcoming`(→open).
**리스크**: 낮음.

---

## Step 8 — 매칭 룸: 룸 안 게임 추가 다이얼로그

### 서버 컴포넌트에서 컨텍스트를 미리 계산해 props로 내린다

`buildRoomGameContext`(`room-context.ts:39-56`)의 입력은 `detail`(상세 페이지가 이미 가진 값) + `fetchRoomParticipantCandidates` + `viewerId`뿐이라 **RPC 재호출 없이** 만들 수 있다. 자동완성의 '전체 회원' 그룹은 `PlayerPicker`가 `useUserSearch`로 클라이언트 디바운스 검색하므로(`player-picker.tsx:51-52`) 무거운 프리로드는 애초에 없다.

**`src/app/(main)/match-rooms/[roomId]/page.tsx`**
```ts
const detail = await fetchMatchRoomDetail(roomId)          // :29 그대로
const canAdd = canViewerAddRoomGame(detail, user.id)
const [participants, opponentCandidates, pastOpponents] = canAdd
    ? await Promise.all([...])
    : [[], [], []]
const gameCtx = canAdd ? buildRoomGameContext(detail, participants, user.id) : undefined
```
`fetchRoomParticipantCandidates`는 로테이션 빌더(Step 9)와 **공유**하므로 방 참가자 조회는 1회로 끝난다. 비멤버 경로(`:31-43`)는 무변경.

**신규 `src/components/match-rooms/room-game-dialog.tsx`** (client, ~50줄)
```ts
type Props = {
    ctx: RoomGameContext
    opponentCandidates: OpponentCandidate[]
    pastOpponents: PastOpponent[]
    selfUserId: string
    /** '참가자 채우기'로 열 때 — 모집 중인 내 seed 기록 (replaceMatchId 경로) */
    initialData?: PersonalMatch
    triggerLabel?: string        // 기본 '+ 게임 추가'
}
```
`Dialog`/`DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto"` (`rotation-games-dialog.tsx:32`와 동일 규격) → `PersonalMatchForm`. 성공 콜백 `() => { setOpen(false); router.refresh() }`.

### `PersonalMatchForm` 재사용 — 최소 변경 3곳

폼은 이미 룸 게임 모드에서 거의 다이얼로그 크기다: `WhoColumn`이 '경기 타입' 카드를 숨기고 참가자 카드만(`who-column.tsx:33-41`), `WhenColumn`은 메타 입력란 전체를 `RoomMetaSummaryCard`로 대체(`when-column.tsx:20`).

**(a) 레이아웃 variant** — `personal-match-form.tsx`에 `variant?: 'page' | 'dialog'`(기본 `page`). `dialog`는 `space-y-4` 단일 열(그리드·max-w 미적용). `WhenColumn`에도 전달해 다이얼로그에서는 `RoomMetaSummaryCard`를 **렌더하지 않는다**(`RoomDetailHeader`가 이미 일시·코트·표면을 보여줘 중복):
`if (s.roomContext) return variant === 'dialog' ? null : <RoomMetaSummaryCard ctx={s.roomContext} step="02" />`

**(b) 성공/취소 내비게이션 주입** — `use-personal-match-submit.ts`
```ts
export type SubmitNavigation = { onDone?: () => void; onCancel?: () => void }
export function usePersonalMatchSubmit(s, initialId?, nav?: SubmitNavigation)
```
`run()`(`:25-31`)만 수정: `if (nav?.onDone) nav.onDone(); else router.push(next)`. **4갈래 분기(`:41`/`:54`/`:85`/`:110`)와 `next` 인자는 손대지 않는다** — 페이지 경로가 계속 동작한다. `cancel: nav?.onCancel ?? (() => router.back())` — 다이얼로그에서 취소가 `router.back()`으로 룸을 떠나는 사고 방지.

**(c) ⚠ 룸 게임 메타 검증 완화 — 잠복 결함 수정** — `use-personal-match-form-state.ts:135`
```ts
// 방 게임은 메타를 화면에서 바꿀 수 없다 — 표면·시각이 빈 방에서 저장이 영구 차단되지 않도록 날짜만 요구
const metaOk = isRoomGame ? !!playedAt : (!!playedAt && !!playedTime && !!surface)
```
현재 `metaOk = !!playedAt && !!playedTime && !!surface`인데 `MatchRoomMeta.playedTime`·`surface`는 optional이다. 표면/시각이 빈 방에서는 `isValid`가 영구 false가 되고 `WhenColumn`이 입력란을 요약 카드로 대체해 놨으므로 **사용자가 고칠 방법이 없다**(현 `?room=` 페이지에도 있는 결함). 회원 상대 경로는 `create_room_game`이 `coalesce(played_time,'00:00')`·`coalesce(surface,'other')`로 방어하고, 비회원 상대(방장 자유 기록) 경로는 `validatePersonalMatchInput`(`validate-input.ts:86`)이 서버에서 거부해 `FormFooter` 에러로 노출된다.

### `/me/personal-matches/new?room=` 처리 — 파일 유지, 룸 분기만 redirect

```ts
const { room } = await searchParams
if (room) redirect(`/match-rooms/${room}`)     // 게임 입력은 룸 안 다이얼로그로
```
`loadRoomContext`(`:20-25`)·`roomContext` prop·조건부 제목(`:44-45`) 삭제 → 페이지가 순수 개인 경기 등록으로 단순화되고 `metadata.title`(`:12`) 불일치도 해소. 라우트를 **삭제하지 않는 이유**: 기존 북마크·뒤로가기·외부 링크가 404가 되지 않고 룸으로 착지한다.

**`room-games-section.tsx`**: `:38-42` `+ 게임 추가` Link → `<RoomGameDialog>`. props가 늘어나므로 `RoomGamesSectionProps` 타입으로 묶고, `emptyMessage`(`:9-17`)는 Step 0에서 이미 `game-status.ts`로 옮겼다.

**회귀 확인**: `/me/personal-matches/new`(4갈래 전부), `/me/personal-matches/[id]/edit`(seedFill → `createRoomGameAction` + push), 로테이션 등록.
**리스크**: 중.

---

## Step 9 — 매칭 룸: 룸 안 결과 입력·확인 + 로테이션 빌더

### 9-1. 데이터 보강 — 마이그레이션 없이 2차 조회

**확인된 사실**: `MatchRoomGame`(`parse-detail.ts:55-72`)은 `setScores`·`participants`·`ownerUserId`·`sourceRequestId`·`resultStatus`까지만 갖는다. `MatchResultDialog` mode `review`가 필요한 **`proposedSetScores`·`proposedBy`·`disputeReason`이 없다.**

**신규 `src/lib/queries/match-rooms.ts` 함수**
```ts
/**
 * 방 게임의 결과 협상 상태 — 내가 당사자(요청자 또는 상대 대표)인 게임만 RLS가 남긴다.
 * 행의 존재 자체가 '결과 입력·확인 자격'이다. proposedSets는 viewer 관점으로 반전된다.
 * (fetchPersonalMatchesWithConfirmation과 동일 패턴 — buildConfirmation 재사용)
 */
export async function fetchRoomGameConfirmations(
    requestIds: string[], viewerId: string,
): Promise<Record<string, PersonalMatchConfirmation>>   // key = sourceRequestId
```
`buildConfirmation`(`confirmation.ts:18`)으로 매핑해 관점 반전·`proposedByMe` 계산을 검증된 코드로 재사용한다. 호출은 `detail.games.map(g => g.sourceRequestId).filter(Boolean)`이 비어 있지 않을 때만.

**RPC 확장(`get_match_room_detail`에 3필드 추가)은 채택하지 않는다**: SECURITY DEFINER라 "누가 볼 수 있나"를 SQL에서 새로 게이팅해야 하고(파트너·상대2에게 새면 안 됨), 관점 반전까지 SQL에 중복 구현해야 한다. RLS가 그 판정을 이미 정확히 하므로 2차 조회가 비용 대비 안전하다.

**⚠ 자격 판정은 협상 행의 존재로 한다, `isRoomGameParty`로 하지 않는다.** `resolveRotationRep`이 대표를 `opponent`→`opponent2` 순으로 고르므로 `participants`의 role `opponent`가 곧 `match_requests.opponent_user_id`라고 가정할 수 없다(로테이션 파생 게임). `isRoomGameParty`(`game-status.ts:25`)는 **'대표 확인 대기' 배지 표시용**으로만 쓴다.

### 9-2. `RoomGameActions` — 신규 client 컴포넌트

`RoomGameRow`(현재 53줄)를 100줄 안에 유지하려 액션부를 분리한다. **분기 규칙은 기존 `MutualResultActions`/`FreeMatchActions`를 그대로 이식하고 새 규칙을 만들지 않는다.**

**신규 `src/components/match-rooms/room-game-actions.tsx`** (client, ~80줄) — props `{ game, viewerId, confirmation? }`

| 게임 상태 | 자격 | UI | 액션 |
|---|---|---|---|
| `setScores.length > 0` | — | 스코어만 (`roomGameStatusLabel`이 이미 null, `game-status.ts:9`) | — |
| `direct` + 작성자 + 라인업 미완 | 작성자 | `참가자 채우기` | `/me/personal-matches/[id]/edit`(1단계) / 2차에 `RoomGameDialog initialData`로 전환 |
| `direct` + 작성자 + 라인업 완성 | 작성자 | `[결과 입력]` → `mode="propose"` | `updatePersonalMatchSetsAction` (즉시 확정) |
| `confirmation.status` `none`\|`disputed` | 당사자 | `[결과 입력]`(disputed면 사유 표시) | `proposeMatchResultAction` |
| `proposed` + `proposedByMe` | 제안자 | `상대 확인 대기` 배지 + `[제안 수정]` | `proposeMatchResultAction` |
| `proposed` + `!proposedByMe` | 확인자 | `[결과 확인]` → `mode="review"` | `confirm`/`disputeMatchResultAction` |
| `!viewerIsParty` + `isRoomGameParty` | 파트너·상대2 | `bystanderWaitingBadge` 배지(title 툴팁) | 없음 (`MutualResultActions`와 동문구) |

팀 라벨은 Step 0의 `buildRoomGameLabels(game, viewerId)`가 공급한다. 다이얼로그 상태는 `useResultDialog` 재사용, 화면 갱신은 Step 0에서 보강한 `revalidateRoomPaths`가 처리한다.

**`room-game-row.tsx:40-50`**의 링크 블록을 `<RoomGameActions />` 한 줄로 교체 → **`/me/personal-matches` 링크(`:45`) 소멸**(Step 5의 임시 재지정도 함께 제거).

### 9-3. 미확정 로테이션 방 — 룸 안 게임 빌더

RLS가 이미 열려 있다(`rotation_sessions_select`: `room_id is not null and is_room_participant(room_id)`, `0050:749-754`).

**신규 `src/lib/queries/rotation-sessions.ts` 함수**
```ts
/** 방의 미확정 로테이션 세션 1건 — RLS가 방 참가자에게만 허용(0050). finalize 후에도 남고 close_rotation_room이 지운다 */
export async function fetchRoomRotationSession(roomId: string): Promise<RotationSession | null>
```
`mapRotationSessionRow`(`:13`) 재사용. (`get_match_room_detail`은 로테이션 출처에 `sessionId`·`ownerUserId`를 이미 내려주지만 `parse-detail.ts:95-100`의 `toSource`가 버린다. 세션 행이 `players`·`userId`·`createdAt`까지 담은 단일 출처이므로 파서를 넓히지 않고 세션을 직접 읽어 이중 출처를 만들지 않는다.)

**신규 `src/components/match-rooms/room-rotation-builder.tsx`** (client, ~40줄) — props `{ session, pool, picker }`
`useResultDialog` + `Button` `게임 입력` → `RotationGamesDialog`(**무변경**) → `finalizeRotationSessionAction`. 풀은 `buildBuilderPool`(`rotation-pool.ts:42`)이 "세션 풀 ∪ 방 참가자 − 나"를 계산하고, 방 참가자는 Step 8에서 이미 조회한 `participants`를 재사용한다(`OpponentCandidate`가 `RoomParticipant`에 구조적으로 대입됨 — `rotation-pool.ts:14-21` 주석). `finalizeRotationSessionAction`은 이미 `/match-rooms`·`/match-rooms/{id}`를 revalidate한다(`rotation-sessions.ts:184-187`). 방장의 `게임 입력 종료`(`room-host-actions.tsx:60-62`)는 그대로 세션 종료를 담당.

`room-games-section.tsx:33-37`의 `결과 입력` Link → `<RoomRotationBuilder>`. 빈 상태 문구(`game-status.ts`로 이전된 `roomGamesEmptyMessage`)를 룸 안 동작 안내로 재작성.

**검증**: 자유 기록 방(작성자 즉시 확정) / 방 게임 단식(제안→상대 확인) / 방 게임 복식(애드 토글 + 대표 확인, 파트너에게는 배지) / 이의→재제안 / 미확정 로테이션 방에서 참가자 2명이 각자 입력 → `group_seq` 이어붙기 → 방장 종료 후 `+ 게임 추가` 전환.
**리스크**: 중~높음. 룸 상세는 RPC jsonb 파서를 거치므로 계약이 어긋나면 조용히 버려진다(`parse-detail.ts:10` 주석).

---

## Step 10 — 라벨 전수 교체 (커밋 2개로 분리)

URL·라우트·`revalidatePath`·파일명·컴포넌트명·타입명·식별자는 **전부 불변**.

| 대상 | 변경 |
|---|---|
| 경기 리스트 | → **매칭 리스트** |
| 경기 방 / 경기 상세 | → **매칭 룸** |
| 개인 경기 기록 | → **개인 경기 결과** |
| 리스트에 노출 / 리스트에서 내리기 | → **매칭 리스트에 노출 / 매칭 리스트에서 내리기** |
| **`방장`** | **유지 — 절대 치환 금지** |
| 방 참가자 / 참가자 | 유지(가장 정확한 어휘). 화면명이 들어가는 문장에서 `방`만 `매칭 룸`으로 |

> **⚠ `'방장'`은 UI 라벨이 아니라 판정 키다.** `members-view.ts:19`의 `ORDER`(명단 정렬), `room-member-row.tsx:9`의 `STATUS_CLASS`(상태 칩 색), `headcount.ts:18`의 `viewerStatusLabel`이 이 **문자열 자체를 키로 쓴다**. 일괄 치환하면 정렬과 색이 조용히 깨진다. 도메인 어휘로도 이미 정착돼 있다. (`members-view.test.ts`·`headcount.test.ts`가 회귀 가드로 존재한다.)

**10a — 사용자 가시 문자열**
- `src/lib/nav-items.ts:31-35` — `:32` 라벨 교체 + **배열 순서를 매칭 리스트 → 경기 확인 요청 → 개인 경기 결과로 재배열**. `'매칭 리스트'`(`:33`)는 이미 반영됨. `sidebar.tsx`의 `myNavActive`(`:31-36`)는 href prefix 기반이라 순서 무관 — **수정 불필요**(주석 `:29`만 갱신).
- 룸 화면: `[roomId]/page.tsx:15`(`'경기 상세'`) · `match-rooms/page.tsx:38,41`(Step 7에서 3탭 문구로 전면 교체) · `room-link.tsx:9`(`경기 리스트에서 보기` → `매칭 룸 보기` — 링크 목적지가 룸 상세라 이쪽이 정확) · `room-host-actions.tsx:38,65` · **`room-password-gate.tsx:32,34`** (`방장이 참가자로 게임을 구성합니다` → `참가자 누구나 게임을 등록할 수 있습니다` — **0049 이후 사실과 다르므로 의미까지 갱신**)
- 등록 폼·허브: `form-sections/{when-column:37,listing-section:29,who-column:44,recruiting-players-section:53,room-meta-summary-card:17}` · `rotation/player-pool-section.tsx:32` · `me/match-requests/page.tsx:73` · `match-requests/room-invite-card.tsx:50`
- 개인 경기: `me/personal-matches/{page:14,41, new/page:12, [id]/edit/page:13}` · `stats/personal-matches-preview.tsx:17` · `guide/page.tsx:24,27`
- 에러·액션 문구: `lib/match-rooms/create-room.ts:11,12,34` · `lib/actions/personal-matches.ts:132` · `lib/actions/match-rooms.ts:16-36` `ROOM_ERROR_MESSAGES`

**10b — 주석·JSDoc·문서** (diff 리뷰 가독성을 위해 분리): `types/index.ts` · `lib/queries/match-rooms.ts:13` · `lib/match-rooms/*.ts` 헤더 · `CLAUDE.md`(폴더 구조·사이트맵·도메인 어휘 표·Week 항목·`redesign-fixtures` 설명·2차 과제)

**검증**: `grep -rn "경기 리스트\|경기 방" src` → 0건. **`grep -rn "'방장'" src` → 판정 키만 잔존해야 정상.**
**리스크**: 낮음.

---

## Step 11 — ✅ 완료 · 마이그레이션 0052: 참가자 SELECT 확장

**필수는 아니었다.** 섹션 7(관점 행)은 `sourceRequestId && !viewerIsParty`로 감지되고, 파트너는 어차피 액션 권한이 없다 — `propose/confirm/dispute` 3종 모두 `requester_id`/`opponent_user_id`만 통과한다. **0052 없이도 허브와 룸은 완성된다.**

**그래도 권장하는 이유**: 0052 없이는 파트너에게 "대표 확인 대기"가 영구 표시되고, *아무도 제안하지 않았는지 / 제안돼서 대표 확인만 남았는지*를 구분할 수 없다. Step 9의 룸 내 결과 검토도 파트너에게는 동작하지 않는다. CLAUDE.md의 2차 과제에 이미 등재돼 있다.

```sql
-- 0052_request_participant_select.sql
-- 복식 파트너·상대2가 자기 경기의 협상 상태를 '읽기만' 할 수 있게 한다.
-- 쓰기는 그대로 requester/opponent 전용(RPC 내부 not_request_party 체크 무변경).
--
-- ⚠️ 정책식이 match_request_participants를 직접 참조하면 그 테이블의 정책이 다시
-- match_requests를 참조해 상호 재귀에 빠진다. is_room_participant(0049)·
-- is_club_approved_member 선례대로 SECURITY DEFINER 헬퍼로 우회한다.
create or replace function public.is_request_party(p_request_id uuid)
returns boolean language sql security definer stable set search_path = public
as $$
  select exists (
    select 1 from match_requests r
    where r.id = p_request_id
      and (r.requester_id = auth.uid() or r.opponent_user_id = auth.uid())
  ) or exists (
    select 1 from match_request_participants p
    where p.request_id = p_request_id and p.user_id = auth.uid()
  );
$$;
revoke all on function public.is_request_party(uuid) from public, anon;
grant execute on function public.is_request_party(uuid) to authenticated;

-- 3개 정책을 drop 후 헬퍼 기반으로 재생성
--   match_requests_select             (0040:138-139) → is_request_party(id)
--   match_request_participants_select (0040:156-163) → is_request_party(request_id)
--   match_result_negotiations_select  (0040:166-173) → is_request_party(request_id)
```

### 적용 결과

**DB**: `supabase/migrations/0052_request_participant_select.sql` — 원격 적용 완료(`is_request_party` SECURITY DEFINER 헬퍼 + SELECT 정책 3종 교체). anon EXECUTE는 부여되지 않았다(`authenticated`·`service_role`만).

**롤백 스모크 테스트**(합성 요청 1건 삽입 → 역할 전환 조회 → `raise exception`으로 롤백):

| 세션 | requests | participants | negotiations | UPDATE |
|---|---|---|---|---|
| 파트너(`match_request_participants.user_id`) | 1 | 1 | 1 | **0행** (cancel/reject 정책 무변경) |
| 무관한 회원 | 0 | 0 | 0 | — |

정책 상호 재귀 없음(조회가 정상 반환).

**앱 변경 — 표시 문구만이 아니었다.** `MutualResultActions:35`의 가드가 `!c`(협상 행 부재)였기 때문에, 0052로 파트너에게 행이 내려오는 순간 `reviewMode = status==='proposed' && !proposedByMe`가 참이 되어 **파트너에게 [결과 확인] 버튼이 노출되고 누르면 `not_request_party`로 실패**했다. 가드를 `!c?.viewerIsParty`로 옮겨 자격 판정의 단일 출처를 `viewerIsParty`로 통일했다(`RoomGameActions`는 이미 그렇게 판정하고 있었다).

승격된 문구는 순수 함수 `bystanderWaitingBadge(confirmation?)`(`lib/personal-matches/confirmation.ts`, vitest 3)가 단일 출처다 — `none`→`결과 입력 대기` / `proposed`→`대표 확인 대기` / `disputed`→`이의 제기됨`(사유를 툴팁으로), 협상을 못 읽으면 종전 문구로 폴백해 **0052 전후 모두 안전하다**.

---

## Step 12 — (후속, 범위 외) 매칭 리스트 서버 필터·페이지네이션

`fetchMatchRoomsForTab(viewerId, tab, todayIso)` + `fetchRoomTabCounts`(head count). **임베드 배열이 깨지는 건 임베드 테이블 컬럼에 필터를 걸 때뿐**이므로 `match_rooms` 자기 컬럼(`played_at`·`is_settled`) 필터는 `members` 임베드를 훼손하지 않는다 → `open`/`past`는 안전하게 서버 필터 가능하고, `mine`은 멤버십 2단 조회(`fetchPendingRoomInvites:164` 패턴). `ROOM_LIST_LIMIT` 100으로 축소. 커서 페이지네이션(keyset `(played_at, id)`)은 그다음.

---

## 검증

### ✅ 엔드투엔드 수동 시나리오 — 완료

계정 4개(`admin@admin.com / 123123` + 임시 테스트 계정 3, 검증 후 데이터·계정 모두 삭제)로 전량 확인했다.

| # | 시나리오 | 결과 |
|---|---|---|
| 1 | 회원 상대 단식 확인 요청 → 수락 → 제안 → 확인 → 양쪽 개인 결과에 등장, 허브에서 사라짐 | ✅ |
| 2 | 복식에서 파트너 계정의 협상 상태 표시 (Step 11) | ✅ `none`→`결과 입력 대기` / `proposed`→`대표 확인 대기`로 실제로 갈림. 액션 버튼은 끝까지 없음 |
| 3 | 모집형 로테이션 방 → 다른 계정 입장 → 룸 안에서 각자 기준 게임 입력 → 제안/확인 → 방장 '게임 입력 종료' | ✅ 방장이 아닌 두 참가자가 입력, `group_seq` 1→2 이어붙기, 대표가 게임마다 다르게(opponent 우선) 선정, 종료 후 세션 삭제·`[+ 게임 추가]` 전환 |
| 4 | 매칭 리스트 3탭 이동 + `?tab=upcoming`·`?tab=garbage` 폴백 | ✅ 정산 후 진행 중→종료된, '내가 참여한'에는 진행 중/종료됨 두 섹션으로 잔존 |
| 5 | 미확정 상태를 만들어 개인 결과에 없고 허브에 전부 있는지 | ✅ 확정되는 순간 이동(집합 분할 불변식) |
| 6 | 뱃지 = 허브 '내 차례' = 배너 3자 일치, 입력 후 뱃지 감소 | ✅ |
| 7 | 폼 저장 직후 도착 화면 | ✅ 미확정 저장→허브 「내 차례」, 확인 요청 전송→허브 「상대 대기」 |
| 8 | 표면·시각이 빈 방에서 룸 게임 저장 (Step 8c) | ✅ 룸 게임 저장이 두 라운드 모두 정상 |
| + | **이의 제기 → 재제안** (제안→이의(사유)→재제안→확인) | ✅ 이의 시 카드가 `결과 확인 대기`→`결과 입력 대기`로 이동 + `이의 제기됨` 배지, 재제안 다이얼로그에 상대 이의 사유·직전 제안값 표시, 재제안 시 `dispute_reason` 클리어 |

**검증에서 찾은 결함 3건** (전부 표시 계층, 저장 값은 정상이었다):

1. `RoomGameRow`가 `'나'`를 **작성자가 아닌 모든 뷰어**에게 썼다. 정원 없는 방(0048)에는 그 게임과 무관한 참가자도 있어서 남의 게임이 `나 vs (참가자 미정)`으로 보였다 → `buildRoomGameLine`으로 추출하고 `isRoomGameParty`로 당사자에게만.
2. 팀 라인은 뷰어 관점으로 뒤집으면서 **스코어는 대표 게임(작성자 행) 값을 그대로** 써서, 진 사람이 `WIN 6-4`를 봤다 → `buildRoomGameSets`가 상대팀 뷰어에게 `invertSetScores`를 적용해 라인과 관점을 맞춘다(같은 팀 파트너는 me/opp가 같아 반전하지 않는다).
3. `ConfirmFlowNotice`가 복식이면 무조건 '회원 **네 명** 모두'라고 말했다. 방 게임의 관점 행은 회원에게만 생기므로 비회원이 섞이면 거짓 → `memberCount`(= `hideNtrpFor` + 나)로 '두/세/네 명'.

**부수 관찰**(결함 아님): `게임 입력 종료`·`삭제`는 `confirm()` 브라우저 모달이라 자동화로 누르려면 `window.confirm` 오버라이드가 필요하다.

**Supabase**: 0051·0052 모두 MCP `apply_migration` 적용 + `execute_sql` 롤백 스모크 테스트 완료(0052는 위 표 — 음성 테스트·anon EXECUTE 회수 포함). ✅

---

## 이 설계가 명시적으로 하지 **않는** 것

- `fetchPersonalMatchesByUser`·`explode.ts`·`buildMatchGroups`·`groupByMonth`·`MatchGroupList`·`fetchAnalyticsBundle` **무수정** → 통계·레이팅·AI 코칭 회귀 위험 0
- `MatchResultDialog`·`useResultDialog`·`MutualResultActions`·`RotationSessionCard`·`RotationGamesDialog`·`splitRooms`·`match-groups.ts` **무변경**
- 쓰기 RPC·`get_match_room_detail` **무추가·무변경**
- URL·라우트 경로 **무변경** (라벨만 교체)
- `revalidatePath('/me/analytics')` 9곳 → `/profile/${userId}` 교체는 CLAUDE.md의 별건 과제로 **범위 밖**

---

## 요약: 신규 / 수정 / 제거

**신규**
- `src/lib/match-requests/queue.ts` (+test) · `src/lib/queries/match-queue.ts`
- `src/lib/match-rooms/{revalidate,game-labels,tabs}.ts` (+tests)
- `src/components/common/link-tabs.tsx`
- `src/components/match-requests/{queue-section,pending-match-actions,my-turn-panel,waiting-panel,queue-summary-banner}.tsx`
- `src/components/match-rooms/{room-game-dialog,room-game-actions,room-rotation-builder}.tsx` (+ 필요 시 `room-list-section.tsx`)
- `supabase/migrations/0051_personal_match_has_result.sql` · `0052_request_participant_select.sql`
- `bystanderWaitingBadge`(`lib/personal-matches/confirmation.ts`, +test)

**주요 수정**
- `app/(main)/me/match-requests/page.tsx` (픽스처 제거 + 2탭 8섹션)
- `app/(main)/me/personal-matches/page.tsx` (확정 전용 + 배너) · `new/page.tsx` (`?room=` redirect)
- `app/(main)/match-rooms/{page,[roomId]/page}.tsx` (3탭 / 컨텍스트 props)
- `lib/queries/{personal-matches,match-requests,match-rooms,rotation-sessions}.ts`
- `lib/match-rooms/{headcount,game-status}.ts` (+tests)
- `lib/actions/{match-results,match-rooms,personal-matches,rotation-sessions}.ts`
- `components/match-rooms/{room-games-section,room-game-row,room-link,room-host-actions,room-password-gate}.tsx`
- `components/personal-matches/{match-actions,personal-match-form,use-personal-match-submit,use-personal-match-form-state}.ts(x)` · `form-sections/when-column.tsx`
- `components/common/{sidebar,mobile-nav,header}.tsx` (prop 개명) · `lib/nav-items.ts` (라벨 + 순서) · `CLAUDE.md`

**제거**
- `src/lib/redesign-fixtures/match-requests.ts` · `src/components/match-requests/result-confirm-card.tsx`
- `fetchPendingReceivedCount` · `fetchReceivedMatchRequests` · `fetchSentMatchRequests` · `fetchPendingResultConfirmations` · `fetchPersonalMatchesWithConfirmation`

**DB**: 마이그레이션 2건(0051 생성 컬럼 + 부분 인덱스 / 0052 RLS SELECT 확장 + `is_request_party` 헬퍼). 신규 테이블 없음.

**부수 수정되는 기존 결함 4건**: `updatePersonalMatchSetsAction`·`deletePersonalMatchAction`의 방 경로 revalidate 누락 · `match-results.ts`의 방 경로 누락 · 룸 게임 폼 `metaOk` 영구 차단 · `room-password-gate` 안내 문구가 0049 이후 사실과 불일치
