'use client'

import type { PersonalMatch } from '@/types'
import { Button } from '@/components/ui/button'
import {
    confirmMatchResultAction, disputeMatchResultAction, proposeMatchResultAction,
} from '@/lib/actions/match-results'
import { buildAdLabels, formatOpponents, formatTeams } from '@/lib/personal-matches/labels'
import { hasResult } from '@/lib/personal-matches/winner'
import { MatchResultDialog } from '@/components/personal-matches/match-result-dialog'
import { useResultDialog } from '@/components/personal-matches/use-result-dialog'

type Props = { match: PersonalMatch }

const LOCKED_BADGE = 'text-caption px-1.5 py-0.5 rounded-sm border border-primary/40 text-primary'
const WAITING_BADGE = 'text-caption px-1.5 py-0.5 rounded-sm border border-dashed border-border text-muted-foreground'

/**
 * 상호 확인 경기(source_request_id 보유)의 카드 액션 — 결과 제안/확인 상태별 분기.
 *  - 확정(winner 있음/confirmed): '상호 확인' 잠금 배지
 *  - none/disputed: [결과 입력] → propose (disputed면 사유 표시)
 *  - proposed & 내 제안: '상대 확인 대기' + [제안 수정]
 *  - proposed & 상대 제안: [결과 확인] → review (확인/이의)
 * 복식은 상대팀 대표 1명과 주고받으며, 세트별 애드/듀스도 제안에 포함된다.
 */
export function MutualResultActions({ match }: Props) {
    const d = useResultDialog()
    const c = match.confirmation
    const requestId = match.sourceRequestId
    const opponentName = formatOpponents(match)
    const teams = formatTeams(match)

    if (hasResult(match) || !c || !requestId || c.status === 'confirmed') {
        return (
            <span className={LOCKED_BADGE} title="상대 확인으로 확정된 경기는 수정·삭제할 수 없습니다">
                상호 확인
            </span>
        )
    }

    const reviewMode = c.status === 'proposed' && !c.proposedByMe
    const editingOwn = c.status === 'proposed' && c.proposedByMe

    return (
        <span className="flex items-center gap-2">
            {editingOwn && <span className={WAITING_BADGE}>상대 확인 대기</span>}
            {c.status === 'disputed' && (
                <span className={WAITING_BADGE} title={c.disputeReason ?? '상대가 제안 결과에 이의를 제기했습니다'}>
                    이의 제기됨
                </span>
            )}
            <Button
                size="sm"
                variant={reviewMode ? 'default' : 'outline'}
                className="h-7 text-caption"
                onClick={d.openDialog}
            >
                {reviewMode ? '결과 확인' : editingOwn ? '제안 수정' : '결과 입력'}
            </Button>

            {reviewMode ? (
                <MatchResultDialog
                    mode="review"
                    open={d.open}
                    onOpenChange={d.setOpen}
                    opponentName={opponentName}
                    title="경기 결과 확인"
                    description={teams}
                    proposedSets={c.proposedSets}
                    onConfirm={() => d.run(() => confirmMatchResultAction(requestId))}
                    onDispute={(reason) => d.run(() => disputeMatchResultAction(requestId, reason))}
                    isPending={d.isPending}
                    error={d.error}
                />
            ) : (
                <MatchResultDialog
                    mode="propose"
                    open={d.open}
                    onOpenChange={d.setOpen}
                    opponentName={opponentName}
                    title={editingOwn ? '제안 결과 수정' : '경기 결과 입력'}
                    description={
                        c.status === 'disputed' && c.disputeReason
                            ? `${teams} · 상대 이의 사유: ${c.disputeReason}`
                            : `${teams} · 저장하면 상대에게 확인을 요청합니다`
                    }
                    initialSets={c.proposedSets.length > 0 ? c.proposedSets : undefined}
                    adLabels={buildAdLabels(match)}
                    submitLabel="확인 요청"
                    onSubmit={(sets) => d.run(() => proposeMatchResultAction(requestId, sets))}
                    isPending={d.isPending}
                    error={d.error}
                />
            )}
        </span>
    )
}
