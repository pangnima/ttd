# Step2b — 대진표(match-games) 정적 UI 노트

`src/app/(main)/clubs/[clubId]/match-games/**`를 Supabase 연동 없이 `src/lib/redesign-fixtures/match-games.ts` 더미 데이터로 재구현. 컴포넌트 트리(`MatchGamesPageContent`/`MatchGameDetailContent`/`MatchGameCreateForm`)는 변경 없음 — 상위 page.tsx의 데이터 소스만 교체.

## 화면별 필요 데이터 필드

| 화면 | 필요 데이터 | 비고 |
|---|---|---|
| 목록(`page.tsx`) | `Club`, `MatchGame[]`(courts/rounds/matches 전체), 클럽 멤버 `User[]`, `formerMemberIds`, `isMember`/`isOwner`, `currentUserId` | 목록 화면도 각 대진표의 `matches` 전체를 필요로 함(요약 통계 계산 때문으로 추정) — 대진표 카드 단위 요약 API가 없다는 뜻 |
| 생성(`new/page.tsx`) | 클럽 멤버 `User[]`만 | 코트/라운드/타임슬롯/매치는 폼 내부 상태로 구성 후 제출 시 서버로 전송 |
| 상세(`[matchGameId]/page.tsx`) | `MatchGame` 1건, 멤버, `ratingDeltaByMatch`/`ratingChangeTotals`(확정 대진표만), `ratingByUser`, `rivalMatchIds`, `currentUserId`, `formerMemberIds` | 라이벌 판정(`buildCrossPairH2H`)이 **클럽 전체의 확정 경기 누적**을 요구 — 대진표 하나만 봐서는 계산 불가. 재설계 시 이 집계를 어디서 미리 계산해둘지(뷰/캐시 테이블) 검토 필요 |
| 수정(`edit/page.tsx`) | 멤버 + 기존 `MatchGame`(initialData) | 생성 폼과 동일 컴포넌트 재사용 |

## 단식/복식 참가자 표현 방식 (다형성 확인)

현재 `Match` 타입은 `player1Id/player2Id`(단식) vs `team1/team2` + `team1AdPlayerId/team2AdPlayerId`(복식)이 상호배타 필드로 공존 — domain-model.md §3에서 지적한 안티패턴이 화면 구현에서도 그대로 드러남. 더미 데이터 작성 중 확인된 사실:
- 화면(그리드/리스트 뷰, `match-grid-cell.tsx`/`match-list-view.tsx`)은 결국 "이 슬롯에 참가하는 선수 id 목록 + 사이드(team1/team2) + 역할(ad player 여부)"만 필요로 하고, 컬럼이 단식/복식으로 나뉘어야 할 이유는 화면 렌더링 관점에서는 없음.
- 제안: `match_participants` 테이블을 `{ match_id, user_id, side: 'team1'|'team2', is_ad: boolean }` 형태로 설계하면, 단식은 참가자 2행(side만 다름, is_ad 항상 false), 복식은 4행으로 완전히 동일한 구조로 표현 가능 — `matchType`은 여전히 필요(경기 종류 라벨링용)하지만 참가자 저장 방식과는 분리해야 함.
- `winnerId`는 여전히 side 리터럴(`team1`/`team2`/`draw`)로 충분 — participants 테이블과 무관하게 유지 가능.

## domain-model.md에 없던 새 발견사항

1. **라이벌/명승부 판정의 클럽 전체 의존성**: `lib/match-games/special-match.ts`의 `buildCrossPairH2H`는 클럽의 모든 확정 경기(여러 대진표에 걸친)를 입력받아야 동작 — domain-model.md는 개인 경기(personal_matches) 쪽 통계 집계만 다뤘고, 클럽 대진표 쪽의 "누적 cross-pair 집계"는 언급이 없었다. Step3 ERD에서 이 집계를 위한 인덱스/뷰 설계를 추가해야 함.
2. **레이팅 변동은 대진표 단위가 아니라 경기(match) 단위로 이력화**되고, 대진표 상세 화면은 이를 다시 대진표 단위로 합산(`byUserTotal`)한다 — `club_rating_history.match_id`가 `match_game_matches.id`를 참조하는 구조가 화면 요구사항과 일치함을 확인(재설계 시 이 FK 관계는 유지할 가치가 있음).
3. **탈퇴 회원 이름 복원**(`augmentWithFormerMembers`)은 대진표 목록 화면에서도 필요 — 개별 대진표뿐 아니라 클럽 전체 대진표 목록에 등장하는 모든 선수를 대상으로 한 번에 처리됨. 재설계 시 이 헬퍼의 "매치에 등장한 id 중 현재 멤버 목록에 없는 id를 조회" 패턴은 참가자 테이블 정규화 후에도 그대로 유지 가능.

## 변경 파일
- `src/app/(main)/clubs/[clubId]/match-games/page.tsx`
- `src/app/(main)/clubs/[clubId]/match-games/new/page.tsx`
- `src/app/(main)/clubs/[clubId]/match-games/[matchGameId]/page.tsx`
- `src/app/(main)/clubs/[clubId]/match-games/[matchGameId]/edit/page.tsx`
- `src/lib/redesign-fixtures/match-games.ts` (신규)
