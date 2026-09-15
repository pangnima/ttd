import { ATTENTION_PILL, CARD_BASE, TYPO } from '@/lib/dashboard/tokens'
import { GUIDE_MEMBERS_DETAIL, GUIDE_VIEWER_ID } from '@/lib/guide/fixtures'
import { buildMemberRows } from '@/lib/match-rooms/members-view'
import { ROOM_TURN_PILL } from '@/lib/match-rooms/room-turn'
import { resolveResultBadge } from '@/lib/personal-matches/result-badge'
import { GuideExample } from '@/components/guide/guide-example'
import { RoomMemberRow } from '@/components/match-rooms/room-member-row'

/** 승·패·무 배지 — 개인 경기 카드와 같은 함수에서 뽑는다 */
const OUTCOME_SETS = [[{ me: 6, opp: 3 }], [{ me: 3, opp: 6 }], [{ me: 4, opp: 4 }]]
const TURN_PILLS = [ROOM_TURN_PILL.enterResult, ROOM_TURN_PILL.confirmResult]

/**
 * 용어 섹션의 그림 — 명단 한 벌(호스트·참가·초대 대기·비회원)과 배지 범례.
 * 행은 `buildMemberRows`가 실제 detail에서 파생하고(호스트 액션은 넘기지 않아 버튼이 없다),
 * 범례의 배지·필은 전부 실제 상수·함수에서 나온다.
 */
export function MemberRolesExample() {
    const rows = buildMemberRows(GUIDE_MEMBERS_DETAIL)
    return (
        <GuideExample caption="명단의 상태 칩 네 가지와, 카드에 붙는 결과 배지·내 차례 표시입니다.">
            <div className="space-y-4">
                <div className={`${CARD_BASE} divide-y divide-border`}>
                    {rows.map((row) => (
                        <RoomMemberRow
                            key={row.key}
                            row={row}
                            roomId={GUIDE_MEMBERS_DETAIL.room.id}
                            isSettled={false}
                            viewerId={GUIDE_VIEWER_ID}
                        />
                    ))}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <span className={TYPO.caption}>결과</span>
                    {OUTCOME_SETS.map((sets, i) => {
                        const badge = resolveResultBadge(sets)
                        return (
                            <span key={i} className={`rounded-sm px-2 py-1 text-caption font-bold ${badge.badgeClass}`}>
                                {badge.label}
                            </span>
                        )
                    })}
                    <span className={TYPO.caption}>내 차례</span>
                    {TURN_PILLS.map((label) => (
                        <span key={label} className={ATTENTION_PILL}>{label}</span>
                    ))}
                </div>
            </div>
        </GuideExample>
    )
}
