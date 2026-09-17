# 매칭 룸 · 직접 기록 E2E 절차서

> 규약(계정·태그·정리 SQL)은 `README.md`. 결과는 `runs.md`에, 결함은 `findings.md`에 적는다. 이 파일은 **무엇을 누르고 무엇이 보여야 하는지**만 담는다.
>
> 표의 열 — `#` 단계 · `계정` · `조작`(코드의 라벨 그대로, `[ ]`는 버튼) · `기대` · `검증`(앱 술어 / RPC 가드 / SQL) · `수단`(B=브라우저, S=SQL 보조).
> 검증 열의 원칙: **노출 조건 = 서버 가드**(0072). 버튼이 보이면 눌러서 되어야 하고, 안 보이면 RPC도 거절해야 한다.

## 축 커버리지 (시나리오가 어느 경우의 수를 밟는지)

| 축 | 값 | 시나리오 |
|---|---|---|
| 방식 | 단식 / 남자 복식 / 혼합 복식 / 단식 4명 2면 | S1·S2·S3 / S4·S5 / S4b / S11 |
| 참가 경로 | 만들기 초대→수락 / 룸 안 초대 / 비밀번호 입장 / 게스트 등록 / 강퇴→재초대 / 나가기 | S1 / S6 / S7 / S3 / S6 / S6 |
| 게임 생성 | 자동 대진표(프리셋·경기 수·면 수·편집·다시 뽑기) / 대진 편집 / 게임 추가(회원·비회원·모집 중) / 로테이션 빌더 / 게임 입력 종료 | S3·S4 / S3·S4 / S1·S10 / S5 / S5 |
| 결과 협상 | 제안→확인 / 제안→이의→재제안→확인 / 제안자 수정 / 정정(reopen) / 자유 기록 즉시 확정 / 좌석 셋 만장일치 / **상태 전이 전수·동시성·확인한 좌석의 이의·탈퇴자 분모** | S1 / S2 / S2 / S2 / S3·S9 / S4 / **S14** |
| 호스트 관리 | 비밀번호 변경 / 내보내기 / 재초대 / 게스트 제거 / 리스트에서 내리기 / **닫기·다시 열기** | S7 / S6 / S6 / S3 / S10 / **S12** |
| 목록·뱃지 | 진행 중·마무리됨 / 초대 섹션 / 내 차례 필 / 뱃지 항등식 / 날짜 축 / 레거시 URL | S8 |
| 직접 기록 | 비회원 확정 / **회원이 끼면 비노출 방(0082)** / 수정·삭제 / 결과 입력 대기 | S9 / **S13** / S9 / S9 (CRUD 전수는 `record-scenarios.md` R1) |
| 권한·경계 | 비참가자·강퇴자·정산 후·중복·길이·잠금(SQL 축) / **화면 축 — 행위자별 버튼 부재 ↔ RPC 거절** | S10 / **S15** |
| 비노출 방 | 리스트 제외·비밀번호 없음·`room_not_listed`·초대로만 진입·`비공개` 칩 | **S13** |

---

## S0 준비

| # | 계정 | 조작 | 기대 | 검증 | 수단 |
|---|---|---|---|---|---|
| 0.1 | — | README 정리 SQL 실행 | 마지막 SELECT 전부 0 | — | S |
| 0.2 | A | `/match-rooms`로 이동(비로그인) | `/login?next=%2Fmatch-rooms`로 리다이렉트 | `lib/supabase/middleware.ts` 보호 경로 | B |
| 0.3 | A | 로그인 | `/match-rooms`로 복귀. 사이드바 「참여 중인 매칭」 뱃지 없음 | `roomBadgeTotal` = 0 | B |
| 0.4 | A | `/me/match-rooms` | `참여 중인 매칭이 없습니다.` 또는 기존 방 없음, 「나를 초대한 매칭」 섹션 없음 | — | B |
| 0.5 | — | 비로그인 `/guide` | 리다이렉트 없이 열리고 헤더([로그인])·사이드바(「사용 가이드」 한 줄, 활성) 유지. 6섹션(흐름·매칭 리스트·참여 중인 매칭·내 경기 결과·다섯 단계·용어) 각각 글 아래 「예시」 그림(더미 카드·배지). 흐름 섹션의 스테퍼 4칸을 누르면 해당 섹션으로 이동. 예시 안 카드·[참가 수락]·[결과 확인]은 클릭·탭 포커스가 되지 않고 다이얼로그가 열리지 않는다. 환영 팝업 없음 | Week 57·58 — 보호 라우트 아님, `GuideExample`의 inert | B |
| 0.6 | A | `/match-rooms` 상단 「이 화면 사용법」 | 참가 중인 매칭이 없으면 **펼침**, 있으면 접힘. 「전체 가이드 →」가 `/guide#match-rooms`로 착지해 그 섹션이 상단에 온다 | `PageGuide open` = `joinedRoomIds.length === 0` | B |

## S1 단식 기본 흐름 (A 호스트 · B 참가자)

| # | 계정 | 조작 | 기대 | 검증 | 수단 |
|---|---|---|---|---|---|
| 1.1 | A | `/match-rooms/new` | 경기 방식 `단식` 기본, 경기 시간 `2시간`, 코트 면 수 `1면`, 요약 줄 `시각을 고르면 종료 시각이 계산됩니다` | `use-match-room-form-state` 기본값 | B |
| 1.2 | A | 비밀번호에 `abc` 입력 | 실시간 문구 `비밀번호는 4~20자로 입력해주세요.`, [매칭 만들기] 비활성 | `validateRoomPassword` | B |
| 1.3 | A | 비밀번호 `a b c d` | `비밀번호에는 공백을 넣을 수 없습니다.` | 동상 | B |
| 1.4 | A | 날짜 오늘, 시각 `10시`(셀렉트 라벨은 `10시` — base-ui Select, 키보드로 고른다), 표면 아무거나, 코트명 `E2E-S1`, 비밀번호 `1234`, 상대 초대에서 `남자02` 입력 → [검색](또는 Enter — 폼이 제출되지 않는다) → 결과 행 클릭 → 칩 `남자02`, 메모 `S1` | 요약 줄 `10:00~12:00 (2시간) · 코트 1면 · 참가 예정 2명이면 1인당 N경기 권장`, 초대 칩 `남자02` | `recommendGames`(단식 2명·30분·2h·1면) | B |
| 1.5 | A | [매칭 만들기] | `/match-rooms/<id>`로 이동. 헤더 eyebrow `단식 · 하드`(방식 라벨 — 출처 어휘 아님, F-1), 제목에 `E2E-S1 · 단식`, 단계 칩 `모집 중`, 명단에 `남자01 호스트`·`남자02 초대 대기`, 게임 섹션 빈 상태 `게임이 없습니다. 함께 친 참가자로 게임을 추가하세요.` | SQL: `match_rooms.court_name='E2E-S1'`, `match_room_members` host/joined + player/invited, `match_room_secrets` 1행 | B+S |
| 1.6 | A | 헤더 액션 | [비밀번호 변경]·[매칭 리스트에서 내리기] 있음, [게임 입력 종료] **없음**(단식) | `canCloseRotation=false` | B |
| 1.7 | A | 게임 섹션 헤더 | [게임 추가] 있음(direct는 항상), [자동 대진표] 있음(회원 1명이라도 후보 >0) | `canViewerAddRoomGame`·`canCreateRoomLineup(…,2,1)` | B |
| 1.8 | A | `/me/match-rooms` | `진행 중` 탭에 카드(`E2E-S1`, 칩 `호스트`), 뱃지 없음(내 차례 없음) | `viewerRoomTurn`=null | B |
| 1.9 | B | 로그인 → 사이드바 | 뱃지 **1**(초대) | `roomBadgeTotal(turns, 1)` | B |
| 1.10 | B | `/me/match-rooms` | 최상단 `나를 초대한 매칭` 카드 `나를 참가자로 입력한 경기 · 9월 15일 10:00~12:00 · E2E-S1 · 단식`(상세·목록과 같은 구간 표기, F-3), 하단 `수락하면 매칭 참가자로 등록됩니다. 매칭 안 게임은 상대 확인을 거쳐 양쪽 기록에 남습니다.`(F-2), [참가 수락]/[거절] | `roomQueue.invites` | B |
| 1.11 | B | 상세 URL 직접 접근 | 상세가 보인다(초대자는 게이트 없음) + `RoomInviteBanner` `이 경기에 초대되었습니다. 참가하시겠어요?` [참가 수락]/[거절]. 턴 배너·[게임 추가]·[회원 초대]·하단 [매칭 나가기] **없음**(Week 63 U-7 — 배너의 [거절]이 같은 행동) | invited는 RPC 통과, `isMember=false` | B |
| 1.12 | B | [참가 수락] | 배너 사라짐, 명단 `남자02 참가`, [게임 추가]·[회원 초대]·[비회원 등록] 등장, 하단 [매칭 나가기] 등장. 단계 칩 여전히 `모집 중`(게임 0) | `respond_room_invite` → joined; SQL `status='joined'` | B+S |
| 1.12a | A | [회원 초대] → `남자0` + Enter → 결과에서 `남자03`·`남자04` 행 클릭 → [2명 초대하기] | 팝업 닫힘, 명단에 `남자03 초대 대기`·`남자04 초대 대기` 두 행. 재검색하면 둘은 비활성 + 칩 `초대 대기`, `남자02`는 `참가`(Week 64 다중 초대) | `inviteRoomMembersAction(roomId, ids)` | B |
| 1.13 | B | 뱃지 | 0 | — | B |
| 1.14 | A | [게임 추가] → 상대 자동완성에 `남자02` 선택 → [게임 저장] | 게임 행 1개: 팀 줄 `나` / `남자02`, 배지 `결과 미입력`, 액션 [결과 입력]. 단계 칩 `진행 중`, 배너 `경기 결과를 입력해주세요` | `create_room_game` → `match_requests.status='accepted'`, `personal_matches` 관점 2행(`source_type='confirmation'`), `match_result_negotiations.result_status='none'` | B+S |
| 1.15 | B | 상세 | 같은 게임 행이 `나` / `남자01`로 보임(당사자 전원 '나', Week 46), [결과 입력] 있음 | `buildRoomGameTeams` | B |
| 1.16 | B | [결과 입력] → 스코어 `6:3` 한 게임 → [확인 요청] | 행 배지는 **하나**(`결과 확인 대기` — 액션 영역의 `참가자 확인 대기`는 룸 행에서 숨긴다, F-4), 단식은 진행 배지가 없다(`formatConfirmProgress`는 좌석 2면 빈 문자열), `결과를 입력한 사람: 나`·`확인 대기: 남자01`, 배너 `상대의 응답을 기다리는 중입니다` | `propose_match_result` → `result_status='proposed'`, `confirmed_by=[B]` | B+S |
| 1.17 | A | 상세 | 배지 `결과 확인 대기`, 버튼 [결과 확인], 배너 `제안된 결과를 확인해주세요`, 스코어가 **A 관점으로 반전**(`3:6`) | `canRespondToProposal` true, `invert_set_scores` | B |
| 1.18 | A | `/me/match-rooms` + 뱃지 | 카드 필 `결과 확인`, 뱃지 1 | `ROOM_TURN_PILL.confirmResult` | B |
| 1.19 | A | [결과 확인] → 다이얼로그 `경기 결과 확인` → [결과 확인] | 행에 `패 3-6`(A) 결과 배지, 단계 칩 `종료`, `RoomSettledNotice`, **[게임 입력]·[게임 추가]·[자동 대진표]·[회원 초대]·[비회원 등록] 전부 사라짐**(0077 — 남는 것은 호스트의 [비밀번호 변경]·[매칭 리스트에서 내리기]와 [결과 정정]뿐, F-5) | `confirm_match_result` → `settle` → `result_status='confirmed'`, `is_settled=true`, 양쪽 `personal_matches.set_scores` 채워짐 | B+S |
| 1.20 | A·B | `/me/personal-matches` | 확정 카드에 이 경기(A `패`, B `승`), 카드 배지 `상호 확인`, [결과 정정] 있음, [수정]·[삭제] 없음 | `MatchActions` | B |
| 1.21 | A·B | `/me/match-rooms` | 카드가 `마무리됨` 탭으로, 칩 `결과 확정`, 뱃지 0 | 정산 축 | B |
| 1.22 | — | `/match-rooms` (오늘 경기일) | 정산됐으므로 `종료된 경기` 탭으로(날짜 축의 종료 = `is_settled` ∨ 날짜 경과, 0049) | `RoomListAxis='schedule'` | B |

## S2 단식 이의·정정 (A · B) — S1 방 재사용

| # | 계정 | 조작 | 기대 | 검증 | 수단 |
|---|---|---|---|---|---|
| 2.1 | A | S1 방에서 [게임 추가] 시도 | **정산된 방이라 버튼 없음**. 새 방 `E2E-S2`를 S1과 같이 만들고 B 초대·수락 | `is_settled` | B |
| 2.2 | A | [게임 추가] B 상대 → A [결과 입력] `6:4` → [확인 요청] | A 배지 `참가자 확인 대기`, 버튼 [제안 수정] | `proposedByMe` | B |
| 2.3 | A | [제안 수정] → `6:2` → 저장 | 스코어 갱신, 여전히 proposed. B의 확인 초기화(제안자만 남음) | `confirmed_by=[A]` | B+S |
| 2.4 | B | [결과 확인] 다이얼로그 → [이의 제기] → 사유 `점수 오기` → 제출 | B 배지 `내가 이의 제기` **하나**(상태 배지 `이의 제기`는 당사자 행에서 액션 배지에 양보 — F-20), 버튼 [다시 입력](outline), 사유 줄 `내 이의 사유: 점수 오기` | `dispute_match_result` → `disputed`, `disputed_by=[B]`, `dispute_count=1` | B+S |
| 2.5 | B | 사유 201자 입력 | textarea `maxLength=200`이 **조용히 잘라** 200자로 저장된다(문구는 뜨지 않는다 — 앱 선검증 `dispute_reason_too_long`은 붙여넣기 우회 시에만). SQL `length(dispute_reason)=200` | maxLength + 앱 선검증 | B+S |
| 2.6 | A | 상세 | 배지 `남자02님 이의` 하나, 버튼 [다시 입력](강조), 배너 `결과를 다시 입력해주세요`, 사유 줄 `남자02님 이의 사유: 점수 오기` | `isReentryTurn` true(제안자) | B |
| 2.7 | A | `/me/match-rooms` | 필 `다시 입력`, 뱃지 1 | `reenterResult` | B |
| 2.8 | A | [다시 입력] → `6:4` → [확인 요청] | 배지 `남자02님 이의 후 재입력`, 진행 배지 | 재제안 → `proposed`, `dispute_count` 유지 1 | B+S |
| 2.9 | B | 상세 | 배너 `다시 입력된 결과를 확인해주세요`, 필 `결과 확인` | `reentryReview` | B |
| 2.10 | B | [결과 확인] → 확인 | 정산, `종료` | `confirmed` | B+S |
| 2.11 | A | 게임 행 [결과 정정] → `확정된 결과를 정정할까요?`(설명 끝이 `…매칭 룸에서 다시 입력합니다`, 라벨 `정정 사유 (선택, 0/200)`, F-6·F-7) 사유 `재정정 테스트` → [정정 요청] | 행이 미확정으로 돌아옴(배지 `이의 제기`), 단계 칩 `결과 확인 중`, 직전 값 프리필 | `reopen_match_result` → `disputed`, 양쪽 `set_scores=[]`, `is_settled=false` | B+S |
| 2.12 | A | [다시 입력] `6:4` → B [결과 확인] | 다시 정산 | — | B |
| 2.13 | B | (경계) B가 제안한 새 게임을 B가 [이의 제기] 시도 | 버튼 없음. SQL로 `dispute_match_result` 호출 → `cannot_dispute_own_proposal` | `canDisputeProposal` false | S |
| 2.14 | — | `/me/personal-matches` 양쪽 | 이 방 게임들이 확정 카드에 있고 `상호 확인` 배지 | — | B |

## S3 단식 호스트 + 게스트 4 (A) — 0076 회귀

| # | 계정 | 조작 | 기대 | 검증 | 수단 |
|---|---|---|---|---|---|
| 3.1 | A | 방 `E2E-S3` 단식·시각 `10:00`·2시간·1면, 초대 없음 | 상세 `모집 중`. 게임 섹션 아래 힌트 **없음**(권장은 인원 2명부터 — 호스트 1명) | `recommendGames` null (`playerCount < 2`) | B |
| 3.2 | A | [비회원 등록] → 이름 `E2E게스트1`, 주력손 오른손, 성별 남 → [참가자로 추가] | 명단에 `E2E게스트1 비회원` | `add_room_guest` | B+S |
| 3.3 | A | 같은 이름 다시 추가 | `이미 같은 이름의 참가자가 있습니다. 구별되는 이름으로 입력해주세요.` | `duplicate_guest_name` | B |
| 3.4 | A | 이름 `남자01`(본인 이름)로 추가 | 같은 거부 문구(회원 이름과도 중복 거부) | 동상 | B |
| 3.5 | A | `E2E게스트2`·`E2E게스트3`·`E2E게스트4` 추가 | 명단 게스트 4명, 헤더 `참가 1명 · 비회원 4명`(Week 63 U-9 — 3.6 힌트의 `참가 예정 5명`과 합이 맞는다) | `formatHeadcount(joined, guests)` | B |
| 3.6 | A | 게임 섹션 아래 힌트 | `10:00~12:00 · 코트 1면 · 30분 경기 기준 → 참가 예정 5명이면 1인당 1경기 권장 — [자동 대진표]를 열면 이 값으로 시작합니다.` | `RoomLineupHint`·`describeRecommendation` | B |
| 3.7 | A | [게임 추가] 상대 자동완성 | 게스트 이름이 **후보에 없음**(상호 확인 상대는 회원만). 취소 | 규칙(0069) | B |
| 3.8 | A | [자동 대진표] | 드롭다운 `1경기 · 권장`으로 시작, 추천 줄 `… → 권장 설정과 같습니다`, 경고 `회원이 1명뿐이라 회원은 출전 편차 규칙을 넘어 더 자주 섭니다.`·`회원이 한 팀에만 있는 게임 3개는 그 회원의 개인 기록으로만 저장됩니다…`, 미리보기 3게임 전부 team1 첫 자리 `남자01`, 게스트가 낀 팀의 전력은 `3.9 · 비회원 1`처럼 **회원 합계 + 비회원 수**(대체 NTRP를 그리지 않는다, F-8) | `useRoomLineup` lazy init, `buildRoomLineup` withMemberForced | B |
| 3.9 | A | 1인당 경기 수를 `2경기`로 | 추천 블록이 spot 톤 + [권장값으로 맞추기], 총 경기 수 5, 편집 경고 없음 | `LineupRecommendation` 분기 | B |
| 3.10 | A | [권장값으로 맞추기] | 다시 `1경기 · 권장`·caption | — | B |
| 3.11 | A | 게임 2 [수정] → 상대 자리를 다른 게스트로 → [완료] | 자리 교체됨, 알림 `대진을 직접 고쳤습니다…` | `lineup-draft` swap | B |
| 3.12 | A | 게임 3 [삭제] → 목록 아래 [게임 추가] → 자리 채움 | 저장 버튼 `3경기 저장` 활성 | `validateDraft` | B |
| 3.13 | A | [다시 뽑기] | 편집이 버려지고 새 시드 대진 | `reroll` | B |
| 3.14 | A | [3경기 저장] | 게임 행 3개, 각 `결과 미입력`, 작성자 `남자01`, 액션 [결과 입력]. **라운드 예상 시각이 팝업에서 본 것과 같다**(0078 — 방이 고른 경기당 시간을 기억한다. 종전에는 소요 시간 ÷ 라운드 수로 역산해 어긋났다, K-6) | `create_room_lineup` → `personal_matches` direct 3행 `origin='lineup'`, `match_requests` 0행, `match_rooms.slot_minutes` = 고른 값 | B+S |
| 3.15 | A | [대진 편집] | 3게임이 목록에 있음. 한 자리 교체 → [3경기 저장] | `get_room_lineup_requests`(request_id null) → `replace_room_lineup` → 옛 행 삭제·새 행 3개(id 변경) | B+S |
| 3.16 | A | 게임 1 [결과 입력] `6:0` | 즉시 `승 6-0`, 단계 칩 `진행 중`(남은 2게임) | `updatePersonalMatchSetsAction`, `has_result` | B+S |
| 3.17 | A | [대진 편집] | 결과 있는 게임 1은 목록에 **없음**, 2게임만 | `lineup_locked` 예방(목록 필터) | B |
| 3.18 | A | 명단에서 `E2E게스트1` [빼기](confirm 수락) | 명단에서 사라지고 게임 행은 그대로 | `remove_room_guest`; SQL `personal_match_participants` 유지 | B+S |
| 3.19 | A | 남은 2게임 [결과 입력] | 단계 칩 `종료`, `RoomSettledNotice` | `is_settled=true`(direct 행도 집계) | B+S |
| 3.20 | A | `/me/personal-matches` | 3게임이 확정 카드, [수정]·[삭제] 있음(direct) | `FreeMatchEditActions` | B |

## S4 남자 복식 회원 4 (A·B·C·D) — 좌석 만장일치 · 2면 라운드

| # | 계정 | 조작 | 기대 | 검증 | 수단 |
|---|---|---|---|---|---|
| 4.1 | A | 방 `E2E-S4` 복식·종목 `남자 복식`·`10:00`·2시간·**2면**, 초대 B·C·D | 힌트 요약 `… 코트 2면 · 참가 예정 4명이면 1인당 N경기 권장`(실효 면 수 1 → `1면 기준`) | `effectiveCourtCount(4, doubles, 2)=1` | B |
| 4.2 | B·C·D | 각자 [참가 수락] | 명단 4명 참가. 단계 칩 `모집 중`, 게임 빈 상태 `게임이 아직 없습니다. 위 [게임 입력]에서 … 경기 전이라면 [자동 대진표]로 미리 짤 수도 있습니다.`(호스트). 호스트 액션에 [게임 입력 종료] **없음**(게임 0 — Week 63 U-10). 배너 `아직 등록된 게임이 없습니다. 참가자 누구나 게임 추가로 상대와 게임을 만들 수 있어요.`(U-13) | `roomGamesEmptyMessage(detail, { canLineup })` | B(각 1회) |
| 4.3 | D | 상세 헤더 | [게임 입력] 있음, [게임 추가] **없음**(미확정 로테이션), [자동 대진표] 없음(호스트 아님) | `canAddRoomGame` false, `lineupCandidates` 호스트만 | B |
| 4.4 | A | [자동 대진표] 1인당 `2경기`, 밸런스 `균형` | 미리보기 2게임(4명·2경기 → 2게임), 경고 `참가자 4명으로는 한 번에 1면만 돌릴 수 있습니다.`, **실효 1면이라 라운드 헤더 없이** `게임 1· 10:00`·`게임 2· 10:30`, 쉼 없음 | `buildRoomLineup courtCount=2`, `roundStartLabels` | B |
| 4.5 | A | [2경기 저장] | 게임 행 2개, 각 배지 `결과 미입력`, 팀 줄에 `나` 포함(A가 뛰는 게임) | `match_requests` 2행 origin lineup accepted, 관점 행 회원 4×2, negotiations none | B+S |
| 4.6 | A | 게임 1 [결과 입력] `6:4` → [확인 요청] | A 배지 `참가자 확인 대기` + `1/3명 확인` | `confirmed_by=[A]`, 좌석 회원 3 | B+S |
| 4.7 | B | 상세 | 게임 1: [결과 확인]·[이의 제기] 다이얼로그, 스코어 관점(파트너면 같은 값, 상대팀이면 반전). 다이얼로그 첫 줄은 **제안자 이름**(`남자01님이 제안한 결과 (내 관점)` — 상대팀 이름이 아니다, F-9), 행의 좌석 명단에 뷰어 본인이 실명으로 다시 나오지 않는다(`확인 대기: 나 · …`, F-10) | `swap_partner`/`invert` | B |
| 4.8 | B | [결과 확인] | B 배지 `확인 완료` + `2/3명 확인` + [이의 제기] 여전히 있음 | `ConfirmedSeatActions`, `canDisputeProposal` true | B+S |
| 4.9 | C | 확인 | `3/3`? — 좌석 셋이면 여기서 정산. **넷이면** 미정산 | 좌석 수는 `request_result_seats`(A·B·C·D 중 게임 1 참가자) — 4명 게임이면 4좌석, 정산은 D까지 | S 가능 |
| 4.10 | D | 상세 | 미확인이면 [결과 확인] 있음, `is_settled=false` | — | B+S |
| 4.11 | D | [결과 확인] | 게임 1 확정, 게임 2 남아 단계 `진행 중` | `settle_match_result` true | B+S |
| 4.12 | A | 명단 `남자02` 행 | [내보내기] **없음**(배정된 게임 있음). SQL로 `kick_room_member(B)` → `member_has_games` | `canKickRoomMember hasGames` ↔ RPC 가드 | B+S |
| 4.13 | A | 게임 2 제안 → B·C·D 확인(SQL 보조) | 게임은 전부 확정되지만 **방은 아직 미정산**(미확정 로테이션 세션이 남아 있다) — 단계 `진행 중`. **호스트에게만** 배너 `모든 결과가 확정됐습니다 — 게임 입력을 종료하면 매칭이 마무리됩니다` · 카드 필 `게임 입력 종료` · 뱃지 1, 풀 회원은 필 없음 · 뱃지 0(0077, F-11). **호스트가 어느 게임의 requester도 아닌 대진**(team1[0]이 B)으로도 같아야 한다 — 총계는 `room_game_tallies`(0088, F-21)가 방 전체를 준다 | `is_settled` = 대표 게임 확정 ∧ 미확정 세션 없음 | S |
| 4.14 | — | 각자 `/me/personal-matches` | 게임 2개 승·패 관점 맞음 | — | B(표본 2명) |
| 4.15 | A | [게임 입력 종료](confirm 수락) | 세션 삭제 → 정산 `종료`, 호스트 뱃지도 0(`closeRotation` 차례가 사라진다) | `close_rotation_room` → `recompute_match_room_settled` | B+S |

## S4b 혼합 복식 성별 배치 (A·B 남 · E 여자01 · F 여자02)

| # | 계정 | 조작 | 기대 | 검증 | 수단 |
|---|---|---|---|---|---|
| 4b.1 | A | 방 `E2E-S4B` 복식·종목 `혼합 복식`·10:00·2시간·1면, 초대 B·E·F → 수락(SQL) | 명단 4명, 세션 풀 3 | `respond_room_invite` | B+S |
| 4b.2 | A | [자동 대진표] 1인당 `1경기` | 미리보기 각 팀 남1여1(`남자01 · 여자01 vs 남자02 · 여자02` 형태), 성별 경고 없음 | `splitTeams` 혼복 분기(남2·여2) | B |
| 4b.3 | A | 참가자 칩에서 `여자01` 제외 | 남2·여1 → 인원 부족(3명 < 4) 경고로 게임 0개, 또는 인원이 되면 `혼합 복식 성별 구성을 맞추지 못했습니다` 경고 | `buildRoomLineup` 게이트·`isGenderMatched` | B |
| 4b.4 | A | `여자01` 복원 → [N경기 저장] | 요청 행 origin lineup, 관점 행 4개 | — | B+S |
| 4b.5 | A | 게임 1 [결과 입력] 6:3 → B·E·F 확인 | `1/4 → 4/4명 확인` → 확정. 제안자 이름·좌석 명단 표기를 F-9·F-10 기준으로 재관찰 | — | B(A·1명)+S |
| 4b.6 | A | [게임 입력 종료] | 정산 `종료` | `close_rotation_room` | B |

## S5 복식 로테이션 빌더 (A·B·C·D)

| # | 계정 | 조작 | 기대 | 검증 | 수단 |
|---|---|---|---|---|---|
| 5.1 | A | 방 `E2E-S5` 남자 복식·1면, 초대 B·C·D 수락 | 풀에 4명 | `rotation_sessions.players` 4 | B+S |
| 5.2 | B | [게임 입력] → 다이얼로그 `로테이션 게임 입력` → 게임 1: 파트너 C, 상대 A·D, 스코어 `6:3` → [게임 1개 저장] | 게임 행 1개(대표), B 관점 `승`? — **finalize는 상대 팀에 회원이 있으면 제안 상태로 시작** → 배지 `참가자 확인 대기` | `finalize_rotation_session` → `match_requests` accepted + propose, `group_seq=1` | B+S |
| 5.3 | A | 상세 | 배지 `결과 확인 대기`, [결과 확인] | — | B |
| 5.4 | A·D | 확인(둘 다 상대팀 좌석) | 정산되지 않음(세션이 열려 있음 — `is_settled`는 미확정 세션 있으면 false) | `recompute_match_room_settled` | B+S |
| 5.5 | A | [게임 입력] 두 번째 게임 준비 → **저장 전에** B가 SQL로 게임 하나 finalize | A 저장 시 `다른 참가자가 먼저 게임을 등록했습니다. 목록을 확인한 뒤 다시 저장해주세요.`, 팝업 유지 | `p_expected_seq` ≠ max+1 → `session_games_changed` stale | B+S |
| 5.6 | A | 팝업에서 목록 갱신 후 재저장 | 저장 성공, `group_seq` 증가 | — | B+S |
| 5.7 | A | [자동 대진표]도 여전히 보임 | 공존(Week 40 잔여 결정) | `canCreateRoomLineup` 방식 무관 | B |
| 5.8 | A | [게임 입력 종료](confirm 수락) | [게임 입력] 사라지고 [게임 추가] 등장, 빈 상태 문구 변경 | `close_rotation_room` → 세션 삭제 | B+S |
| 5.9 | B | [게임 입력] 없음, [게임 추가] 있음 | `canAddRoomGame` rotation finalized | B |
| 5.10 | — | 남은 제안 전부 확인 | 정산 | — | S |

## S6 강퇴 · 재초대 · 나가기 (A·B·C)

| # | 계정 | 조작 | 기대 | 검증 | 수단 |
|---|---|---|---|---|---|
| 6.1 | A | 방 `E2E-S6` 단식, 초대 B·C 수락. A–B 게임 1개 추가(결과 없음) | 명단 3명 | — | B |
| 6.2 | A | 명단 `남자03` 행 [내보내기](confirm 4줄 수락) | 명단에서 사라짐(강퇴 행 없음) | `kick_room_member` → `status='removed'` | B+S |
| 6.3 | C | 상세 URL | `RoomRemovedNotice` `호스트가 이 매칭에서 회원님을 내보냈습니다.`, 비밀번호 입력창 **없음** | `viewer.status='removed'` → RPC `not_member` | B |
| 6.4 | C | `/me/match-rooms` | 이 방 카드 없음, 뱃지 0 | 정산 축 목록에서 removed 제외 | B |
| 6.5 | C | `/match-rooms` 목록의 카드 | 칩 `내보내짐` | `viewerStatusLabel` | B |
| 6.6 | B | [회원 초대] 검색 `남자03` → [검색] | **행은 뜨되 비활성 + 칩 `내보내짐`**(참가자가 열면 재초대 불가 — 감추지 않고 이유를 보인다, Week 64·K-2) | `inviteRowState(id, members, false)` | B |
| 6.7 | A | [회원 초대] 검색 `남자03` → [검색] → 행 클릭(체크·칩 `내보내짐` 함께) → [1명 초대하기] | 팝업 닫힘, 명단 `남자03 초대 대기`(Week 64 — 호스트에게는 활성 행) | `invite_room_members` → `removed→invited` | B+S |
| 6.8 | C | 뱃지 1 → [참가 수락] | 복귀 `참가` | — | B |
| 6.9 | A | `남자02` 행 | [내보내기] **없음**(게임 배정) | `roomGameMemberIds` | B |
| 6.10 | A | `남자01`(본인) 행 | [내보내기] 없음 | `row.userId!==viewerId` | B |
| 6.11 | B | 상세 하단 | **배정된 경기가 있으면 [매칭 나가기] 버튼이 없다** — 대신 `배정된 경기가 있어 나갈 수 없습니다. 결과를 마무리하거나 호스트에게 대진 수정을 요청해주세요.`(0077, F-13·K-1) | `roomGameMemberIds(detail.games).has(viewer)` = RPC `room_member_has_games`의 거울 | B |
| 6.12 | B | SQL로 `leave_match_room` 직접 호출 | `leave_member_has_games`로 거절 — 화면을 우회해도 막힌다 | 0077 §3. 앱 문구는 `이미 배정된 경기가 있어 나갈 수 없습니다…` | S |
| 6.13 | C | 경기가 없는 참가자 C가 [매칭 나가기](confirm 수락) | `/match-rooms`로 이동, 명단에서 C 사라짐(`declined`), 방 카드는 「비밀번호 입장」 | `leave_match_room` → `declined`. 재입장은 `enter_match_room` | B+S |
| 6.14 | A | 헤더 | 호스트에게 [매칭 나가기] 없음 | `host_cannot_leave` | B |

## S7 비밀번호 입장 · 변경 (A · C)

| # | 계정 | 조작 | 기대 | 검증 | 수단 |
|---|---|---|---|---|---|
| 7.1 | A | 방 `E2E-S7` 남자 복식, 초대 없음 | 풀 비어 있음 | — | B |
| 7.2 | C | `/match-rooms` → 카드(칩 `비밀번호 입장`) 클릭 | `RoomGateView` 제목 `E2E-S7 · 남자 복식`, `비밀번호를 입력하면 참가자로 등록됩니다`, `호스트 남자01 · 참가 1명` | 비참가자 | B |
| 7.3 | C | `0000` → [입장] | `비밀번호가 일치하지 않습니다.` | `wrong_password` | B |
| 7.4 | C | `1234` → [입장] | 상세로 전환(URL 불변), 명단 `남자03 참가`, [게임 입력] 있음 | `enter_match_room` → joined + `rotation_sessions.players` append | B+S |
| 7.5 | A | [비밀번호 변경] → `새 비밀번호` `ab`(실패)·`abcd` → [변경] | `비밀번호는 4~20자…` 후 `비밀번호를 변경했습니다.` | `update_match_room_password` | B |
| 7.6 | B | 게이트에서 `1234` | 실패, `abcd` 성공 | `match_room_secrets` 갱신 | B |
| 7.7 | D | (비참가자) 상세 URL | 게이트. 게임 행·명단 상세 비노출 | — | B |

## S8 목록 · 뱃지 항등식 — S1~S7 전이마다 스냅샷

| # | 시점 | 확인 | 검증 |
|---|---|---|---|
| 8.1 | 초대 직후 | B `/me/match-rooms` 초대 섹션 1 + 뱃지 1 | `roomBadgeTotal(0, 1)` |
| 8.2 | 제안 직후 | 확인 차례인 계정: 필 `결과 확인`, 뱃지 1. 제안자: 필 `상대 대기`, 뱃지 0 | `isMyRoomTurn` |
| 8.3 | 이의 직후 | 제안자 필 `다시 입력`, 뱃지 1. 이의자 필 `상대 대기` | `reenterResult` |
| 8.4 | 정산 직후 | 카드 `마무리됨` 탭, 칩 `결과 확정`, 뱃지 0 | 정산 축 |
| 8.5 | 방 2개 이상 내 차례 | 뱃지 = 방 수(게임 수 아님), 카드 필에 `· N건` | 롤업 |
| 8.6 | `/match-rooms?tab=mine` | `/me/match-rooms`로 리다이렉트 | `tabs.ts` |
| 8.7 | `/me/match-requests` | `/me/match-rooms`로 리다이렉트 | Week 39·45 |
| 8.8 | `/me/personal-matches/new?room=<id>` | `/match-rooms/<id>` 리다이렉트 | — |
| 8.9 | 경기일 어제·미정산 방(SQL로 `played_at` 하루 전으로) | `/me/match-rooms` `진행 중`에 남고, `/match-rooms`는 `종료된 경기` | Week 45 두 축 |
| 8.10 | `/me/match-rooms` 첫 페이지 | 내 차례 방이 위(`sortByMyTurnFirst` — **참여 중인 매칭에만**, 전체 목록은 DB 커서 순) | — |

## S9 직접 기록 (A)

| # | 계정 | 조작 | 기대 | 검증 | 수단 |
|---|---|---|---|---|---|
| 9.1 | A | `/me/personal-matches` → [+ 직접 기록] | `/me/personal-matches/new`, 설명 `비회원과 친 경기를 내 기록에만 남깁니다…` | — | B |
| 9.2 | A | 단식, 상대 이름 `E2E상대`(비회원 입력)·손잡이·NTRP, 시각·표면, 메모 `E2E-S9` → [경기 저장] | 폼에는 **스코어 칸이 없다**(안내: `게임 스코어·승패는 저장 후 카드의 결과 입력에서 등록합니다`). 저장 후 `/me/personal-matches` 상단 `결과 입력 대기` 섹션에 카드 + [결과 입력] | `personal_matches` direct `set_scores=[]` | B+S |
| 9.3 | A | 새 기록: 상대 자동완성에서 `남자02` 선택 | **회원을 막지 않는다(0082)** — 안내 `회원과 함께 친 경기는 매칭으로 기록합니다. 저장하면 매칭 리스트에 뜨지 않는 비공개 매칭이 만들어지고 회원 1명에게 초대가 갑니다. …`, 폼에 `경기 시간 *`·`코트 면 수 *`가 나타나고 저장 버튼 라벨이 [매칭 만들고 초대]. 실제 저장·검증은 **S13** | `memberInDirect ∧ roomAutoCreate`, `createDirectRecordRoomAction` | B |
| 9.4 | A | 서버 축 — **수정** 화면에서만 회원이 막힌다: 9.2 기록의 [수정]에서 상대를 `남자02`로 바꾸면 `MemberBlockedInEditNotice` + 저장 잠금. 서버 `updatePersonalMatchAction`의 `requiresRoom` → `DIRECT_RECORD_MEMBER_ERROR`는 코드로 확인 | `memberBlockedInEdit` / `lib/actions/personal-matches.ts` `DIRECT_RECORD_MEMBER_ERROR` | B+코드 |
| 9.5 | A | (9.2와 같음 — 직접 기록은 언제나 스코어 없이 저장된다) | `PendingResultsSection` 필터 `!roomId ∧ enterResult` | — | B |
| 9.6 | A | 9.2 카드 [결과 입력] `6:2` | 즉시 확정 → 확정 카드 `승 6-2`, [수정]·[삭제], 섹션 사라짐 | `updatePersonalMatchSetsAction` | B+S |
| 9.7 | A | 로테이션 직접 기록: 복식·풀 비회원 4명 → 저장 | `결과 입력 대기`에 세션 카드 → 빌더로 게임 입력 → 즉시 확정 | 방 밖 세션, 좌석 없음 | B |
| 9.8 | A | 9.2 카드 [수정] → 상대 이름 변경 → 저장 / [삭제](confirm) | 반영·삭제 | RESTRICTIVE 잠금은 confirmation만 | B |
| 9.9 | A | 방 게임이 `결과 입력 대기`에 **오지 않는지** | S3에서 만든 방 게임(미확정 direct)이 있을 때 섹션에 없음 | `!p.match.roomId` | B |

## S10 권한 · 경계 모음

| # | 계정 | 조작 | 기대 | 검증 | 수단 |
|---|---|---|---|---|---|
| 10.1 | B | 정산된 S1 방 | [게임 입력]·[게임 추가]·[회원 초대]·[비회원 등록]·[자동 대진표] 없음(0077, F-5). [매칭 나가기]는 **배정된 경기가 없을 때만** 있다(F-13) | `isSettled` | B |
| 10.2 | A | 정산된 방에 SQL `create_room_lineup` | `room_already_closed` | 버튼 없음 ↔ 가드 | S |
| 10.3 | A | 정산된 방에 SQL `add_room_guest` | `room_already_closed` | — | S |
| 10.4 | A | [게임 추가]에서 상대에 본인 | 자기 자신 선택 불가(후보 제외) / SQL `create_room_game(self)` → `cannot_request_self` | — | B+S |
| 10.5 | A | 이미 참가한 B를 [회원 초대] | 비활성 행 + 칩 `참가` / SQL 호출 시 joined 유지(강등 없음) | `invite_room_members` on conflict | B+S |
| 10.6 | A | 방 밖 회원(D)을 [게임 추가] 상대로 SQL 호출 | `opponent_not_in_room` | — | S |
| 10.7 | A | 결과 있는 라인업 게임 id를 넣어 SQL `replace_room_lineup` | `lineup_locked` | S3.17 거울 | S |
| 10.8 | A | 게스트끼리 게임으로 SQL `create_room_lineup` | `invalid_games` | 0076 | S |
| 10.9 | A | 같은 사람 두 번으로 SQL `create_room_lineup` | `duplicate_players` | — | S |
| 10.10 | A | 매칭 만들기 비밀번호 21자 | `maxLength=20`이 잘라 20자만 들어간다(문구 없음). 길이 문구는 4자 미만에서 확인(1.2) | — | B |
| 10.11 | A | [게임 추가] 상대 비움 | [게임 저장] **비활성** — 모집 중(참가자 비움) 게임은 폼에서 만들 수 없다. `모집 중` 배지·[참가자 채우기]는 옛 seed/direct 행에서만 보인다 | `isLineupCompleteByRoles` | B |
| 10.12 | A | [매칭 리스트에서 내리기](confirm) | `/match-rooms`로, 방 카드 사라짐, 개인 기록은 남음. 그 URL을 다시 열면 404가 아니라 `내려간 매칭입니다` + [매칭 리스트로 돌아가기](F-14) | RLS delete, `room_id` null | B+S |
| 10.13 | B | 남의 방(비참가) 상세에서 SQL `leave_match_room` | `not_room_member` | — | S |
| 10.14 | C | 비로그인으로 상세 URL | `/login?next=` | middleware | B |

## S11 단식 회원 4명 자동 대진표 (A·B·C·D) — 2면 라운드 · 대진 편집

| # | 계정 | 조작 | 기대 | 검증 | 수단 |
|---|---|---|---|---|---|
| 11.1 | A | 방 `E2E-S11` 단식·10:00·2시간·**2면**, 초대 B·C·D → 수락(SQL) | 힌트 `10:00~12:00 · 코트 2면 · 30분 경기 기준 → 참가 예정 4명이면 1인당 4경기 권장`(단식 4명은 2면을 다 쓴다) | `effectiveCourtCount(4, singles, 2) = 2`, `recommendGames` | B+S |
| 11.2 | A | [자동 대진표] | 초기값 `4경기 · 권장`, 총 8경기. 미리보기가 **라운드로 묶임**: `1라운드 · 10:00` 아래 `1번 코트`·`2번 코트`, 한 라운드에 같은 사람 없음, 충돌 경고 없음, 4라운드 | `buildRoomLineup courtCount=2`, `groupByRound`, `roundConflictNames` | B |
| 11.3 | A | 1인당 `2경기` | 4경기·2라운드, 추천 블록(spot) + [권장값으로 맞추기] | — | B |
| 11.4 | A | 게임 1 [수정] → 상대를 다른 회원으로 → [완료] | 라운드 내 중복이 생기면 라운드 헤더에 경고(`roundConflictNames`), 아니면 정상 | Week 44·0075 | B |
| 11.5 | A | [4경기 저장] | 게임 목록이 **라운드 헤더**(`1라운드 · 10:00`, `2라운드 · 10:30` — 30분 슬롯)로 묶여 그려지고 행마다 `N번 코트` | `RoomGameRounds` 2면 분기, `derivedSlotMinutes` | B+S |
| 11.6 | A | [대진 편집] → 한 자리 교체 → 저장 | 라운드 묶음 유지, id 교체 | `replace_room_lineup` | B+S |
| 11.7 | A | 게임 1 [결과 입력] 6:4 → 상대 확인 | 확정. 나머지 3게임은 SQL로 제안·확인 | — | B+S |
| 11.8 | — | 정산 | `종료`(단식 방은 세션이 없어 곧바로) | `is_settled` | S |

## S12 매칭 닫기 · 다시 열기 (A 호스트 · B 참가자) — 0083, 정산된 S1 방 재사용

| # | 계정 | 조작 | 기대 | 검증 | 수단 |
|---|---|---|---|---|---|
| 12.1 | A | 정산된 방 상세 | 헤더 칩 `종료`, 안내 `모든 결과가 확정됐습니다 … 더 고칠 것이 없으면 [매칭 닫기]로 마감할 수 있습니다.`, 호스트 액션에 [매칭 닫기] | `isSettled` | B |
| 12.2 | B | 같은 방 | 참가자에게는 [매칭 닫기] 없음, 확정 게임 행에 [결과 정정] 있음 | — | B |
| 12.3 | A | 미정산 방(S5 등)의 호스트 액션 | [매칭 닫기] 없음 / SQL `close_match_room` → `room_not_settled` | 버튼 없음 ↔ 가드 | B+S |
| 12.4 | A | [매칭 닫기](confirm) | 칩 `마감`(채운 muted), 안내 `매칭이 마감되었습니다. … [다시 열기]로 잠금을 풉니다.`, 같은 자리에 [다시 열기], 게임 행의 [결과 정정] 사라짐 | `closedAt` | B |
| 12.5 | B | 같은 방 | 안내 `… 호스트에게 다시 열기를 요청하세요.`, [결과 정정] 없음 / SQL `reopen_match_result` → `room_closed` | `canReopenResult(c, { roomClosed })` | B+S |
| 12.6 | B | 참여 중인 매칭 · 매칭 리스트 | 카드 필 `마감`(`결과 확정` 대신), 뱃지 변화 없음(닫기는 차례를 만들지 않는다) | — | B |
| 12.7 | B | 내 경기 결과의 그 방 게임 카드 | 배지 `마감`(`상호 확인` 대신), [결과 정정]·[수정]·[삭제] 없음. 호스트 자유 기록 카드도 같음 | `roomClosedAt` | B |
| 12.8 | A | 호스트 소유 자유 기록의 `/me/personal-matches/[id]/edit` URL 직접 진입 | 방 상세로 리다이렉트 / SQL 소유자 DELETE → 정책 0행, security definer 경로는 `room_closed` | `isRoomClosed` · 0083b 트리거 | B+S |
| 12.9 | A | SQL `kick_room_member`·`enter_match_room`·`invite_room_members`·`replace_room_lineup(p_game_ids=[])` | `room_closed` · `room_closed` · `room_already_closed` · `room_already_closed` | 노출 ↔ 가드 | S |
| 12.10 | C | 초대만 걸린 채 닫힌 방의 초대 카드에서 [참가 수락] | 수락된다(닫혀도 초대 응답은 막지 않는다 — 뱃지가 영영 남는 것을 막기 위해) | `respond_room_invite` | B |
| 12.11 | A | [다시 열기](confirm) | 칩 `종료`, [매칭 닫기] 복귀, B의 [결과 정정] 복귀 → B가 정정하면 방이 미정산으로 돌아가고 [매칭 닫기]가 사라진다 | `reopen_match_room` → recompute | B |
| 12.12 | B | SQL `reopen_match_room` | `not_room_host` / 열린 방에 다시 호출 → `room_not_closed` | — | S |

## S13 비노출 방 — 직접 기록에 회원이 끼면 (A 호스트 · B 회원 · C 비참가) — 0082

| # | 계정 | 조작 | 기대 | 검증 | 수단 |
|---|---|---|---|---|---|
| 13.1 | A | `/me/personal-matches/new` 단식, 상대 자동완성 `남자02`, 코트명 `E2E-S13`, 시각 `10:00`, 표면 아무거나 | 안내 `회원과 함께 친 경기는 매칭으로 기록합니다. 저장하면 매칭 리스트에 뜨지 않는 비공개 매칭이 만들어지고 회원 1명에게 초대가 갑니다. …`, `경기 시간 *`(기본 2시간)·`코트 면 수 *`(1면) 등장, 버튼 [매칭 만들고 초대] | `roomAutoCreate`, `RoomScheduleFields` | B |
| 13.2 | A | [매칭 만들고 초대] | `/match-rooms/<id>?notice=direct_room` 착지, 상단 `비공개 매칭을 만들고 초대를 보냈습니다.`, 헤더 배지에 `비공개`, 명단 `남자01 호스트`·`남자02 초대 대기`, 단계 칩 `모집 중` | `createDirectRecordRoomAction` → `create_match_room(p_listed=false)`; SQL `match_rooms.is_listed=false`, `court_name='E2E-S13'`, `match_room_secrets` **0행**, 단식 seed `personal_matches` 삭제됨(0행) | B+S |
| 13.3 | A | 호스트 액션 | [비밀번호 변경] **없음**, [매칭 삭제](「매칭 리스트에서 내리기」 대신) 있음, [게임 추가]·[회원 초대]·[비회원 등록]·[자동 대진표] 있음 | `isListed=false` 분기 `room-host-actions.tsx:77` | B |
| 13.4 | A·B | `/match-rooms` 두 탭 | 이 방 카드 **없음**, `진행 중인 경기` 탭 숫자에도 포함되지 않음 | `listedOnly:true`, `fetchOpenRoomCount(listedOnly)` | B |
| 13.5 | B | 뱃지 1 → `/me/match-rooms` | `나를 초대한 매칭`에 `E2E-S13 · 단식` 카드. [참가 수락] → 명단 `참가`, `진행 중` 탭 카드에 칩 `비공개` | `respond_room_invite`, `match-room-card.tsx:55` | B+S |
| 13.6 | C | 상세 URL 직접 접근 | `RoomUnlistedNotice` `초대받은 사람만 볼 수 있는 매칭입니다.` + `직접 기록에서 만든 비공개 매칭이라 매칭 리스트에 오르지 않고 비밀번호 입장도 없습니다.` — 비밀번호 입력창 **없음** | `RoomGateView` `!summary.isListed` | B |
| 13.7 | C | SQL `enter_match_room(room, '1234')` | `room_not_listed`(뒷문 없음) | 0082 가드 | S |
| 13.8 | A | SQL `update_match_room_password(room, 'abcd')` | `room_not_listed`(upsert 뒷문 차단) → `match_room_secrets` 여전히 0행 | 0082 | S |
| 13.9 | A | [게임 추가] 상대 `남자02` → 결과 입력 → B 확인 | S1과 같은 협상 흐름이 비노출 방에서도 동작, 정산 `종료` | `is_settled` | B+S |
| 13.10 | B → A → B | (변형) 새 비노출 방 `E2E-S13B`에서 초대 [거절] → 호스트 [회원 초대] 검색 `남자02` → [검색] → 행 클릭 → [1명 초대하기] → B 「나를 초대한 매칭」 → [수락] | 거절 뒤 명단에서 사라짐(declined) → 호스트 검색에 **활성 행 + 칩 `나감`**(참가자 검색에는 비활성 `나감`) → 명단 `초대 대기` → B 수락 후 `참가 2명`. SQL: `invite_room_members`가 호스트 호출에서만 declined→invited(0088, F-22) | `respond_room_invite(false)`, `inviteRowState(id, members, canReinvite)` | B+S |
| 13.11 | A | 복식 변형: 직접 기록 복식(로테이션) 풀에 회원 `남자02` + 비회원 `E2E게스트1`·`E2E게스트2` → [매칭 만들고 초대] | 비노출 로테이션 방, `rotation_sessions` seed 유지(players 빈 풀), 게스트 2명은 `match_room_guests`에 즉시 등록, B 초대 대기 | `add_room_guest` 경로, `?notice=direct_room` | B+S |
| 13.12 | A | 13.11을 한 번 더 하되 저장 전에 SQL로 같은 이름 게스트를 그 방에… (방이 아직 없어 불가) → 대신 회원 초대 대상에 탈퇴자를 넣을 수 없으므로 **부분 실패는 코드 확인** — `direct-record-room.ts`의 `?notice=invite_failed` 분기와 배너 문구 `매칭은 만들어졌지만 초대에 실패했습니다.` | 부분 실패 경로 | 코드 |
| 13.13 | — | 정리 SQL | `court_name like 'E2E-%'`가 비노출 방도 잡아 0건 | README | S |

## S14 협상 상태 전이 전수 (단식 A·B / 복식 A·B·C·D · 방관자 E)

> 상태 4(none·proposed·disputed·confirmed) × 동작 4(propose·confirm·dispute·reopen)를 단식·복식에서 전부 밟는다. 각 전이 뒤 **S8 스냅샷**(필·뱃지)을 함께 적는다. 방 `E2E-S14S`(단식, A–B 게임 4개)·`E2E-S14D`(남자 복식, 대진 A+B vs C+D 게임 3개 + E 참가만).

| # | 계정 | 조작 | 기대 | 검증 | 수단 |
|---|---|---|---|---|---|
| 14.1 | A | 단식 게임 1: A 제안 6:1 → B 확인 | `none→proposed→confirmed`, 진행 배지 없음(좌석 2는 `formatConfirmProgress` 빈 문자열), 정산 아님(게임 남음) | `confirmed_by=[A]→[A,B]` | B+S |
| 14.2 | A | 게임 2: A 제안 → A [제안 수정] 6:2 | 여전히 proposed, `confirmed_by=[A]`. B 화면 스코어 갱신 | `normalize_result_confirmations` | B+S |
| 14.3 | B | 게임 2: B [이의 제기] **사유 없음** → A [다시 입력] 6:3 → B 확인 | `disputed(dispute_count=1, reason null)→proposed→confirmed`, 카드 `ReentryContextBadge`(이의 후 재입력) 표시, 사유 줄 없음 | `hasDisputeHistory` | B+S |
| 14.4 | B | 게임 3: A 제안 → B 이의(사유 `한 번 더`) → A 재제안 → B 이의(사유 `두 번째`) → A 재제안 → B 확인 | `dispute_count=2`, 마지막 사유 줄 `남자02님 이의 사유: 두 번째`(이력 보존), 확정 | 0061·0062 | B+S |
| 14.5 | A | 게임 3 확정 후 [결과 정정] 사유 `정정` → **B**가 [다시 입력](이의자가 아닌 좌석도 재입력 가능한지) | reopen → `disputed`, `dispute_count=3`, `set_scores=[]` 양쪽. B 제안 → A 확인 → 확정 | `reopen_match_result`, `isReentryTurn` | B+S |
| 14.6 | B | 게임 4 **동시성**: A가 [결과 입력] 팝업을 열어 둔 사이 B가 SQL `propose_match_result` 6:4 → A [확인 요청] | 팝업이 닫히지 않고 **B의 제안을 검토하는 모드로 갱신**(`남자02님이 제안한 결과 (내 관점)` + [결과 확인]/[이의 제기]) — 오류 문구 없이 곧바로 확인 차례가 된다(stale → refresh) | `STALE_KEYS`, `use-result-dialog.ts:34` | B+S |
| 14.7 | B | 게임 4에서 A가 확인한 뒤 B가 SQL `confirm_match_result` 재호출 | `result_not_proposed`(정산 뒤 상태가 confirmed라 proposed 검사에서 먼저 걸린다) | 멱등 가드 | S |
| 14.8 | A | 단식 방 정산 → `종료` | 게임 4개 전부 confirmed, `is_settled=true` | — | S |
| 14.9 | A | 복식 게임 1: A 제안 6:0 | A 배지 `참가자 확인 대기` + `1/3명 확인`; B(파트너) 스코어 같음, C·D(상대) 반전 0:6 | `swap_partner`/`invert` | B |
| 14.10 | B | B 확인 → **B [이의 제기]**(확인한 좌석의 이의, 사유 `파트너 이의`) | 확인 후 `ConfirmedSeatActions`(`확인 완료` + [이의 제기])가 보이고, 이의하면 `disputed`, `disputed_by=[B]`, A 화면 배지 `남자02님 이의`, A에게 `다시 입력` 차례 | `canDisputeProposal`(확인해도 정산 전이면 가능) | B+S |
| 14.11 | A | 재제안 6:1 → B·C·D 확인(C·D는 SQL) | `2/3→3/3`에서 게임 1 confirmed(방은 게임이 남아 미정산). **D가 확인하기 전 C가 다시 SQL confirm** → `result_already_confirmed_by_seat` | 좌석 만장일치 | B+S |
| 14.12 | E | 게임 1~3 행(E는 참가자지만 좌석 아님) | 상태 배지만(`결과 미입력`·`결과 확인 대기`·`이의 제기`) — 룸 행은 액션 영역 배지를 그리지 않는다(F-4). 버튼 없음, E 뱃지 0 | `isRoomGameParty` false | B |
| 14.13 | A | 게임 2: A 제안 → **탈퇴자 분모** — SQL 트랜잭션 안에서 D에 `deleted_at=now()`를 넣고 `request_result_seats`가 3→2로 주는지 확인 → rollback | 분모에서 탈퇴자 제외, `counterpart_deleted`는 상대 **전원** 탈퇴 시에만 | `begin; … rollback;` | S |
| 14.14 | A | 게임 2·3 정상 확정 → 세션 남아 `진행 중` → A [게임 입력 종료] → `종료` | F-11 회귀 | `closeRotation` | B+S |
| 14.15 | A | 정산된 복식 방에서 [결과 정정] → B·C·D 재확인 → 정산 복귀 | 복식 reopen 왕복 | — | B+S |
| 14.16 | — | 각 전이의 S8 스냅샷 표(runs.md에 기록) | 제안 직후: 확인 차례 좌석 뱃지 1(방 1) · 이의 직후: 제안자 1 · 확정 직후: 0 · 방관자 E 항상 0 | `roomBadgeTotal` | B |

## S15 권한 매트릭스 — 화면 축 (S10의 거울)

> S10은 SQL 축(가드 키) 위주였다. 여기서는 **행위자별로 화면에 무엇이 없어야 하는지**를 보고, 없는 버튼마다 RPC 거절 키를 짝지어 「노출 = 가드」를 화면에서 확인한다. 방 `E2E-S15`(단식, A 호스트, B 참가, C 초대 대기, D 비참가).

| # | 계정 | 조작 | 기대 | 검증 | 수단 |
|---|---|---|---|---|---|
| 15.1 | B | 참가자 화면의 호스트 액션 바 | [비밀번호 변경]·[매칭 닫기]·[매칭 리스트에서 내리기]·[자동 대진표]·[대진 편집]·[게임 입력 종료] **전부 없음**. 있는 것: [게임 추가]·[회원 초대]·[비회원 등록]·[매칭 나가기]. [+ 매칭 만들기]는 두 목록 화면 **탭 바 위** 테두리 칩(Week 54) | `isHost=false` | B |
| 15.2 | B | SQL 6종: `update_match_room_password`·`close_match_room`·`create_room_lineup`·`replace_room_lineup`·`close_rotation_room`·`kick_room_member` | `not_host` / `not_room_host` / `not_room_host` / `not_room_host` / `not_room_host` / `not_room_host`; 방 삭제는 RLS 0행 | 노출 ↔ 가드 | S |
| 15.3 | C | 초대 대기 상태로 상세 | 배너 [참가 수락]/[거절] + 하단 [매칭 나가기](U-7 — 거절과 같은 뜻). [게임 추가]·[회원 초대]·[비회원 등록]·명단 액션 **없음** | `isMember=false` | B |
| 15.4 | C | SQL `create_room_game`·`invite_room_members`·`add_room_guest` | `not_room_member` ×3 | — | S |
| 15.5 | D | 비참가 회원의 상세 | 게이트(비밀번호). SQL `create_room_game`·`leave_match_room` → `not_room_member` | — | B+S |
| 15.6 | A | **정산됐지만 안 닫힌 방**의 호스트 자유 기록(S3 방식으로 게스트 상대 게임 1개를 확정): `/me/personal-matches` 카드 [수정] → 상대명 변경 저장 / [삭제] | 저장·삭제가 **된다** → 방이 미정산(`진행 중`)으로 되돌아가거나 마지막 행이면 방이 지워진다(cleanup 트리거). K-9 잔여 — 의도인지 판정해 F-pre-9 상태 결정 | `personal_matches_update/delete` 정책은 닫힌 방만 뺀다(0083) | B+S |
| 15.7 | A | 마감 방의 그 카드 | [수정]·[삭제] 없음 + 배지 `마감`; `/edit` URL → 방으로 리다이렉트 | 12.7·12.8 회귀 | B |
| 15.8 | A | 매칭 만들기에서 회원 검색 1자 + Enter / 21명 선택 시도 | 1자로 조회된다(Week 64 — Enter는 폼을 제출하지 않는다, 결과 21건 이상이면 `20명까지만 보입니다…` 안내). 20명에서 입력창은 남고 고르지 않은 행만 비활성, `한 번에 20명까지 초대할 수 있습니다. 나머지는 룸에서 추가로 부를 수 있습니다.`(회원이 20명 안 되면 SKIP + 사유) | `MIN_USER_SEARCH_LENGTH`·`USER_SEARCH_LIMIT`, `MATCH_ROOM_INVITE_MAX` | B |
| 15.9 | A | 룸 안 [회원 초대] 검색에서 본인·게스트·이미 참가자·초대 대기 | 본인·게스트는 결과에 없음(쿼리가 뺀다), 참가자·초대 대기·호스트는 **비활성 행 + 칩**(`참가`·`초대 대기`·`호스트`) | `queryUsers`, `inviteRowState` | B |
| 15.10 | 비로그인 | `/match-rooms/new`·`/me/match-rooms`·상세 URL | 전부 `/login?next=`(next 인코딩 보존) | middleware | B |


## S16 알림 (A 호스트 · B 참가자 · C 초대 대기) — 0094, Week 71

> 방 `E2E-S16`(단식, 내일 10:00, 120분). 헤더 종 = "일어난 일", 사이드바 뱃지 = "내가 할 일". 문구는 `lib/notifications/labels.ts`가 정본이라 여기서는 **누가 받는가**와 **어디로 가는가**만 본다.

| # | 계정 | 조작 | 기대 | 검증 | 수단 |
|---|---|---|---|---|---|
| 16.1 | A | 매칭 만들기에서 B·C 초대 | B·C 종 `1`(「매칭 초대」, 방 한 줄 `9월 N일 10:00~12:00 · E2E-S16 · 단식`), A 종 0(행위자 제외) | T1 INSERT invited | B·C |
| 16.2 | B | 종 → 항목 클릭 | 룸으로 이동 + 종 0(낙관적) + 새로고침해도 0 | `mark_notifications_read` | B |
| 16.3 | B | 룸 배너 [참가 수락] | A 종 「참가 수락」(B) | T1 invited→joined | A |
| 16.4 | C | [거절] | A 종 「초대 거절」(C) | T1 invited→declined | A |
| 16.5 | D | 비밀번호 입장 | A 종 「새 참가자」(D) | T1 INSERT joined | A |
| 16.6 | D | [매칭 나가기] | A 종 「참가자 나감」(D) | T1 joined→declined | A |
| 16.7 | A | [게임 추가] A vs B → [결과 입력] | B 종 「결과 입력됨 … 24시간 동안 이의가 없으면 자동 확정」, A 종 없음 | T2 →proposed | B |
| 16.8 | B | [이의 제기](사유) | A 종 「이의 제기 … 사유: …」 | T2 proposed→disputed | A |
| 16.9 | A | [다시 입력] → B [결과 확인] | B 종 「결과 다시 입력됨」 · A 종 「결과 확정」(B) | T2 재제안 revised · proposed→confirmed(uid) | A·B |
| 16.10 | B | [결과 정정](사유) → A 재입력 → B 확인 | A 종 「결과 정정 요청」 → B 종 「결과 다시 입력됨」 → A 「결과 확정」 | T2 confirmed→disputed | A·B |
| 16.11 | A | [매칭 닫기] | B 종 「매칭 마감」, A 없음 | T3 closed_at | B |
| 16.12 | A | 다른 방에서 [자동 대진표] 저장 / [대진 편집] 저장 | 참가자 종 「대진표 나옴 (N게임)」 **1건**(게임 수와 무관) / 「대진표 변경」 1건 | RPC 말미 방출 | 참가자 |
| 16.13 | A | [매칭 리스트에서 내리기] | 참가자·초대 대기 종 「매칭 취소」, 항목 클릭 → `/me/match-rooms`(폴백 — room_id null), 방 한 줄은 그대로 보인다(payload 스냅샷) | T3 BEFORE DELETE | B |
| 16.14 | B | [전체 보기] → `/me/notifications` → [모두 읽음] | 최근 50건, 안 읽은 점 사라짐, 버튼 비활성 | `fetchNotificationList` | B |
| 16.15 | 비로그인 | 헤더 | 종 없음 | `inbox=null` | — |
| 16.16 | S | anon으로 `select * from notifications` / `rpc mark_notifications_read` | 둘 다 거부(permission denied) | RLS·revoke | S |

## S17 초대 만료 · 예약 알림 · 자동 확정 (A 호스트 · B 참가자 · C 초대 대기) — 0094~0095, Week 71

> 시각은 dev `execute_sql`로 조작한다(`played_at`·`played_time`·`proposed_at`·`disputed_at`) — 크론을 기다리지 않고 `select public.run_notification_jobs()`를 직접 부른다. **prod에서는 하지 않는다.** 방 `E2E-S17`.

| # | 계정 | 조작 | 기대 | 검증 | 수단 |
|---|---|---|---|---|---|
| 17.1 | S | 방을 오늘, `played_time` = 지금+1h로 → jobs | C 종 「초대에 응답해 주세요 … 2시간 뒤 시작」 1건, 두 번 돌려도 1건 | J1 dedupe | S+C |
| 17.2 | S | `played_time` = 지금−30m → jobs | C 종 「… 지금 시작합니다」 추가(합 2) | J2 | S+C |
| 17.3 | S | 방을 어제로 → jobs | A 종 「초대 만료 — C님이 응답하지 않았습니다」, 참가자 전원(A·B) 종 「내일 매칭」(D-1이 어제 20:00이라 창 안) | J3·J4 | S+A |
| 17.4 | C | 「나를 초대한 매칭」·사이드바 뱃지 | 이 방의 초대 카드 **없음**, 뱃지에서 빠짐 | `isInviteExpired` | C |
| 17.5 | C | 상세 URL 직접 | 배너 대신 「종료된 매칭이라 초대를 수락할 수 없습니다」 | `RoomInviteExpiredNotice` | C |
| 17.6 | S | C로 `respond_room_invite(room, true)` / `(room, false)` | `invite_expired` / 통과(거절은 허용) → A 종 「초대 거절」 | 0094 가드 | S |
| 17.7 | S | 게임 A vs B 결과 없음, 방 어제 → jobs | A·B 종 「결과를 입력해 주세요」 | J5 종료+3h | S |
| 17.8 | S | A가 결과 입력, 방 **이틀 전**, `proposed_at` = 지금−13h → jobs | B 종 「곧 자동 확정됩니다」, 상태 여전히 proposed | J6 | S+B |
| 17.9 | S | `proposed_at` = 지금−25h → jobs ×2 | 상태 confirmed, 관점 행 스코어 채움, 방 정산, A·B 종 「결과 자동 확정 … [결과 정정]」(actor null), 두 번째 호출은 아무것도 안 함 | J7 | S+A |
| 17.10 | B | 룸에서 [결과 정정] | 가능(자동 확정의 되돌리기) → A 종 「결과 정정 요청」 | `canReopenResult` | B |
| 17.11 | S | 다른 게임: B 이의, `disputed_at` = 지금−25h → jobs | A 종 「결과를 다시 입력해 주세요」 | J8 | S+A |
| 17.12 | S | 방을 열흘 전으로 → jobs | 예약 알림 **0건**(2일 유효창) | 창 규칙 | S |
| 17.13 | S | `select * from cron.job` / `cron.job_run_details` | `notification_jobs`(*/10)·`notification_cleanup`(10 18) active, 최근 실행 succeeded | pg_cron | S |

## 회귀 고정 행 (이력에서 E2E가 잡았던 것)

| 근거 | 시나리오 행 |
|---|---|
| Week 53 · 0082 직접 기록에 회원이 끼면 비노출 방 | 9.3·13.1~13.13 |
| Week 53 · 0083b cleanup 트리거가 닫힌 방을 먼저 지우던 것 | 12.8 |
| Week 54 · 호스트·매칭 어휘, [+ 매칭 만들기] 탭 바 위 | 1.5·1.12·6.5·12.1·12.4·15.1 |
| Week 44 · 0075 저장 순서(라운드 중복) | 4.4·4.5 |
| Week 44 · 팝업 영문 Close 없음 | 3.8(자동 대진표)·3.15(대진 편집) 팝업 하단에 `Close` 없음 |
| Week 45 · 뱃지 vs 탭 축 | 8.4·8.9 |
| Week 46 · '나' 대칭 | 1.14·1.15 |
| Week 47 · 초기값 = 권장 | 3.8 |
| Week 48 · 0076 회원 1명 대진 | 3.8·3.14 |
| 0072 · 로테이션 방 자동 대진표 | 4.4·5.7 |
| Week 71 · 0094 초대 만료 = 종료 시각(시드 치환 없인 방이 정산되지 않는다) | 17.4~17.6 |
| Week 71 · 0095 자동 확정 deadline은 방 종료 기준(어제 끝난 방은 오늘 같은 시각까지 대기) | 17.8·17.9 |
