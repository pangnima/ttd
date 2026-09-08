'use client'

import type { PersonalMatch } from '@/types'
import { Button } from '@/components/ui/button'
import { bystanderWaitingBadge, canRespondToProposal, disputerNameOf } from '@/lib/personal-matches/confirmation'
import { buildAdLabels, formatOpponents, formatTeams, namedSeatsOf } from '@/lib/personal-matches/labels'
import { hasResult } from '@/lib/personal-matches/winner'
import { MutualLockedBadge } from '@/components/personal-matches/match-actions'
import { DisputedResultActions } from '@/components/personal-matches/disputed-result-actions'
import { NegotiationDialog } from '@/components/personal-matches/negotiation-dialog'
import { ReentryContextBadge } from '@/components/personal-matches/reentry-context-badge'
import { ResultConfirmProgressBadge } from '@/components/personal-matches/result-confirm-progress-badge'
import { useResultDialog } from '@/components/personal-matches/use-result-dialog'

type Props = { match: PersonalMatch }

const WAITING_BADGE = 'text-caption px-1.5 py-0.5 rounded-sm border border-dashed border-border text-muted-foreground'
const REMAINING_TITLE = '남은 회원 참가자가 모두 확인하면 확정됩니다'

/**
 * 상호 확인 경기(source_request_id 보유)의 카드 액션 — 결과 제안/확인 상태별 분기.
 *  - 확정(winner 있음/confirmed): '상호 확인' 잠금 배지 / none: [결과 입력] → propose
 *  - disputed: 이의자 배지 + [다시 입력] (DisputedResultActions — 제안자만 강조, 0061)
 *  - proposed: 내 제안이면 '참가자 확인 대기' + [제안 수정], 이미 확인했으면 '확인 완료'(버튼 없음),
 *    아직 미확인이면 [결과 확인] → review. 확인은 좌석별 만장일치다(0060, 애드/듀스도 제안에 포함)
 *  - 이의를 거친 재제안이면 위 세 갈래 앞에 ReentryContextBadge를 붙여 "누구의 이의에 대한 답인가"를 말한다(0062)
 */
export function MutualResultActions({ match }: Props) {
    const d = useResultDialog()
    const c = match.confirmation
    const requestId = match.sourceRequestId

    // 좌석 판정에 실패한 관점 행(참가자 미부착 등)은 협상 자격이 없다 — 0059 이후 폴백 경로다.
    if (!hasResult(match) && requestId && !c?.viewerIsParty) {
        const badge = bystanderWaitingBadge(c)
        return <span className={WAITING_BADGE} title={badge.title}>{badge.label}</span>
    }

    if (hasResult(match) || !c || !requestId || c.status === 'confirmed') return <MutualLockedBadge />

    const disputerName = disputerNameOf(c, namedSeatsOf(match))

    if (c.status === 'disputed') {
        return (
            <DisputedResultActions
                requestId={requestId}
                confirmation={c}
                opponentName={formatOpponents(match)}
                teams={formatTeams(match)}
                adLabels={buildAdLabels(match)}
                disputerName={disputerName}
                badgeClassName={WAITING_BADGE}
            />
        )
    }

    const reviewMode = canRespondToProposal(c)
    const editingOwn = c.status === 'proposed' && c.proposedByMe
    const reentry = <ReentryContextBadge confirmation={c} disputerName={disputerName} badgeClassName={WAITING_BADGE} />

    // 내 확인은 끝났고 남은 좌석을 기다린다 — 버튼 없이 배지만. 이 분기가 없으면 눌렀을 때 RPC가 튕기는 버튼이 뜬다.
    if (c.status === 'proposed' && !reviewMode && !editingOwn) {
        return (
            <span className="flex items-center gap-2">
                {reentry}
                <span className={WAITING_BADGE} title={REMAINING_TITLE}>확인 완료</span>
                <ResultConfirmProgressBadge confirmation={c} title={REMAINING_TITLE} />
            </span>
        )
    }

    return (
        <span className="flex items-center gap-2">
            {reentry}
            {editingOwn && (
                <>
                    <span className={WAITING_BADGE} title={REMAINING_TITLE}>참가자 확인 대기</span>
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
                opponentName={formatOpponents(match)}
                teams={formatTeams(match)}
                adLabels={buildAdLabels(match)}
                disputerName={disputerName}
                dialog={d}
            />
        </span>
    )
}
