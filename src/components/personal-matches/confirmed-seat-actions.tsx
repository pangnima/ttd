'use client'

import type { PersonalMatchConfirmation } from '@/types'
import { Button } from '@/components/ui/button'
import type { AdLabels } from '@/lib/personal-matches/labels'
import type { NamedSeat } from '@/lib/personal-matches/confirmation'
import { NegotiationDialog } from '@/components/personal-matches/negotiation-dialog'
import { DisputeReasonLine } from '@/components/personal-matches/dispute-reason-line'
import { ReentryContextBadge } from '@/components/personal-matches/reentry-context-badge'
import { SeatConfirmStatusLine } from '@/components/personal-matches/seat-confirm-status-line'
import { ResultConfirmProgressBadge } from '@/components/personal-matches/result-confirm-progress-badge'
import { useResultDialog } from '@/components/personal-matches/use-result-dialog'

type Props = {
    requestId: string
    confirmation: PersonalMatchConfirmation
    opponentName: string
    teams: string
    adLabels?: AdLabels
    disputerName?: string
    /** 이름 해석·남은 확인자 명단에 쓰는 좌석 */
    seats: NamedSeat[]
    badgeClassName: string
}

const REMAINING_TITLE = '남은 회원 참가자가 모두 확인하면 확정됩니다'

/**
 * 내 확인은 끝났고 남은 좌석을 기다리는 카드 액션 — 개인 경기 카드(MutualResultActions)와
 * 룸 게임 행(RoomGameActions)이 같은 분기를 공유한다.
 *
 * 버튼이 [이의 제기] 하나뿐인 이유: 확인은 이미 했으므로 다시 누를 수 없지만(RPC `result_already_confirmed_by_seat`),
 * 이의는 정산 전이면 확인한 좌석에게도 열려 있다(0060 §7, canDisputeProposal). 종전에는 이 분기에 버튼이 없어
 * "참여한 사람 모두 이의 신청 가능"이 DB에서만 참이었다.
 */
export function ConfirmedSeatActions({
    requestId, confirmation: c, opponentName, teams, adLabels, disputerName, seats, badgeClassName,
}: Props) {
    const d = useResultDialog()

    return (
        <span className="flex flex-col items-end gap-1">
            <span className="flex items-center gap-2">
                <ReentryContextBadge confirmation={c} disputerName={disputerName} badgeClassName={badgeClassName} />
                <span className={badgeClassName} title={REMAINING_TITLE}>확인 완료</span>
                <ResultConfirmProgressBadge confirmation={c} title={REMAINING_TITLE} />
                <Button size="sm" variant="outline" className="h-7 text-caption" onClick={d.openDialog}>
                    이의 제기
                </Button>
                <NegotiationDialog
                    requestId={requestId}
                    confirmation={c}
                    opponentName={opponentName}
                    teams={teams}
                    adLabels={adLabels}
                    disputerName={disputerName}
                    dialog={d}
                />
            </span>
            <DisputeReasonLine confirmation={c} disputerName={disputerName} className="text-right" />
            <SeatConfirmStatusLine confirmation={c} seats={seats} className="text-right" />
        </span>
    )
}
