# E2E 결함 대장

> 심각도 — **P1** 오류(저장 실패·크래시·교착·데이터 어긋남) · **P2** 어긋남(화면 문구≠상태, 버튼은 있는데 서버가 거절 또는 그 반대, 뱃지≠카드 수) · **P3** 개선(문구·UX·누락 안내).
> 상태 — `open` / `planned`(수정 계획 있음) / `fixed(<커밋>)` / `wontfix(사유)` / `known`(기지 백로그, 재현되면 `confirmed`).
> ID — 발견 순 `F-<n>`, 코드 조사 선등록 `F-pre-<n>`, 기지 `K-<n>`.

## 발견 (이번 실행)

| ID | P | 시나리오 | 증상(실제) | 기대 | 원인(파일·함수) | 수정 계획 | 상태 |
|---|---|---|---|---|---|---|---|
| F-1 | P3 | S1.5 | 단식 방 상세 헤더 eyebrow가 `자유 기록 · 하드` — 사용자는 단식 매칭을 만들었는데 「자유 기록」이라는 내부 어휘(source_kind direct)가 보인다 | `단식 · 하드`처럼 방식 라벨 | `RoomDetailHeader` eyebrow가 source kind 라벨을 그대로 씀 | eyebrow를 `MATCH_TYPE_LABELS[matchType]`(또는 단식/복식)로 교체 | open |
| F-2 | P3 | S1.10 | 「나를 초대한 매칭」 카드 하단 문구 `수락하면 방 참가자로 등록됩니다. 경기 기록 자체는 방장 계정에만 남습니다.` — Week 39 이후 방 게임은 상호 확인이라 양쪽 기록에 남는다. 거짓 안내 | `수락하면 방 참가자로 등록되고, 방 안 게임은 상대 확인을 거쳐 양쪽 기록에 남습니다` | `RoomInviteCard` 하단 caption(Week 25 문구 잔존) | 문구 교체 | open |
| F-3 | P3 | S1.10 | 초대 카드 제목 `9월 11일 10시 · E2E-S1 · 단식` — 상세·목록은 `10:00~12:00`(formatRoomWhen)인데 초대 카드만 시 단위 | 같은 방은 어디서나 같은 시간 표기 | `RoomInviteCard`가 `buildRoomTitle`에 `durationMinutes`를 넘기지 않음(초대 요약 쿼리에 컬럼 누락 가능) | `room-queue.ts` 초대 요약에 `duration_minutes` 포함 → `buildRoomTitle` 전달 | open |
| F-4 | P3 | S1.16 | 제안자 관점 게임 행에 배지 둘 — 상태 배지 `결과 확인 대기`(roomGameStatusBadge) + 액션 영역 `참가자 확인 대기`(NegotiationTurnActions). 같은 뜻을 두 번 말한다 | 행마다 배지 하나(CLAUDE.md 「배지는 행마다 하나」) | `room-game-row.tsx`가 상태 배지를 그리고 `NegotiationTurnActions`가 또 배지를 그림 | 룸 행에서는 액션 영역 배지를 숨기거나(`badgeClassName` 아닌 `hideBadge` prop), 상태 배지를 협상 상태로 대체 | open |
| F-5 | P2 | S1.19 | 정산된 방(`종료`)에서 [회원 초대]·[비회원 초대]·[자동 대진표]는 사라지는데 **[게임 추가]는 남는다**. 눌러 저장하면 방이 다시 미정산으로 돌아간다(가드 없음) | 정산된 방에서는 게임 추가도 막거나, 의도라면 「추가하면 매칭이 다시 진행 중이 됩니다」 안내 | `canViewerAddRoomGame`·`canAddRoomGame`(room-context.ts)이 `isSettled`를 보지 않음. RPC `create_room_game`도 정산 검사 없음 | 결정 필요: (a) `canAddRoomGame`에 `!isSettled` + RPC `room_already_closed` 가드(0072 원칙: 노출 = 가드) 또는 (b) 허용하되 안내. **권장 (a)** — 정산 뒤 게임을 붙이려면 [결과 정정]처럼 명시적 재개가 맞다 | open |
| F-6 | P3 | S2.5 | 이의 사유 201자 입력 시 문구 없이 200자로 잘려 저장된다(`maxLength`) | 잘림을 알리는 카운터(`n/200`) 또는 문구 | textarea `maxLength=200`만 있고 카운터 없음 | 글자 수 카운터 추가(정정 사유 input도 동일) | open |
| F-8 | P3 | S3.8 | 자동 대진표·대진 편집 카드에서 NTRP 없는 게스트가 `3.9`(아는 사람 평균 대체값)로 보인다 — 방장 3.9와 나란히 놓여 게스트 실력이 3.9인 것처럼 읽힌다. 참가자 칩은 `비회원`으로 맞게 표시 | 카드에서는 대체값 대신 `—` 또는 `비회원`(배치는 대체값으로 하되 표시는 하지 않는다) | `toLineupPlayers`가 fallback을 ntrp에 넣고 `RoomLineupGameCard`가 그 값을 그대로 그림 | `LineupPlayer`에 `ntrpKnown: boolean`을 더해 카드가 모를 때 숨기기 | open |
| F-9 | P2 | S4.7 | 복식 결과 확인 다이얼로그가 제안자를 **상대팀 이름**으로 말한다 — A(남자01)가 제안했는데 파트너 B에게 `남자04 · 남자03님이 제안한 결과`, 상대 D에게 `남자02 · 남자01님이 제안한 결과`. 행의 `결과를 입력한 사람: 남자01`과 모순 | `남자01님이 제안한 결과` | `result-review-panel.tsx:42`가 `opponentName`을 제안자 자리에 씀 | `proposedBy` 이름을 `PersonalMatchConfirmation`에 실어 전달(`proposerName`), 패널이 그것을 쓰고 없을 때만 opponentName 폴백 | open |
| F-10 | P2 | S1.16·S4.7·S4.10 | 룸 게임 행의 좌석 명단이 **뷰어를 두 번** 센다 — `확인 대기: 나 · 남자04 · 남자02 · 남자03`(B 관점, 실제 대기 3명), `확인 완료: 나 · 남자02`(둘 다 B). 개인 카드에는 없다 | `확인 대기: 나 · 남자04 · 남자03` | `seat-status.ts:67`이 `'나'`를 앞에 더하는데, 룸 행 호출부가 `seats`에 뷰어 본인 참가자를 걸러 넘기지 않는다(개인 카드의 `namedSeatsOf`는 타 좌석만) | 룸 행(`room-game-row`/`buildRoomGameSeats`)에서 `viewerId`를 제외한 좌석만 넘기거나 `seatStatuses`가 `me` 이름과 같은 항목을 제거. vitest 케이스 추가 | open |
| F-11 | P2 | S4.13 | 복식(로테이션) 방에서 **게임을 전부 확정해도** 풀 회원 전원에게 사이드바 뱃지 1 + 카드 필 `결과 입력`이 남는다(D 확인). 방 상세에는 「지금 할 일」 배너가 없어 카드와 상세가 어긋난다. 방장이 [게임 입력 종료]를 누르기 전까지 지속 | 게임이 남지 않았으면 풀 세션은 차례로 세지 않거나, 방장에게만 「게임 입력 종료로 마무리하세요」 차례를 준다 | `room-queue.ts`/`match-queue.ts`가 미확정 `rotation_sessions`를 무조건 `enterResult`로 넣음. `classifyRoomGameTurn`은 게임만 봄 | (a) 방 세션은 큐에서 `enterResult`로 세지 않는다(방 안 [게임 입력]은 상시 가능한 액션이지 차례가 아님) + (b) 방장에게 `closeRotation` 차례 신설(배너 「모든 결과가 확정됐습니다 — 게임 입력을 종료하면 매칭이 마무리됩니다」). K-12와 묶어 결정 | open |
| F-13 | P2 | S6.12 | 결과 미입력 게임이 있는 B가 [방 나가기]를 하면 **사이드바 뱃지는 1로 남는데** 「참여 중인 매칭」에는 카드가 없다(declined는 목록에서 제외, 큐는 관점 행을 그대로 셈). 뱃지 = 카드 수 항등식(Week 45)이 깨진다. 방 상세는 게이트라 할 일을 볼 수도 없다(K-1) | 나간 방의 게임은 큐에서 빼거나(뱃지 0), 나간 뒤에도 카드는 남기고(「나간 매칭」 표시) 결과 확인 경로를 준다 | `fetchMatchQueue`가 `room_id` 방의 멤버십 상태를 보지 않음; `fetchRoomQueue`/목록은 joined만 | K-1과 함께: `leave_match_room`에 `member_has_games` 가드(강퇴와 대칭) 또는 큐에서 declined 방 제외. **권장: 가드** — 결과가 남은 채로 나가는 것이 문제의 뿌리 | open |
| F-14 | P3 | S10.12 | 내려간 방의 URL은 404 페이지인데 CTA가 `클럽 목록으로 돌아가기`다 — 매칭 룸 경로에서는 매칭 리스트가 맞다 | `매칭 리스트로 돌아가기` 또는 경로별 CTA | `app/not-found.tsx` 단일 CTA | `/match-rooms/[roomId]`에 `notFound()` 대신 전용 안내(「내려간 매칭입니다」 + 매칭 리스트 링크) | open |
| F-7 | P3 | S2.11 | [결과 정정] 다이얼로그 설명 `양쪽 기록이 미확정으로 돌아가고 **확인 요청에서** 다시 입력합니다.` — 허브가 철거되어 다시 입력하는 곳은 매칭 룸이다 | `…매칭 룸에서 다시 입력합니다` | `ReopenResultButton` description 문구(Week 39 이전) | 문구 교체 | open |

## 수정 계획 요약 (2026-09-11 첫 전수 실행 뒤) — 승인 대기

P1(저장 실패·크래시·교착)은 **0건**. 흐름 자체는 전부 통과했고, 발견한 것은 어긋남(P2) 5건과 문구·표시(P3) 9건이다. 묶어서 3개 커밋으로 고치는 것을 제안한다.

| 묶음 | 항목 | 손댈 곳 | 회귀 가드 |
|---|---|---|---|
| **① 정산·차례 정합 (P2)** | F-5 정산된 방의 [게임 추가] / F-11·K-12 세션 차례 잔존 + 방장 종료 안내 / F-13·K-1 나간 사람의 뱃지·교착 | `room-context.ts` `canAddRoomGame`(+RPC `create_room_game`에 `room_already_closed`), `room-queue.ts`·`match-queue.ts`(방 세션을 차례로 세지 않기), `room-turn.ts`에 방장 `closeRotation` 차례 + 배너 문구, 마이그레이션 0077: `leave_match_room`에 `member_has_games` 가드(강퇴와 대칭) | `room-turn.test.ts`·`room-context.test.ts`·`queue.test.ts` 케이스, 0077 롤백 스모크, S1.19·S4.13·S6.12 재실행 |
| **② 협상 표시 (P2)** | F-9 제안자 이름 / F-10 뷰어 이중 표기 | `PersonalMatchConfirmation`에 `proposerName`, `result-review-panel.tsx`, 룸 행 `seats` 구성(`buildRoomGameSeats` 또는 `seatStatuses`에서 me 제거) | `seat-status.test.ts` 케이스, S4.7·S4.10 재실행 |
| **③ 문구·표시 (P3)** | F-1 eyebrow / F-2 초대 카드 옛 문구 / F-3 초대 카드 시간 표기 / F-4 배지 중복 / F-6 사유 카운터 / F-7 정정 문구 / F-8 게스트 대체 NTRP / F-14 404 CTA / F-pre-1·2 | 각 행 참조 | `colors.test.ts` 무관, 스냅샷은 S1.10·S3.8·S2.11 재실행 |

순서 제안: ① → ② → ③. ①의 F-13은 마이그레이션이 들어가므로 별도 승인. ②·③은 앱만.

## 코드 조사 선등록

| ID | P | 근거 | 증상 | 수정 계획 | 상태 |
|---|---|---|---|---|---|
| F-pre-1 | P3 | `match-room-form.tsx` · `createMatchRoomAction` | 초대 실패 문구(`매칭은 만들어졌지만 초대에 실패했습니다…`)는 `roomId`가 있으면 폼이 무조건 push하므로 화면에 닿지 않는다 | 액션 결과에 `inviteError`를 따로 실어 룸 착지 후 배너로 한 번 보여주거나, push 전에 문구를 세션 스토리지에 남긴다 | open |
| F-pre-2 | P3 | `lib/actions/match-rooms.ts` `translate`, `match-results.ts` | 에러 맵이 `includes` 선형 탐색이라 `not_room_member`/`target_not_room_member`, `result_already_confirmed`/`…_by_seat` 순서에 의존 — 회귀 유닛 테스트 없음 | 에러 맵을 순수 모듈로 빼고 `translate`가 정확 일치 우선·접두 일치 후순으로 찾게 한 뒤 vitest로 고정 | open |
| F-pre-3 | P2 후보 | `game-status.ts` `roomGameMemberIds` ↔ `kick_room_member` `member_has_games` | 게임이 하나라도 붙으면 [내보내기]가 사라지는데, 게스트 상대 자유 기록만 있는 회원(0076 direct 라인업 포함)도 같은 취급인지 확인 필요 — S6·S4.12에서 판정 | S6 결과에 따라 결정 | open |

## 기지 (CLAUDE.md 백로그에서 옮김) — 재현되면 `confirmed`

| ID | 출처 | 내용 | 상태 |
|---|---|---|---|
| K-1 | Week 41 잔여 | 스스로 나간 사람(declined)은 게임을 친 뒤 [방 나가기]를 하면 상세가 막혀 결과를 확인할 수 없다(강퇴에만 `member_has_games` 가드) | **confirmed** — S6.12: 나간 뒤 상세는 비밀번호 게이트, 뱃지는 1 잔존(F-13). 탈출구 = 비밀번호 재입장(6.13 확인) |
| K-2 | Week 41 잔여 | 방장이 누구를 내보냈는지 화면에 남지 않고, 초대 검색에 「강퇴됨」 표시가 없다 | known — S6.7 |
| K-3 | Week 41 잔여 | 게임 추가 폼의 파트너·상대2 자동완성에 방 게스트가 뜨지 않는다 | known — S3.7 |
| K-4 | Week 41 잔여 | 강퇴 알림 없음(강퇴자는 방을 열어야 안다) | known — S6.3 |
| K-5 | Week 42 잔여 | 0071 이전 대진은 `origin='game'`이라 [대진 편집] 대상이 아니다; 편집은 전량 교체라 id가 바뀐다; 게임 순서 바꾸기 없음 | known — S3.15 |
| K-6 | Week 43 잔여 | 경기당 시간을 방에 저장하지 않아 저장된 대진의 라운드 시각은 역산값; 코트 배정 없음 | **confirmed** — S3.14: 팝업은 `10:00·10:30·11:00`(30분), 저장 뒤 방은 `10:00·10:40·11:20`(120분÷3 역산) |
| K-7 | Week 47 잔여 | 룸 힌트·매칭 만들기 요약은 30분 경기 가정 — 다이얼로그에서 다른 시간을 고르면 숫자가 갈린다 | known — S3.6 |
| K-8 | Week 48 잔여 | 회원+회원 vs 게스트+게스트 복식 게임은 direct 행이라 두 번째 회원의 개인 기록에 남지 않는다 | known |
| K-9 | Week 48 잔여 | 자유 기록 라인업 행은 소유자가 `/me/personal-matches/[id]/edit`에서 고치거나 지울 수 있고, 방장 소유 행의 메타 편집은 방 메타를 덮어쓴다 | known — S3.20 |
| K-10 | 백로그 | 이의 왕복 상한 없음(`dispute_count`만 셈), 알림·리마인더·만료 없음 | known |
| K-11 | Week 45 잔여 | 방 상세 URL에서는 사이드바 「매칭 리스트」가 활성(참여 중인 매칭에서 들어가도) | known — S8 |
| K-12 | Week 40 잔여 | 미확정 로테이션 방에 [자동 대진표]와 [게임 입력]이 공존 — 유지하기로 결정. 정산하려면 방장이 [게임 입력 종료]를 눌러야 한다 | **confirmed** — S4.13·4.15: 게임 전부 확정 뒤에도 방장 배너가 비어 있어 종료를 눌러야 한다는 것을 아무도 말하지 않는다(F-11과 함께 처리) |
