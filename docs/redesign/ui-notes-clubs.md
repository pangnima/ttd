# UI 데이터 요구사항 — 클럽/멤버/초대 (Step 2a)

> `src/app/(main)/clubs/**`를 더미데이터(`src/lib/redesign-fixtures/clubs.ts`)로 재구현하며 확인한 화면별 데이터 요구사항. Step3 ERD 입력 자료.

## `/clubs` (목록)
- **필드**: `Club`(전체) + 클럽별 `{regular, guest}` 멤버 수 + 조회자의 클럽별 `{status, role}`
- **상태 전이 연결**: 없음(단순 조회). 멤버수 집계는 현재 RPC(`get_club_member_counts`)로 우회 — RLS상 비가입 클럽의 `club_members`를 직접 못 읽기 때문. 재설계 시에도 "비멤버가 클럽별 집계 수치만 볼 수 있어야 한다"는 요구사항은 유지 필요.

## `/clubs/new` (생성)
- **필드**: 폼 입력만(name, description, region, isPublic, courtSchedule, logoUrl) — 조회 데이터 없음.

## `/clubs/[clubId]` (클럽 홈, 가장 복잡)
- **필드**: `Club` 전체, 승인 멤버 목록(`MemberWithUser[]`, 정회원/게스트 분리), 내 멤버십(`status`/`role`), 클럽 레이팅 랭킹(`ClubRatingRankingEntry[]`), 클럽 레이팅 맵(`Record<userId, ClubRating>`), 멤버별 최근 폼(`Map<userId, {wins, losses, draws, recent}>`), 대진표 활동 요약(`ClubMatchGameActivity`), 타입별 승률 랭킹(`ClubWinRateRanking`), (운영자만) 승인대기 멤버(`PendingMemberWithUser[]`), 활동 랭킹(`ActivityRankingEntry[]`)
- **상태 전이 연결**: `isApprovedMember`/`isOwner`/`isOfficerOrOwner` 3단계 가시성 분기가 화면 전체를 관통 — 이건 domain-model.md에 없던 개념이라 **새로 발견한 요구사항**: "클럽 멤버십 상태(pending/approved/rejected) × 역할(owner/officer/member)"이 단순 CRUD 권한이 아니라 **화면 콘텐츠 자체를 분기하는 뷰 모델**로 쓰인다. Step3 ERD에서 `club_members`를 설계할 때 이 3단계 가시성 로직을 어디서 계산할지(쿼리 레이어 vs RPC vs 클라이언트) 결정 필요.
- **불변식 후보**: "레이팅 랭킹은 승인 멤버가 있고 랭킹 데이터가 1건 이상일 때만 폼(최근 5경기) 집계를 추가 조회한다" — 성능 최적화 패턴이므로 재설계 후에도 유지 권장.

## `/clubs/[clubId]/members` (회원 목록)
- **필드**: `Club.name`, 승인 멤버(`MemberWithUser[]`), 승인대기 멤버(같은 `MemberWithUser[]` 셰이프, `status='pending'`), 조회자 역할(`role | null`), 클럽 레이팅 맵
- **발견**: 클럽 홈의 "운영 섹션 승인대기"(`PendingMemberWithUser`, club-dashboard 전용 타입)와 이 페이지의 "승인대기 멤버"(`MemberWithUser` status=pending)가 **서로 다른 타입으로 같은 개념을 표현**하고 있었다 — 재설계 시 하나로 통일할 후보.

## `/clubs/[clubId]/settings` (owner 전용)
- **필드**: `Club` 전체(수정 폼), 활성 초대 토큰(`string | null`)
- **상태 전이 연결**: 레이팅 "전체 재계산" 버튼 → domain-model.md §5(전체 리플레이) 그대로 연결됨.

## `/clubs/join/[token]` (초대 미리보기)
- **필드**: `{name, region, logo_url}`만 있으면 되는 매우 얇은 프리뷰 — 초대 토큰 자체는 회원가입/인증과 달리 재설계 대상(club_invites)이지만, 화면이 필요로 하는 데이터는 최소.
- 로그인 여부(`user`)는 그대로 실제 Supabase auth를 사용 — 재설계 범위(회원가입/인증) 밖이므로 손대지 않음.

## 다형성/공유 자산 관련 메모
- `ClubDetailActions`, `LeaveClubButton`, `ClubMembersPreview`, `ClubAvatar`, `ClubSettingsForm`, `ClubInviteCard`, `InviteJoinButton`, `PendingMembersPanel`, `MatchGameActivityCard`, `ClubAceCard`, `ActivityRankingCard`, `ClubRankingCard`, `MembersContent` 등 기존 컴포넌트는 전부 그대로 재사용됨 — props 시그니처 변경 없이 더미 데이터만 흘려보내도 화면이 정상 동작. 즉 이 영역의 컴포넌트 레이어는 스키마 재설계와 독립적으로 안정적.
