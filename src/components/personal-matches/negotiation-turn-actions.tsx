'use client'

import type { PersonalMatchConfirmation } from '@/types'
import { Button } from '@/components/ui/button'
import type { AdLabels } from '@/lib/personal-matches/labels'
import type { NamedSeat } from '@/lib/personal-matches/confirmation'
import { canRespondToProposal, proposerNameOf } from '@/lib/personal-matches/confirmation'
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
    seats: NamedSeat[]
    badgeClassName: string
}

const REMAINING_TITLE = '남은 회원 참가자가 모두 확인하면 확정됩니다'

/**
 * 협상에서 **내가 움직일 차례**인 갈래 — [결과 입력] / [결과 확인] / [제안 수정] + 맥락 배지.
 *
 * 개인 경기 카드(MutualResultActions)와 룸 게임 행(RoomGameActions)이 똑같이 들고 있던 꼬리 블록이라
 * 두 컴포넌트가 나란히 100줄 규약을 넘겼다. 규칙은 여기 한 벌만 두고 라벨만 호출부가 넘긴다 —
 * 분기를 복제해 두면 한쪽만 고쳐졌을 때 같은 협상이 화면마다 다른 버튼을 보여준다.
 */
export function NegotiationTurnActions({
    requestId, confirmation: c, opponentName, teams, adLabels, disputerName, seats, badgeClassName,
}: Props) {
    const d = useResultDialog()
    const reviewMode = canRespondToProposal(c)
    const editingOwn = c.status === 'proposed' && c.proposedByMe

    return (
        <span className="flex flex-col items-end gap-1">
            <span className="flex items-center gap-2">
                {/* 이의를 거친 재제안이면 어느 갈래든 "무엇에 대한 답인가"를 먼저 말한다(0062) */}
                <ReentryContextBadge confirmation={c} disputerName={disputerName} badgeClassName={badgeClassName} />
                {editingOwn && (
                    <>
                        <span className={badgeClassName} title={REMAINING_TITLE}>참가자 확인 대기</span>
                        <ResultConfirmProgressBadge confirmation={c} title={REMAINING_TITLE} />
                    </>
                )}
                <Button
                    size="sm"
                    variant={reviewMode ? 'default' : 'outline'}
                    className="h-7 text-caption"
                    onClick={d.openDialog}
                >
                    {reviewMode ? '결과 확인' : editingOwn ? '제안 수정' : '결과 입력'}
                </Button>
                <NegotiationDialog
                    requestId={requestId}
                    confirmation={c}
                    opponentName={opponentName}
                    teams={teams}
                    adLabels={adLabels}
                    disputerName={disputerName}
                    proposerName={proposerNameOf(c, seats)}
                    dialog={d}
                />
            </span>
            <DisputeReasonLine confirmation={c} disputerName={disputerName} className="text-right" />
            {/* 배지가 '2/4명 확인'이라고만 하면 재촉할 대상을 특정할 수 없다 — 스스로 렌더 여부를 판정한다 */}
            <SeatConfirmStatusLine confirmation={c} seats={seats} className="text-right" />
        </span>
    )
}
