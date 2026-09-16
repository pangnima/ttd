# E2E 결함 대장

> 심각도 — **P1** 오류(저장 실패·크래시·교착·데이터 어긋남) · **P2** 어긋남(화면 문구≠상태, 버튼은 있는데 서버가 거절 또는 그 반대, 뱃지≠카드 수) · **P3** 개선(문구·UX·누락 안내).
> 상태 — `open` / `planned`(수정 계획 있음) / `fixed(<커밋>)` / `wontfix(사유)` / `known`(기지 백로그, 재현되면 `confirmed`).
> ID — 발견 순 `F-<n>`, 코드 조사 선등록 `F-pre-<n>`, 기지 `K-<n>`.

## 수정 계획 요약 (2026-09-15 Week 62 전 구간 실행 뒤) — **완료 (2026-09-16 Week 63)**

수정 커밋: ① `ea33447`(F-15·**F-27**, 0087) · ② `e9d682e`(F-19·F-pre-4·U-6·U-4) · ③ `86f97ee`(F-21·F-22, 0088) · ⑤ `6167f7e`(P3 8건, 0089) · ④ `5339f9f`(F-23·U-11) + `26b2e70`(F-24, 0090) · ⑥ UX(아래 커밋). 마이그레이션 번호가 계획과 다르다 — ①에서 **F-27(avatars 버킷 부재)** 이 드러나 0087을 썼고 나머지가 하나씩 밀렸다. 재실행 기록은 `runs.md` 「2026-09-16 재실행」.

P1 1건 · P2 5건 · P3 8건 · UX 14건 + 선등록 4건. 코드·DB는 아직 손대지 않았다. 묶음 제안:

| 묶음 | 항목 | 손댈 곳 | 회귀 가드 | 마이그레이션 |
|---|---|---|---|---|
| **① 가입 차단(P1)** | F-15 사진 1MB 한계 | `next.config.ts` `experimental.serverActions.bodySizeLimit: '6mb'`, `avatar-upload-field.tsx`·`profile-avatar-field.tsx` 클라 크기 검증 + 문구, `signupAction`·`updateProfileAction` 서버 크기 검사 | A1·A6.6 재실행(1.5MB·6MB) | 없음 |
| **② 인증·미들웨어(P2)** | F-19 서버 액션 POST 리다이렉트 / F-pre-4 가입 착지 `/clubs` / U-6 완료 신호 | `lib/supabase/middleware.ts`(POST 또는 `next-action` 헤더면 auth-route 리다이렉트 건너뜀) / `auth.ts:206` 착지를 `personalNavHref`로 + `?notice=welcome` / 온보딩 버튼 라벨 | A8.5 재현(뒤로 가기 → 구글), A1.13 | 없음 |
| **③ 뱃지·차례 정합(P2)** | F-21 호스트 종료 차례 누락 / F-22 비노출 방 거절 영구 차단 | `room-queue.ts fetchRoomGameTallies` → SECURITY DEFINER 집계(`get_match_room_detail` games 총계 재사용 또는 `room_game_tallies`) / `invite_room_members`가 declined도 invited로 복귀(removed 관용구) + `inviteExcludedUserIds` | `room-turn.test` 케이스(호스트 비requester), S4.13·S13.10 재실행, 롤백 스모크 | F-22는 RPC 변경(0087) |
| **④ 타인 프로필·통계(P2·P3)** | F-24 타인 요약이 개인 전적 미표시 / F-23 NTRP 대비 카드 클럽 전용 / U-11 손잡이 카운트 | `PlayerStatsSection`을 `personal_matches` 기반으로(공개 시) — 상대 관점 행 접근은 RPC / `aggregateByNtrpDiff`에 개인 경기 + `ntrp_snapshot` | `analytics/*.test` 케이스, R3·R4 재실행 | 새 RPC 가능성 |
| **⑤ 문구·표시(P3)** | F-16 같은 비번 매핑 / F-17 가입 실패 보존 2필드 / F-18 닉네임 문구 중복 / F-20 disputed 배지 둘 / F-25 탈퇴자 이름 불일치 / F-pre-5·6 에러 맵 키 / F-pre-8 탈퇴자 프로필 기본값 / F-26 내려진 방 세션 잔존 | 각 행 참조 | 해당 시나리오 행 재실행, `error-map.test` | F-26은 cleanup 트리거 변경 |
| **⑥ UX(improvements.md)** | U-1~U-14, U-pre-1~4 | 대부분 S 규모 — 문구·노출 조건 | — | 없음 |

순서 제안: ① → ② → ③ → ⑤ → ④ → ⑥. ③·④는 마이그레이션·RPC가 들어가므로 별도 승인. 재실행은 `runs.md`에 「재실행」 행으로.

## 발견 — Week 62 전 구간 실행

| ID | P | 시나리오 | 증상(실제) | 기대 | 원인(파일·함수) | 수정 계획 | 상태 |
|---|---|---|---|---|---|---|---|
| F-15 | **P1** | A6.6·A1 | 프로필 사진으로 **1MB를 넘는 파일**(1.5MB·6MB PNG로 재현)을 올리고 저장하면 서버 액션이 `Body exceeded 1 MB limit`로 터진다. 설정 화면은 `(main)/error.tsx`(「화면을 불러오지 못했습니다」 + Next.js 영문 원문), **가입 폼은 global-error**(「예기치 못한 오류가 발생했습니다」)로 떨어져 입력이 전부 사라진다. 화면 문구는 「최대 5MB」 | 5MB까지 저장되거나, 넘으면 필드 옆 문구로 거절 | `next.config.ts`에 `experimental.serverActions.bodySizeLimit` 미설정(기본 1MB) + `profile-avatar-field.tsx`·`avatar-upload-field.tsx`에 크기 검증 없음 | ① `bodySizeLimit: '6mb'` ② 클라 `file.size > 5MB` 선검증 + 문구 ③ 서버 액션도 크기 검사(방어선) — 휴대폰 사진은 대부분 1MB 초과라 **실사용 가입 차단** | fixed(ea33447) |
| F-16 | P3 | A7.2 | 비밀번호 변경에서 새 비밀번호가 현재와 같으면 「오류가 발생했습니다. 잠시 후 다시 시도해 주세요.」 | 「기존 비밀번호와 다른 비밀번호를 입력해 주세요.」 | `auth-error-messages.ts:24` 매핑 키 `same as the old password`가 Supabase 실제 메시지(`New password should be different from the old password.`)와 다르다 | 매핑 키를 `different from the old password`로(둘 다 두면 안전) | fixed(6167f7e) |
| F-17 | P3 | A1.12 | 가입 폼이 서버에서 거절되면(닉네임 충돌) 텍스트 필드·토글은 남는데 **라켓 「기타」 브랜드명과 개인정보 동의 체크가 초기화**된다 | 전 필드 보존 | `racket-field.tsx`의 `racket_other`·`signup-form.tsx`의 `agree_privacy`가 uncontrolled(Week 52 보존 수정에서 빠짐) | 두 필드를 state로 | fixed(6167f7e) |
| F-18 | P3 | A1.12 | 서버 거절 뒤 닉네임 칸 아래 「사용 가능한 닉네임입니다.」(클라 debounce 결과)와 「이미 사용 중인 닉네임입니다.」(서버)가 **동시에** 보인다 | 서버 응답이 오면 클라 문구를 지우거나 서버 문구로 대체 | `NicknameField`의 availability 상태가 서버 에러와 독립 | 서버 에러 수신 시 availability 초기화 | fixed(6167f7e) |
| F-19 | P2 | A8.5 | 세션이 있는 상태로 남아 있는 `/login`(뒤로 가기로 돌아온 bfcache 페이지, 또는 다른 탭에서 로그인한 뒤)에서 [Google로 계속하기] 또는 [로그인]을 누르면 `An unexpected response was received from the server.`(dev 오버레이 / prod는 전역 오류). 사용자 재현: 구글 재가입 완료 → 뒤로 가기 → 구글 버튼 | 로그인돼 있으면 조용히 프로필로 이동 | `lib/supabase/middleware.ts:70` `isAuthRoute && user`가 **서버 액션 POST까지** 307으로 돌려 액션 응답이 HTML이 된다. 같은 구조로 보호 라우트에서 **세션 만료 뒤 제출하는 모든 서버 액션**도 `/login` 307을 받아 같은 오류가 난다(미실측) | 미들웨어에서 `request.method === 'POST'`(또는 `next-action` 헤더)면 리다이렉트하지 않고 통과 → 액션 안에서 로그인 여부를 판단해 `redirect()` | fixed(e9d682e) |
| F-20 | P3 | S2.4·S2.6·S2.11 | 룸 게임 행이 disputed 상태에서 배지가 둘 — 상태 배지 `이의 제기`(`roomGameStatusBadge`) + 액션 영역 `내가 이의 제기`/`남자02님 이의`(`DisputedResultActions`). F-4가 proposed 상태의 중복(`결과 확인 대기`+`참가자 확인 대기`)만 걷어냈다 | 행마다 배지 하나 — 상태 배지를 감추거나 액션 배지에 이의자 정보를 합친다 | `room-game-row.tsx` + `disputed-result-actions.tsx` | F-4와 같은 방식(`hideBadge`) | fixed(6167f7e) |
| F-21 | **P2** | S4.13 | 로테이션 방의 게임을 전부 확정한 뒤 **호스트가 requester가 아닌 게임이 있으면** 「참여 중인 매칭」 카드에 `게임 입력 종료` 필이 없고 뱃지도 0 — 상세 배너는 `모든 결과가 확정됐습니다 — 게임 입력을 종료하면…`를 말해 **뱃지 = 강조 카드 수 항등식과 배너·카드 정합이 깨진다**. Week 50 재실행(F-11)은 A가 requester인 1게임 픽스처라 통과했다 | 호스트 뱃지 1 + 필 `게임 입력 종료` | `room-queue.ts:55 fetchRoomGameTallies`가 `personal_matches`를 `is_perspective=false`로 세는데 RLS(본인 행만)라 호스트가 소유하지 않은 대표 행은 0으로 잡힌다(자동 대진표는 team1[0]을 requester로 삼아 호스트가 안 뛰거나 뒷자리인 게임이 흔하다) | 대표 행 집계를 SECURITY DEFINER RPC(`get_match_room_detail`의 games 총계 재사용 또는 `room_game_tallies(room_ids)`)로, 또는 `is_perspective` 무관하게 `source_request_id` distinct로 세되 direct 행은 그대로 | fixed(86f97ee) |
| F-22 | **P2** | S13.10 | 비노출 방(0082)에서 초대받은 회원이 [거절]하면 다시 들어올 길이 없다 — `invite_room_members`가 declined 행을 `on conflict do nothing`으로 두고, `inviteExcludedUserIds`도 declined를 항상 제외해 호스트 검색에 뜨지 않으며, 비밀번호 입장은 `room_not_listed`. 게이트 문구는 `참가하려면 호스트나 참가자의 초대가 필요합니다.`라 불가능한 것을 안내한다 | 호스트 재초대가 declined → invited로 복귀(removed와 같은 관용구) | `0065 invite_room_members`(on conflict), `members-view.ts:143 inviteExcludedUserIds` | 비노출 방(또는 전체)에서 declined도 호스트 재초대 대상으로 | fixed(86f97ee) |
| F-23 | P3 | R3.3 | 본인 프로필 개인 탭의 `NTRP 대비 성적` 카드가 회원 상대 22경기에서도 `경기 데이터가 없거나 상대 NTRP 정보가 부족합니다` | 상대 NTRP 스냅샷이 있는 개인 경기로 상위/동급/하위 집계 | `aggregateByNtrpDiff`가 `bundle.matches`(클럽 대진표)만 읽는다 — 개인 탭에서는 항상 빈 상태 | `personal_match_participants.ntrp_snapshot`으로 개인 경기도 집계(라이벌·파트너 카드처럼) | fixed(5339f9f) |
| F-24 | **P2** | R4.6 | **타인 프로필이 개인 전적을 전혀 보여주지 않는다** — A(22경기 확정, 통계 공개)를 B가 열면 헤더 `0 경기`, `전적 데이터가 아직 없어요`, `참여한 경기가 없습니다`. 공개/비공개 스위치의 뜻이 사라진다 | 본인 개인 탭과 같은 4카드·최근 경기 | `PlayerStatsSection`이 클럽 `match_games`(동결·픽스처)만 집계 — 백로그 「타인 프로필 통계 픽스처화 여부」의 실제 모습 | 타인 요약을 `personal_matches`(공개 시)로 — 자기 관점 행만 있으면 되므로 RLS는 상대 관점 행을 읽을 수 있는 RPC(`get_user_head_to_head` 관용구)로 | fixed(26b2e70) |
| F-25 | P3 | A9.8 | 탈퇴한 상대의 이름이 화면마다 다르다 — 룸 명단·게임 행·확인 팝업은 `탈퇴한 회원`, 상대 A의 **개인 카드는 원래 이름 `테스트가입자`**(참가자 스냅샷) | 한 규칙(어휘표: 이름 복원 + `탈퇴` 배지)으로 통일 | 룸은 `users` 현재값, 개인 카드는 `personal_match_participants.name` 스냅샷 | 둘 중 하나로 통일 — 어휘표대로면 룸도 스냅샷 이름 + 배지 | fixed(6167f7e) |
| F-26 | P3 | R1.2 | 호스트가 [매칭 리스트에서 내리기]로 지운 로테이션 방(S7, 게임 0)의 세션이 `room_id null`로 풀려 **참가자의 「결과 입력 대기」에 `로테이션 · 참가자 2명 · 2/2명 수락 · 게임 미입력` 카드로 남는다** — 내려간 방을 참가자가 방 밖 세션으로 계속 입력할 수 있다 | 게임이 없는 방을 내리면 세션도 함께 지우거나, 카드에 「내려간 매칭」 표시 | 방 삭제 시 출처 행은 `room_id`만 null(10.12 설계) — 게임 0인 세션은 남길 가치가 없다 | `cleanup`에서 게임 0 세션은 삭제 | fixed(6167f7e) |
| F-pre-4 | P2 | A1.13 | **confirmed** — 가입 직후 `/clubs`(「클럽 목록」 더미 데이터) 착지. 신규 회원의 첫 화면이 픽스처 | `/profile/<uid>?scope=personal` | `auth.ts:206` | 착지 변경 | fixed(e9d682e) |
| **F-27** | **P1** | ① 재실행 A6.6 | **`avatars` 스토리지 버킷이 원격에 없었다** — 정책 4개만 있고 버킷이 없어 가입·온보딩·설정의 사진 업로드가 한 번도 성공한 적이 없다(55명 전원 기본 아바타, 스토리지 URL 0건). 세 액션이 `upErr`를 삼키고 기본 아바타로 폴백해 화면에 드러나지 않았고, Week 62는 그보다 앞선 F-15(본문 한계)에서 막혀 여기까지 오지 못했다 | 업로드가 저장된다 | 버킷 부재(마이그레이션에 `storage.buckets` insert가 없었다) | 0087 `insert into storage.buckets`(public · 1MB · png/jpeg/webp — 앱 상수의 거울) | fixed(ea33447) |
| F-pre-7 | — | A6.6 | F-15로 승격(문구만이 아니라 1MB 한계가 실제 장벽) | — | — | — | closed → F-15 |

## 발견 (Week 49 실행)

| ID | P | 시나리오 | 증상(실제) | 기대 | 원인(파일·함수) | 수정 계획 | 상태 |
|---|---|---|---|---|---|---|---|
| F-1 | P3 | S1.5 | 단식 방 상세 헤더 eyebrow가 `자유 기록 · 하드` — 사용자는 단식 매칭을 만들었는데 「자유 기록」이라는 내부 어휘(source_kind direct)가 보인다 | `단식 · 하드`처럼 방식 라벨 | `RoomDetailHeader` eyebrow가 source kind 라벨을 그대로 씀 | eyebrow를 `MATCH_TYPE_LABELS[matchType]`(또는 단식/복식)로 교체 | **fixed(38fcf3c)** |
| F-2 | P3 | S1.10 | 「나를 초대한 매칭」 카드 하단 문구 `수락하면 방 참가자로 등록됩니다. 경기 기록 자체는 방장 계정에만 남습니다.` — Week 39 이후 방 게임은 상호 확인이라 양쪽 기록에 남는다. 거짓 안내 | `수락하면 방 참가자로 등록되고, 방 안 게임은 상대 확인을 거쳐 양쪽 기록에 남습니다` | `RoomInviteCard` 하단 caption(Week 25 문구 잔존) | 문구 교체 | **fixed(38fcf3c)** |
| F-3 | P3 | S1.10 | 초대 카드 제목 `9월 11일 10시 · E2E-S1 · 단식` — 상세·목록은 `10:00~12:00`(formatRoomWhen)인데 초대 카드만 시 단위 | 같은 방은 어디서나 같은 시간 표기 | `RoomInviteCard`가 `buildRoomTitle`에 `durationMinutes`를 넘기지 않음(초대 요약 쿼리에 컬럼 누락 가능) | `room-queue.ts` 초대 요약에 `duration_minutes` 포함 → `buildRoomTitle` 전달 | **fixed(38fcf3c)** |
| F-4 | P3 | S1.16 | 제안자 관점 게임 행에 배지 둘 — 상태 배지 `결과 확인 대기`(roomGameStatusBadge) + 액션 영역 `참가자 확인 대기`(NegotiationTurnActions). 같은 뜻을 두 번 말한다 | 행마다 배지 하나(CLAUDE.md 「배지는 행마다 하나」) | `room-game-row.tsx`가 상태 배지를 그리고 `NegotiationTurnActions`가 또 배지를 그림 | 룸 행에서는 액션 영역 배지를 숨기거나(`badgeClassName` 아닌 `hideBadge` prop), 상태 배지를 협상 상태로 대체 | **fixed(38fcf3c)** |
| F-5 | P2 | S1.19 | 정산된 방(`종료`)에서 [회원 초대]·[비회원 초대]·[자동 대진표]는 사라지는데 **[게임 추가]는 남는다**. 눌러 저장하면 방이 다시 미정산으로 돌아간다(가드 없음) | 정산된 방에서는 게임 추가도 막거나, 의도라면 「추가하면 매칭이 다시 진행 중이 됩니다」 안내 | `canViewerAddRoomGame`·`canAddRoomGame`(room-context.ts)이 `isSettled`를 보지 않음. RPC `create_room_game`도 정산 검사 없음 | 결정 필요: (a) `canAddRoomGame`에 `!isSettled` + RPC `room_already_closed` 가드(0072 원칙: 노출 = 가드) 또는 (b) 허용하되 안내. **권장 (a)** — 정산 뒤 게임을 붙이려면 [결과 정정]처럼 명시적 재개가 맞다 | **fixed(f4d1d3b)** |
| F-6 | P3 | S2.5 | 이의 사유 201자 입력 시 문구 없이 200자로 잘려 저장된다(`maxLength`) | 잘림을 알리는 카운터(`n/200`) 또는 문구 | textarea `maxLength=200`만 있고 카운터 없음 | 글자 수 카운터 추가(정정 사유 input도 동일) | **fixed(38fcf3c)** |
| F-8 | P3 | S3.8 | 자동 대진표·대진 편집 카드에서 NTRP 없는 게스트가 `3.9`(아는 사람 평균 대체값)로 보인다 — 방장 3.9와 나란히 놓여 게스트 실력이 3.9인 것처럼 읽힌다. 참가자 칩은 `비회원`으로 맞게 표시 | 카드에서는 대체값 대신 `—` 또는 `비회원`(배치는 대체값으로 하되 표시는 하지 않는다) | `toLineupPlayers`가 fallback을 ntrp에 넣고 `RoomLineupGameCard`가 그 값을 그대로 그림 | `LineupPlayer`에 `ntrpKnown: boolean`을 더해 카드가 모를 때 숨기기 | **fixed(38fcf3c)** |
| F-9 | P2 | S4.7 | 복식 결과 확인 다이얼로그가 제안자를 **상대팀 이름**으로 말한다 — A(남자01)가 제안했는데 파트너 B에게 `남자04 · 남자03님이 제안한 결과`, 상대 D에게 `남자02 · 남자01님이 제안한 결과`. 행의 `결과를 입력한 사람: 남자01`과 모순 | `남자01님이 제안한 결과` | `result-review-panel.tsx:42`가 `opponentName`을 제안자 자리에 씀 | `proposedBy` 이름을 `PersonalMatchConfirmation`에 실어 전달(`proposerName`), 패널이 그것을 쓰고 없을 때만 opponentName 폴백 | **fixed(56f689a)** |
| F-10 | P2 | S1.16·S4.7·S4.10 | 룸 게임 행의 좌석 명단이 **뷰어를 두 번** 센다 — `확인 대기: 나 · 남자04 · 남자02 · 남자03`(B 관점, 실제 대기 3명), `확인 완료: 나 · 남자02`(둘 다 B). 개인 카드에는 없다 | `확인 대기: 나 · 남자04 · 남자03` | `seat-status.ts:67`이 `'나'`를 앞에 더하는데, 룸 행 호출부가 `seats`에 뷰어 본인 참가자를 걸러 넘기지 않는다(개인 카드의 `namedSeatsOf`는 타 좌석만) | 룸 행(`room-game-row`/`buildRoomGameSeats`)에서 `viewerId`를 제외한 좌석만 넘기거나 `seatStatuses`가 `me` 이름과 같은 항목을 제거. vitest 케이스 추가 | **fixed(56f689a)** |
| F-11 | P2 | S4.13 | 복식(로테이션) 방에서 **게임을 전부 확정해도** 풀 회원 전원에게 사이드바 뱃지 1 + 카드 필 `결과 입력`이 남는다(D 확인). 방 상세에는 「지금 할 일」 배너가 없어 카드와 상세가 어긋난다. 방장이 [게임 입력 종료]를 누르기 전까지 지속 | 게임이 남지 않았으면 풀 세션은 차례로 세지 않거나, 방장에게만 「게임 입력 종료로 마무리하세요」 차례를 준다 | `room-queue.ts`/`match-queue.ts`가 미확정 `rotation_sessions`를 무조건 `enterResult`로 넣음. `classifyRoomGameTurn`은 게임만 봄 | (a) 방 세션은 큐에서 `enterResult`로 세지 않는다(방 안 [게임 입력]은 상시 가능한 액션이지 차례가 아님) + (b) 방장에게 `closeRotation` 차례 신설(배너 「모든 결과가 확정됐습니다 — 게임 입력을 종료하면 매칭이 마무리됩니다」). K-12와 묶어 결정 | **fixed(f4d1d3b)** |
| F-13 | P2 | S6.12 | 결과 미입력 게임이 있는 B가 [방 나가기]를 하면 **사이드바 뱃지는 1로 남는데** 「참여 중인 매칭」에는 카드가 없다(declined는 목록에서 제외, 큐는 관점 행을 그대로 셈). 뱃지 = 카드 수 항등식(Week 45)이 깨진다. 방 상세는 게이트라 할 일을 볼 수도 없다(K-1) | 나간 방의 게임은 큐에서 빼거나(뱃지 0), 나간 뒤에도 카드는 남기고(「나간 매칭」 표시) 결과 확인 경로를 준다 | `fetchMatchQueue`가 `room_id` 방의 멤버십 상태를 보지 않음; `fetchRoomQueue`/목록은 joined만 | K-1과 함께: `leave_match_room`에 `member_has_games` 가드(강퇴와 대칭) 또는 큐에서 declined 방 제외. **권장: 가드** — 결과가 남은 채로 나가는 것이 문제의 뿌리 | **fixed(f4d1d3b)** |
| F-14 | P3 | S10.12 | 내려간 방의 URL은 404 페이지인데 CTA가 `클럽 목록으로 돌아가기`다 — 매칭 룸 경로에서는 매칭 리스트가 맞다 | `매칭 리스트로 돌아가기` 또는 경로별 CTA | `app/not-found.tsx` 단일 CTA | `/match-rooms/[roomId]`에 `notFound()` 대신 전용 안내(「내려간 매칭입니다」 + 매칭 리스트 링크) | **fixed(38fcf3c)** |
| F-7 | P3 | S2.11 | [결과 정정] 다이얼로그 설명 `양쪽 기록이 미확정으로 돌아가고 **확인 요청에서** 다시 입력합니다.` — 허브가 철거되어 다시 입력하는 곳은 매칭 룸이다 | `…매칭 룸에서 다시 입력합니다` | `ReopenResultButton` description 문구(Week 39 이전) | 문구 교체 | **fixed(38fcf3c)** |

## 수정 계획 요약 (2026-09-11 첫 전수 실행 뒤) — **완료**

P1(저장 실패·크래시·교착)은 **0건**. 흐름 자체는 전부 통과했고, 발견한 것은 어긋남(P2) 5건과 문구·표시(P3) 9건이다. 묶어서 3개 커밋으로 고치는 것을 제안한다.

| 묶음 | 항목 | 손댈 곳 | 회귀 가드 |
|---|---|---|---|
| **① 정산·차례 정합 (P2)** | F-5 정산된 방의 [게임 추가] / F-11·K-12 세션 차례 잔존 + 방장 종료 안내 / F-13·K-1 나간 사람의 뱃지·교착 | `room-context.ts` `canAddRoomGame`(+RPC `create_room_game`에 `room_already_closed`), `room-queue.ts`·`match-queue.ts`(방 세션을 차례로 세지 않기), `room-turn.ts`에 방장 `closeRotation` 차례 + 배너 문구, 마이그레이션 0077: `leave_match_room`에 `member_has_games` 가드(강퇴와 대칭) | `room-turn.test.ts`·`room-context.test.ts`·`queue.test.ts` 케이스, 0077 롤백 스모크, S1.19·S4.13·S6.12 재실행 |
| **② 협상 표시 (P2)** | F-9 제안자 이름 / F-10 뷰어 이중 표기 | `PersonalMatchConfirmation`에 `proposerName`, `result-review-panel.tsx`, 룸 행 `seats` 구성(`buildRoomGameSeats` 또는 `seatStatuses`에서 me 제거) | `seat-status.test.ts` 케이스, S4.7·S4.10 재실행 |
| **③ 문구·표시 (P3)** | F-1 eyebrow / F-2 초대 카드 옛 문구 / F-3 초대 카드 시간 표기 / F-4 배지 중복 / F-6 사유 카운터 / F-7 정정 문구 / F-8 게스트 대체 NTRP / F-14 404 CTA / F-pre-1·2 | 각 행 참조 | `colors.test.ts` 무관, 스냅샷은 S1.10·S3.8·S2.11 재실행 |

순서 제안: ① → ② → ③. ①의 F-13은 마이그레이션이 들어가므로 별도 승인. ②·③은 앱만.

### 실행 결과 (2026-09-11 두 번째 실행)

세 묶음 모두 구현·검증 완료. 사용자 결정은 F-5 **막는다**, F-11 **세션 차례 제거 + 방장 종료 차례**, F-13 **나가기에 가드**.

| 묶음 | 커밋 | 결과 |
|---|---|---|
| ① 정산·차례 정합 | `f4d1d3b` (+ 마이그레이션 0077) | 정산된 방은 [게임 추가]까지 사라지고 RPC·정책이 함께 막는다. 방 세션은 더 이상 차례가 아니고, 게임이 전부 확정되면 **방장에게만** 「입력 종료」 차례가 간다. 배정된 경기가 있는 회원은 나갈 수 없다 |
| ② 협상 표시 | `56f689a` | 검토 패널이 제안자 이름을 말한다(`proposerNameOf`, `disputerNameOf`와 대칭). 룸 행 좌석에서 뷰어 본인을 뺀다 |
| ③ 문구·표시 | `38fcf3c` | P3 8건 + 선등록 2건. 에러 맵은 `lib/match-rooms/error-map.ts`로 빠져 **포함된 키 중 가장 긴 것**을 고른다(순서 의존 제거) |

재실행 결과는 `runs.md` 「Week 50 두 번째 실행」 블록의 재실행 표에 있다.

**K-6도 이어서 닫았다**(0078) — 마지막까지 남아 있던 「경기당 시간 미저장」이다. 방 스키마에 `slot_minutes`를 더하고 자동 대진표가 고른 값을 함께 저장하게 했다. 이제 이 대장에 열린 항목은 없다.


## 코드 조사 선등록 — Week 62 전 구간 실행 전 (Phase 0)

| ID | P | 근거 | 증상 | 수정 계획 | 상태 |
|---|---|---|---|---|---|
| F-pre-4 | P2 후보 | `lib/actions/auth.ts:206` `signupAction` | 가입 성공 착지가 `redirect('/clubs')` — **동결된 더미 클럽 목록**(redesign-fixtures, 박서준 등 가공 데이터)이 신규 회원의 첫 화면이다. 로그인·온보딩·소셜 착지는 전부 `/profile/<uid>?scope=personal` | 착지를 `/profile/<uid>?scope=personal`로(체크리스트 「첫 매칭 참여하기」가 다음 행동을 말한다). A1.13에서 판정 | fixed(e9d682e) — Week 63 ②, 착지를 프로필 + 환영 배너로 |
| F-pre-5 | P3 | `lib/actions/match-results.ts` `RESULT_ERROR_MESSAGES` | `room_closed` 키가 없어 닫힌 방의 `reopen_match_result` 거절이 `결과 정정에 실패했습니다.` 폴백으로 떨어진다(화면은 버튼을 감추므로 우회 호출에서만) | 맵에 `room_closed` → `호스트가 마감한 매칭입니다…`(룸 맵과 같은 문구) | fixed(6167f7e) |
| F-pre-6 | P3 | `lib/actions/match-rooms.ts` `ROOM_ERROR_MESSAGES` | `invalid_slot_minutes`(create_room_lineup 10~180)·`not_member`(상세 RPC)·`invalid_duration`·`invalid_court_count`(create_match_room)가 맵에 없어 폴백 문구 | 네 키 추가. 화면 선검증이 있어 실사용 노출은 드물다 | fixed(6167f7e) |
| F-pre-7 | P3 | `components/profile/profile-avatar-field.tsx:76` | 「JPG, PNG, WEBP · 최대 5MB」 문구만 있고 클라이언트·서버 어느 쪽에도 크기 검증이 없다 | A6.6에서 6MB 업로드 결과로 판정(스토리지 거절이면 문구 번역, 통과하면 검증 추가) | fixed(ea33447) — Week 63 ①, 브라우저 축소 + 한계 3중 |
| F-pre-8 → P3 confirmed | P3 | `components/profile/member-profile-header.tsx:102` | 탈퇴 익명화가 `gender`·`dominant_hand`를 null로 두는데 헤더가 `genderLabel[user.gender] · handLabel[…]`를 단언 → 타인이 탈퇴자 프로필 URL을 열면 ` · `만 남는다(크래시 아님, 타입은 non-null) | A9.8 판정: 공백이 아니라 **거짓 값** — `탈퇴한 회원 · 남 · 오른손잡이 · NTRP 2.5`(null 성별·주력손이 기본값으로, 익명화되지 않은 `ntrp`가 그대로). 탈퇴자 프로필은 헤더 메타 줄을 숨기고 `ntrp`도 익명화 대상에 | fixed(6167f7e) |
| F-pre-9 → known | P3 (K-9 잔여) | `personal_matches_update/delete` 정책(0083) | 정산됐지만 **닫지 않은** 방의 direct 행은 소유자가 `/edit`에서 고치거나 지울 수 있고, 그러면 방이 미정산으로 되돌아가거나(마지막 행이면) 방이 지워진다 | S15.6 판정: 소유자가 스코어를 비우면 방이 미정산으로 돌아간다(롤백 확인). 확인자가 없는 자유 기록의 수정은 곧 정정이라 **의도로 본다** — 개인 카드의 [수정]·[삭제]가 그 신호. 다만 정산 방 상세에는 그 경로가 안 보인다 | known(K-9) |

## 코드 조사 선등록 (Week 49)

| ID | P | 근거 | 증상 | 수정 계획 | 상태 |
|---|---|---|---|---|---|
| F-pre-1 | P3 | `match-room-form.tsx` · `createMatchRoomAction` | 초대 실패 문구(`매칭은 만들어졌지만 초대에 실패했습니다…`)는 `roomId`가 있으면 폼이 무조건 push하므로 화면에 닿지 않는다 | 액션 결과에 `inviteError`를 따로 실어 룸 착지 후 배너로 한 번 보여주거나, push 전에 문구를 세션 스토리지에 남긴다 | **fixed(38fcf3c)** |
| F-pre-2 | P3 | `lib/actions/match-rooms.ts` `translate`, `match-results.ts` | 에러 맵이 `includes` 선형 탐색이라 `not_room_member`/`target_not_room_member`, `result_already_confirmed`/`…_by_seat` 순서에 의존 — 회귀 유닛 테스트 없음 | 에러 맵을 순수 모듈로 빼고 `translate`가 정확 일치 우선·접두 일치 후순으로 찾게 한 뒤 vitest로 고정 | **fixed(38fcf3c)** |
| F-pre-3 | P2 후보 | `game-status.ts` `roomGameMemberIds` ↔ `kick_room_member` `member_has_games` | 게임이 하나라도 붙으면 [내보내기]가 사라지는데, 게스트 상대 자유 기록만 있는 회원(0076 direct 라인업 포함)도 같은 취급인지 확인 필요 — S6·S4.12에서 판정 | 판정 완료 — 자유 기록도 같은 취급이다(`room_member_has_games`가 personal_matches 소유·참가자를 본다). 0077이 그 술어를 함수로 빼 leave에도 같은 눈높이를 준다 | **closed(f4d1d3b)** |

## 기지 (CLAUDE.md 백로그에서 옮김) — 재현되면 `confirmed`

| ID | 출처 | 내용 | 상태 |
|---|---|---|---|
| K-1 | Week 41 잔여 | 스스로 나간 사람(declined)은 게임을 친 뒤 [방 나가기]를 하면 상세가 막혀 결과를 확인할 수 없다(강퇴에만 `member_has_games` 가드) | **fixed(f4d1d3b)** — 0077이 `leave_match_room`에 `room_member_has_games` 가드를 걸어 애초에 나갈 수 없다(강퇴와 대칭). 화면도 버튼 대신 이유를 말한다 |
| K-2 | Week 41 잔여 | 방장이 누구를 내보냈는지 화면에 남지 않고, 초대 검색에 「강퇴됨」 표시가 없다 | **fixed(Week 64)** — [회원 초대] 검색 결과가 내보낸 사람을 감추지 않고 비활성 행 + 칩 `내보내짐`(나간 사람은 `나감`)으로 보인다(`inviteRowState`). 호스트에게는 활성 행이라 재초대 경로도 여기다 |
| K-3 | Week 41 잔여 | 게임 추가 폼의 파트너·상대2 자동완성에 방 게스트가 뜨지 않는다 | **confirmed** — Week 62 S3.7(상대 칸에도 없음, 전역 회원 검색만) |
| K-4 | Week 41 잔여 | 강퇴 알림 없음(강퇴자는 방을 열어야 안다) | known — S6.3 |
| K-5 | Week 42 잔여 | 0071 이전 대진은 `origin='game'`이라 [대진 편집] 대상이 아니다; 편집은 전량 교체라 id가 바뀐다; 게임 순서 바꾸기 없음 | known — S3.15 |
| K-6 | Week 43 잔여 | 경기당 시간을 방에 저장하지 않아 저장된 대진의 라운드 시각은 역산값; 코트 배정 없음 | **fixed(0078)** — 방이 경기당 시간을 기억한다(`match_rooms.slot_minutes`, 자동 대진표가 저장할 때 함께 적는다). 팝업·방 목록·편집 화면이 `roomSlotMinutes`로 같은 값을 읽어 재실행에서 셋 다 `10:00·10:30·11:00`. 코트 **배정**은 여전히 없다(라운드·코트는 순서에서 파생) |
| K-7 | Week 47 잔여 | 룸 힌트·매칭 만들기 요약은 30분 경기 가정 — 다이얼로그에서 다른 시간을 고르면 숫자가 갈린다 | known — S3.6 |
| K-8 | Week 48 잔여 | 회원+회원 vs 게스트+게스트 복식 게임은 direct 행이라 두 번째 회원의 개인 기록에 남지 않는다 | known |
| K-9 | Week 48 잔여 | 자유 기록 라인업 행은 소유자가 `/me/personal-matches/[id]/edit`에서 고치거나 지울 수 있고, 방장 소유 행의 메타 편집은 방 메타를 덮어쓴다 | known — S3.20. **부분 해소(0083)**: 방장이 닫은 방에서는 정책·트리거·recompute가 소유자의 수정·삭제를 `room_closed`로 막고 수정 페이지는 방으로 돌려보낸다(S12.8). 정산됐지만 닫지 않은 방은 종전대로 |
| K-10 | 백로그 | 이의 왕복 상한 없음(`dispute_count`만 셈), 알림·리마인더·만료 없음 | known |
| K-11 | Week 45 잔여 | 방 상세 URL에서는 사이드바 「매칭 리스트」가 활성(참여 중인 매칭에서 들어가도) | known — S8 |
| K-12 | Week 40 잔여 | 미확정 로테이션 방에 [자동 대진표]와 [게임 입력]이 공존 — 유지하기로 결정. 정산하려면 방장이 [게임 입력 종료]를 눌러야 한다 | **fixed(f4d1d3b)** — 공존은 그대로 두고, 게임이 전부 확정되면 방장에게 `closeRotation` 차례를 준다(배너·필 「입력 종료」). 풀 회원의 유령 차례는 사라졌다 |
| K-13 | Week 56 잔여 | 이름·성별·주력손·NTRP·시작일·아이디의 「1회 입력 후 불변」은 앱 가드뿐 — `users_update` 정책이 `id = auth.uid()` 하나라 본인 컨텍스트 SQL로 `login_id·ntrp·name` 직접 UPDATE가 통과한다(A6.8 롤백 스모크) | **confirmed** — A6.8 |
