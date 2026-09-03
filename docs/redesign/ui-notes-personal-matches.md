# Step2c UI 노트 — 개인경기/확인요청/로테이션

정적 UI 구현 범위: `src/app/(main)/me/personal-matches/**`, `src/app/(main)/me/match-requests/**`. Supabase 연동을 제거하고 `src/lib/redesign-fixtures/{personal-matches,match-requests}.ts` 더미 데이터로 교체했다. 컴포넌트(`personal-match-list.tsx`, `received-request-card.tsx` 등)와 서버 액션 wiring은 그대로 두었다(클릭 시 실제 DB 호출은 실패하지만, 이 단계 목적은 "데이터 요구사항 확정"이지 인터랙션 검증이 아님).

## domain-model.md 상태머신과의 매핑

| 화면 시나리오(픽스처 id) | domain-model.md 대응 상태 |
|---|---|
| `pm-1` 직접기록 단식 확정 | §1 "직접기록 → 결과확정" |
| `pm-2` 직접기록 단식 미확정 | §1 "직접기록 → 결과미확정" (winner=null) |
| `pm-3` 상호확인 confirmed | §2 축B `proposed→confirmed` |
| `pm-4` 상호확인 proposed(내가 제안) | §2 축B `none→proposed`, "제안자 본인은 확인 불가" 불변식 |
| `pm-5` 상호확인 disputed | §2 축B `proposed→disputed` |
| `pm-6` 페어고정 복식 확정 | §3 참가자 다형성(partner/opponent2 4컬럼) + 애드/듀스(myAd/oppAd 세트별) |
| `pm-7` 로테이션 분해 결과 | §1 "로테이션풀 → 결과확정"(finalize 후 일반 확정 경기와 동일 모양) |
| `rot-1` 로테이션 세션(게임 미구성) | §1 "로테이션풀" 상태, 선수풀 3명 이상 |
| `req-recv-pending`/`req-sent-rejected`/`req-sent-canceled` | §2 축A(status) pending/rejected/canceled |
| `req-recv-accepted` | §2 축A accepted, 축B none |
| `req-confirm-wait` | §2 축B proposed, 제안자≠viewer(확인 대기) |

## 화면별 필요 데이터 필드 (기존 타입 그대로 확인됨, 변경 불요)

- **PersonalMatch**: `sourceRequestId` 유무로 "수정 잠금" UI 분기, `confirmation` 서브객체(4가지 status)로 카드 배지 분기 — 이 둘이 없으면 카드가 상호확인 여부/결과 협상 상태를 전혀 표시 못 함. Step3 ERD에서 이 두 정보가 반드시 조인 가능해야 함.
- **PersonalMatchForm**: `opponentCandidates`(클럽 회원 검색용, users+club_members 조인)와 `pastOpponents`(비회원 상대 이름 자동완성, personal_matches 자체 스캔)가 **서로 다른 두 소스**를 합쳐 하나의 자동완성으로 보여준다 — Step3에서 "상대 후보"를 단일 쿼리/뷰로 통합할지 검토 필요(신규 발견 사항, 아래 참고).
- **MatchRequestWithUser**: `counterpart.deleted` 플래그로 탈퇴 회원 표시 — `request` 원본 컬럼만으로는 안 되고 users.deleted_at 조인이 항상 필요.

## 신규 발견 사항 (domain-model.md 갱신 후보)

1. **상대 후보 소스 이원화**: `PlayerPicker`/자동완성이 "클럽 회원 검색(fetchOpponentCandidates)"과 "과거 비회원 상대 이름(fetchPastOpponents)"이라는 서로 다른 쿼리 2개를 합쳐서 쓴다. Step3 ERD에서 참가자 테이블을 설계할 때, "이전에 만난 상대" 이력을 별도로 다시 스캔하지 않고 참가자 테이블 자체에서 파생 가능하게 만들 수 있는지 검토할 가치가 있음.
2. **`playedTime`이 두 곳에서 필수성이 다름**: `PersonalMatch.playedTime`은 optional(직접기록은 시간 생략 가능)이지만 `MatchRequest.playedTime`은 required — 상호확인 요청은 항상 시간이 있어야 한다는 규칙이 domain-model.md §1에 명시돼 있지 않았음. 추가 권장.
3. **`MatchRequestCounterpart`가 필요로 하는 users 컬럼**(`id,name,nickname,profile_image,deleted_at`)은 참가자 정규화(§6 원칙 1) 설계 시 참가자 테이블이 users를 조인하는 최소 컬럼 세트로 그대로 가져가면 됨 — 새 요구사항 아님, 확인만 완료.

## 범위 밖 (다른 fork 작업)

`src/components/ui/**`, `src/lib/dashboard/tokens.ts`, `src/components/common/**`, clubs/match-games/레이팅 화면은 수정하지 않았다.
