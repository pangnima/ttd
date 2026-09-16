# 기록 · 통계 E2E 절차서 — R1~R5

> 규약은 `README.md`. 표 열·수단 표기는 다른 절차서와 같다. 직접 기록의 메모·코트명은 `E2E-R<n>`. **R3(통계 대조)은 Phase 2가 남긴 확정 전적을 쓰므로 S 정리 SQL 전에 스냅샷을 뜬다** — 이미 정리했다면 R3.0으로 최소 데이터를 다시 만든다.

## 경우의 수 표

| 축 | 값 | 시나리오 |
|---|---|---|
| 직접 기록 타입 | 단식 / 페어 고정 복식 / 로테이션 복식 (전부 비회원) | R1 |
| 액션 | 등록(스코어 없음) → 결과 입력(즉시 확정) → 수정(메타·상대·회원 추가 차단) → 삭제 | R1 |
| 잠금 | 상호 확인 행 / 마감 방 행 / 타인 행 / `?room=` | R1 |
| 표시 | record / multi / rotation 그룹 · 월별 · 필터 · 배지 · 요약 | R2 |
| 통계 | 4카드 · 헤더 · 라이벌·파트너·표면·손잡이·코트 성향 · 레이팅 추세 · 공개/비공개 | R3·R4 |
| 안내 | 체크리스트 2단계 · 빈 상태 4곳 · PageGuide 3곳 · `/guide` · 내비·뱃지 | R4·R5 |

## R1 직접 기록 CRUD 전수 (B 기준 — A는 S에서 많이 썼다)

| # | 계정 | 조작 | 기대 | 검증 | 수단 |
|---|---|---|---|---|---|
| 1.1 | B | `/me/personal-matches` → [+ 직접 기록] | `/me/personal-matches/new`, 헤더 `직접 기록` / `비회원과 친 경기는 내 기록에만 남습니다. 회원을 고르면 비공개 매칭이 만들어지고 초대가 갑니다` | — | B |
| 1.2 | B | 단식, 상대 `E2E상대R1`(비회원, NTRP `2.4`), 날짜 오늘, 시각 `10:00`, 표면 하드, 코트명 `E2E-R1`, 메모 `E2E-R1` → [경기 저장] | 폼에 스코어 칸 없음(`SaveOutcomeNotice` `상대팀에 플랫폼 회원이 없어 **내 기록에만** 남습니다…`). 착지 `/me/personal-matches` 상단 `결과 입력 대기`(hint `게임 스코어를 넣으면 곧바로 확정됩니다`) 카드 + [결과 입력]·[수정]·[삭제] | `personal_matches` direct `set_scores=[]`, `personal_match_participants` 상대 1행 | B+S |
| 1.3 | B | 같은 시각으로 한 건 더 등록 시도 | 폼에 `이 시각에 이미 등록된 경기가 있습니다 — …` 경고(저장은 막지 않는지 기록) | `schedule-conflict` | B |
| 1.4 | B | 상대 이름 비움 / 코트명 41자 / NTRP `7.5` / 시각 미선택 | `상대 이름을 입력해주세요.` / `코트명은 40자 이내로 입력해주세요.` / `상대 NTRP는 1.0~7.0 범위로 입력해주세요.` / `경기 시각을 선택해주세요.`(폼 `isValid` false면 [경기 저장] 비활성 + 제출 시 `필수 항목을 모두 정확히 입력해주세요.`) | `validate-input.ts` | B |
| 1.5 | B | 1.2 카드 [결과 입력] → `0:0` / `6:2, 7:5, 6:3, 6:1, 6:0, 6:4`(6게임) / `100:1` / `6:2` | `0-0 게임은 저장할 수 없습니다.` / `게임은 최대 5개까지…` / `게임 스코어를 올바르게 입력해주세요.` / 즉시 확정 → 확정 목록 `승 6-2`, 섹션 사라짐 | `validateSetScores`, `updatePersonalMatchSetsAction` | B+S |
| 1.6 | B | 확정 카드 [수정] → 상대명 `E2E상대R1b`·날짜 어제·코트명 변경 → [수정 완료] | `/me/personal-matches`로, 카드 갱신, `has_result` 유지 | `updatePersonalMatchAction` | B+S |
| 1.7 | B | [수정]에서 상대를 `남자01`(회원)로 | `MemberBlockedInEditNotice` `저장된 기록에는 회원을 넣을 수 없습니다…` + 저장 잠금. 서버 `DIRECT_RECORD_MEMBER_ERROR`는 코드 | `memberBlockedInEdit` | B+코드 |
| 1.8 | B | 페어 고정 복식: 파트너 `E2E파트너`·상대 `E2E상대1`·`E2E상대2`(전부 비회원) → 저장 → [결과 입력] `6:4, 4:6` | 확정 카드가 **multi 그룹**(헤더 `2게임 · 1승 1패` + `게임 1`·`게임 2` 가상 카드, 액션은 헤더) | `match-groups.ts` multi | B |
| 1.9 | B | 로테이션 복식: 풀 비회원 4명(`E2E로테1~4`) → 저장 → `결과 입력 대기` 세션 카드 → 빌더 게임 2개(파트너·상대 교대) → 저장 | 즉시 확정 → **rotation 그룹**(세션 헤더 + `게임 1`·`게임 2`, 액션 카드마다). 풀 3명 → 게임 구성 불가 경고 | `finalize_rotation_session` 전원 비회원 즉시 확정 | B+S |
| 1.10 | B | 1.9 세션 카드에서 참가자 편집(풀에 `E2E로테5` 추가·제거) | 방 밖 세션 풀 편집(`add/remove_rotation_session_player`) | `canManageRotationPool` | B+S |
| 1.11 | B | 확정 카드 [삭제](confirm `이 경기 기록을 삭제할까요?`) | 목록에서 사라짐, SQL 0행 | RLS delete | B+S |
| 1.12 | B | 상호 확인 행(S에서 남은 것 또는 S13.9)의 `/me/personal-matches/<id>/edit` URL | `/me/personal-matches`로 리다이렉트. 카드에는 [수정]·[삭제] 없음 + `상호 확인` 배지 | `sourceRequestId` | B |
| 1.13 | B | 타인(A) 기록 id로 `/edit` | 404 | `notFound()` | B |
| 1.14 | B | 마감 방 행의 `/edit` | `/match-rooms/<id>`로 | `isRoomClosed` (S12.8 회귀) | B |
| 1.15 | B | `/me/personal-matches/new?room=<id>` | `/match-rooms/<id>` | Week 39 | B |

## R2 확정 전적 표시

| # | 계정 | 조작 | 기대 | 검증 | 수단 |
|---|---|---|---|---|---|
| 2.1 | B | `/me/personal-matches` 확정 목록 | 정렬 최신 `playedAt` desc → `playedTime` desc → `groupSeq` asc. 월별 묶음 헤더 | `match-groups.ts`·`groupByMonth` | B |
| 2.2 | B | 필터 `전체`/`단식`/`복식` | 건수 변화. 결과 없으면 `해당하는 경기 기록이 없습니다. 경기를 기록해보세요` | — | B |
| 2.3 | B | 배지 | 승 `승`·패 `패`·무 `무`(영문 WIN/LOSS 없음, Week 54), 상호 확인 행 `상호 확인`, 마감 방 행 `마감`(title 문구) | `OUTCOME_LABEL`·`MatchActions` | B |
| 2.4 | B | multi·rotation 헤더 | 일시·코트명·참여 멤버(첫 등장순, 중복 제거)·전적 합 `N게임 · x승 y패` | `match-group-header` | B |
| 2.5 | 신규 계정 | 확정 0건 | 빈 상태 `아직 확정된 경기가 없습니다. 매칭이 끝나면 전적이 여기로 옵니다` + `PageGuide` **펼침** | `PageGuide open` | B |
| 2.6 | B | 방 게임(미확정)이 `결과 입력 대기`에 오지 않는지 | S9.9 회귀 | `!roomId` | B |

## R3 본인 통계 — SQL 교차 (A·B, Phase 2 데이터 스냅샷)

| # | 계정 | 조작 | 기대 | 검증 | 수단 |
|---|---|---|---|---|---|
| 3.0 | — | (정리 뒤라면) 최소 데이터: A–B 단식 2게임(A 1승 1패), 복식 1게임 | S1·S4 절차로 | — | B+S |
| 3.1 | A | `/profile/<A>?scope=personal` 헤더 | 승률 링 `승률 N% (승 x 패 y)`·`N 경기`·`주력 단식`·NTRP 배지 | `MemberProfileHeader` | B |
| 3.2 | A | 4카드(전체·단식·남복·혼복) 승·패·무 | **SQL 대조**: `select … from personal_matches where user_id=A and has_result` + `resolveSetWinner`(게임 단위 승패 → 행 단위 승·패·무는 `tallySets` 규칙)로 계산한 값과 일치. `get_user_match_stats_v2(A)`와도 일치 | `toQuadStats`, V `winner.test` | B+S |
| 3.3 | A | 라이벌 분석 / 파트너 케미 / 코트 표면별 / 상대 손잡이별(캡션 `복식은 상대별로 셉니다`) / 복식 코트 성향 / **NTRP 대비 성적**(회원 상대 스냅샷으로 상위·동급·하위 — Week 63 F-23) | Phase 2 상대(B·C·D)·표면·좌석이 카드 표본 수치에 반영(표본 1~2개를 SQL로 확인) | `analytics/*` V | B+S |
| 3.4 | A | 개인 레이팅 추세 · NTRP 대비 성적 | `personal_ntrp`가 갱신됐는지 SQL(`users.personal_ntrp`) — 갱신 안 되면 백로그 「확정 시 lazy 갱신」 확인으로 기록 | `lib/rating/personal-rating` | B+S |
| 3.5 | A | 승률 추이 / 경기 활동 히트맵 | 오늘 날짜에 활동 표시 | `hour-heatmap` V | B |
| 3.6 | A | 통계 공개 스위치 `비공개` | 즉시 반영, R4.3에서 타인 확인 | `StatsPrivacyToggle` | B |
| 3.7 | A | 통합 탭·클럽 탭 | `aria-disabled` + `준비 중` | 스캐폴드 | B |

## R4 타인 프로필 · 빈 상태 · 체크리스트

| # | 계정 | 조작 | 기대 | 검증 | 수단 |
|---|---|---|---|---|---|
| 4.1 | 신규 계정 | `/profile/<uid>?scope=personal`(0경기) | 헤더 `ProfileEmptyGuide` `아직 확정된 경기가 없어요` + [매칭 참여하기](`/match-rooms`)·[사용 가이드]; `StatsEmpty` `전적 데이터가 아직 없어요`; 개인 경기 결과 프리뷰 빈 상태 | Week 57 유도 넷 | B |
| 4.2 | 신규 계정 | 체크리스트 `시작하기` | `2단계 중 0단계 완료` — 기본 아바타는 「프로필 완성」이 아니다(Week 63 U-pre-1: 직접 올린 사진 ∨ 휴대폰·라켓 입력이 done). 「첫 매칭 참여하기」 링크 `/match-rooms` | `lib/onboarding.ts`·`isDefaultAvatar` | B |
| 4.3 | 신규 계정 | 매칭 참가(S 방 하나 비밀번호 입장) 후 프로필 | 두 단계가 모두 done이 되어 **카드 자체가 사라진다**(`모든 준비를 마쳤어요!`·닫기 버튼은 마지막 단계를 프로필 화면 안에서 끝낼 때만 보인다) | `isOnboardingComplete` | B |
| 4.4 | B | A의 프로필(비공개 상태) | 4카드 블러 + `승률을 공개하지 않은 유저입니다`, 편집 불가, `최근 경기`·`라이벌 · 파트너` | `PlayerStatsSection locked` | B |
| 4.5 | A | 본인 화면에서 비공개 카드 `클릭해서 보기` | **공개로 전환**되는지(`toggleStatsHiddenAction(false)`) — 보기와 공개 전환이 한 클릭이면 U 후보 | `stats-quad-grid.tsx` | B+S |
| 4.6 | B | A 공개 상태 프로필 | **본인 개인 탭과 같은 카드 한 벌**(헤더 승률 링·주력·개인 레이팅, 4카드 수치 = A 본인 값, 추이·라이벌·파트너·NTRP 대비·표면·손잡이·코트·최근 개인 경기 목록) — 공개 토글·빈 상태 CTA·[+ 직접 기록] 없음. A가 비공개면 잠긴 4카드 + `승률을 공개하지 않은 유저입니다`만 | `get_public_personal_matches`(0090), `fetchAnalyticsBundle(source:'public')`, `PersonalAnalyticsSection viewer="public"`(Week 63 F-24) | B+S |
| 4.7 | B | `/profile/00000000-0000-4000-8000-000000000000` | 404(`not-found`) | `notFound()` | B |

## R5 가이드 · 내비 · 뱃지 최종 스냅샷

| # | 계정 | 조작 | 기대 | 검증 | 수단 |
|---|---|---|---|---|---|
| 5.1 | 비로그인 | `/guide` | S0.5와 같음 + 로고 클릭 → `/`(랜딩). 로그인 상태면 로고 → `/profile/<uid>?scope=personal`(Week 63 U-pre-4). not-found·프로필 error CTA는 `/match-rooms` | `header.tsx`·`sidebar.tsx` | B |
| 5.2 | B | 세 목록 화면 `PageGuide` | 매칭 리스트(참가 방 있으면 접힘)·참여 중인 매칭·개인 경기 결과 각각 펼침/접힘 조건, 「전체 가이드 →」 → `/guide#<id>` 앵커 착지 | `GuideHashScroll` | B |
| 5.3 | B | 사이드바 | `개인`·`매칭 리스트`·`참여 중인 매칭`(뱃지)·`개인 경기 결과` + 구분선 + `사용 가이드`. 방 상세 URL에서 `매칭 리스트` 활성(K-11 confirmed) | `isNavItemActive` | B |
| 5.4 | B | 사이드바 접기(rail) | 뱃지가 점으로 | `sidebar-nav-row.tsx:43` | B |
| 5.5 | B | 뱃지 항등식 최종 | 현재 큐 상태에서 뱃지 수 = `/me/match-rooms` 강조 카드(초대 + 내 차례 필) 수. SQL로 `fetchMatchQueue` 대상 행 수와 대조 | `roomBadgeTotal` | B+S |
| 5.6 | B | 390px 모바일 시트 | 같은 항목·뱃지, 로고 링크 없음, 테마 토글 | `MobileNav` | B |
| 5.7 | B | 테마 토글 다크 → 새로고침 | 유지 | `theme/` | B |
| 5.8 | B | 헤더 아바타·이름 클릭 | `/profile/settings` | `header.tsx` | B |
