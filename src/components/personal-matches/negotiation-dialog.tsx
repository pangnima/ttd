'use client'

import type { PersonalMatchConfirmation } from '@/types'
import type { AdLabels } from '@/lib/personal-matches/labels'
import {
    confirmMatchResultAction, disputeMatchResultAction, proposeMatchResultAction,
} from '@/lib/actions/match-results'
import {
    canRespondToProposal, disputerTitleOf, formatConfirmProgress, hasDisputeHistory,
} from '@/lib/personal-matches/confirmation'
import { MatchResultDialog } from '@/components/personal-matches/match-result-dialog'
import type { useResultDialog } from '@/components/personal-matches/use-result-dialog'

type Props = {
    requestId: string
    confirmation: PersonalMatchConfirmation
    opponentName: string
    teams: string
    adLabels?: AdLabels
    /**
     * 이의 제기자 표시 이름(disputerNameOf) — 설명줄의 이의 사유 호칭에 쓴다.
     * 0062부터 검토 모드에서도 필요하다: 이의를 거친 재제안을 확인하는 사람이 무엇에 대한 답인지 알아야 한다.
     */
    disputerName?: string
    dialog: ReturnType<typeof useResultDialog>
}

/**
 * 상호 확인 경기의 협상 팝업 — 검토(확인/이의) 또는 제안(입력/수정) 중 하나를 고른다.
 * 개인 경기 카드(MutualResultActions)와 룸 게임 행(RoomGameActions)이 같은 분기를 공유한다.
 * 검토/제안의 갈림은 canRespondToProposal 하나다(0060 만장일치) — 화면과 RPC의 자격이 같은 문장이어야 한다.
 */
export function NegotiationDialog({ requestId, confirmation: c, opponentName, teams, adLabels, disputerName, dialog: d }: Props) {
    // 이의자 호칭은 카드의 사유 줄과 같은 출처를 쓴다 — 인라인하면 화면마다 다른 사람 것으로 보일 수 있다
    const disputer = disputerTitleOf(disputerName)

    if (canRespondToProposal(c)) {
        // 이의를 거친 재제안이면 직전 사유를 함께 보여준다(0062) — 승인 판단에 필요한 유일한 정보다
        const reviewDescription = hasDisputeHistory(c) && c.disputeReason
            ? `${teams} · ${disputer} 직전 이의 사유: ${c.disputeReason}`
            : teams
        return (
            <MatchResultDialog
                mode="review"
                open={d.open}
                onOpenChange={d.setOpen}
                opponentName={opponentName}
                title="경기 결과 확인"
                description={reviewDescription}
                proposedSets={c.proposedSets}
                progressLabel={formatConfirmProgress(c)}
                onConfirm={() => d.run(() => confirmMatchResultAction(requestId))}
                onDispute={(reason) => d.run(() => disputeMatchResultAction(requestId, reason))}
                isPending={d.isPending}
                error={d.error}
            />
        )
    }

    const editingOwn = c.status === 'proposed' && c.proposedByMe
    const disputed = c.status === 'disputed'
    const description = disputed && c.disputeReason
        ? `${teams} · ${disputer} 이의 사유: ${c.disputeReason}`
        : editingOwn
            ? `${teams} · 수정하면 다른 참가자의 확인이 초기화됩니다`
            : `${teams} · 저장하면 회원 참가자 전원에게 확인을 요청합니다`
    return (
        <MatchResultDialog
            mode="propose"
            open={d.open}
            onOpenChange={d.setOpen}
            opponentName={opponentName}
            title={editingOwn ? '제안 결과 수정' : disputed ? '경기 결과 다시 입력' : '경기 결과 입력'}
            description={description}
            initialSets={c.proposedSets.length > 0 ? c.proposedSets : undefined}
            adLabels={adLabels}
            submitLabel="확인 요청"
            onSubmit={(sets) => d.run(() => proposeMatchResultAction(requestId, sets))}
            isPending={d.isPending}
            error={d.error}
        />
    )
}
