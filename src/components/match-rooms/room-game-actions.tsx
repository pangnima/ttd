'use client'

import type { MatchRoomGame, PersonalMatchConfirmation } from '@/types'
import { Button } from '@/components/ui/button'
import { PILL_BASE } from '@/lib/dashboard/tokens'
import { buildRoomGameLabels } from '@/lib/match-rooms/game-labels'
import { isRoomGameParty } from '@/lib/match-rooms/game-status'
import {
    bystanderWaitingBadge, canReopenResult, canRespondToProposal, disputerNameOf,
} from '@/lib/personal-matches/confirmation'
import { DisputedResultActions } from '@/components/personal-matches/disputed-result-actions'
import { ReopenResultButton } from '@/components/personal-matches/reopen-result-button'
import { buildAdLabels, formatOpponents, formatTeams } from '@/lib/personal-matches/labels'
import { RoomFreeGameActions } from '@/components/match-rooms/room-free-game-actions'
import { NegotiationDialog } from '@/components/personal-matches/negotiation-dialog'
import { ReentryContextBadge } from '@/components/personal-matches/reentry-context-badge'
import { ResultConfirmProgressBadge } from '@/components/personal-matches/result-confirm-progress-badge'
import { useResultDialog } from '@/components/personal-matches/use-result-dialog'

type Props = {
    game: MatchRoomGame
    viewerId: string
    /**
     * 협상 행 — 존재 자체는 열람 자격(0052)일 뿐이다. 입력·확인 자격은 `viewerIsParty`(좌석 넷 중 하나, 0059)와
     * `canRespondToProposal`(제안자도 아니고 아직 확인하지 않은 좌석, 0060)이 판정한다.
     */
    confirmation?: PersonalMatchConfirmation
}

const WAITING_BADGE = `${PILL_BASE} border-dashed border-border text-muted-foreground`
const REMAINING_TITLE = '남은 회원 참가자가 모두 확인하면 확정됩니다'

/**
 * 매칭 룸 게임 행의 **상호 확인** 액션 — 룸을 떠나지 않고 결과를 입력·확인한다.
 * 분기 규칙은 개인 경기 카드의 MutualResultActions를 그대로 이식한 것이고,
 * 팀 라벨만 buildRoomGameLabels로 뷰어 관점을 맞춘다(세트 반전은 propose RPC가 서버에서 한다).
 * 자유 기록 갈래는 RoomFreeGameActions로 분리했다(0062) — 공유 상태가 없어 잘라도 규칙이 갈라지지 않는다.
 */
export function RoomGameActions({ game, viewerId, confirmation: c }: Props) {
    const d = useResultDialog()
    const labels = buildRoomGameLabels(game, viewerId)
    const teams = formatTeams(labels)
    const opponentName = formatOpponents(labels)

    // 결과가 이미 있으면 스코어만 보여준다 (roomGameStatusLabel도 null).
    // 예외: 상호 확인 게임을 확정한 좌석에게는 [결과 정정]을 남긴다 — 확정 후 오입력을
    // 고칠 유일한 경로이고, 룸을 떠나지 않고 끝내는 이 화면의 원칙과도 같다(0055).
    if (game.setScores.length > 0) {
        const settledRequestId = game.sourceRequestId
        if (!settledRequestId || !canReopenResult(c)) return null
        return <ReopenResultButton requestId={settledRequestId} description={teams} />
    }

    // 자유 기록 — 협상이 없어 작성자가 즉시 확정한다(별 컴포넌트)
    if (game.sourceType !== 'confirmation') {
        return <RoomFreeGameActions game={game} viewerId={viewerId} />
    }

    const requestId = game.sourceRequestId
    // 좌석 판정에 실패한 관점 행(참가자 미부착 등) — 0059 이후 폴백 경로다.
    if (!c || !requestId || !c.viewerIsParty) {
        if (!isRoomGameParty(game, viewerId)) return null
        const badge = bystanderWaitingBadge(c)
        return <span className={WAITING_BADGE} title={badge.title}>{badge.label}</span>
    }

    // 이름 해석용 좌석은 작성자 + 라인업 회원 (0061)
    const disputerName = disputerNameOf(c, [{ userId: game.ownerUserId, name: game.ownerName }, ...game.participants])

    // 이의(0061) — 개인 경기 카드와 같은 컴포넌트
    if (c.status === 'disputed') {
        return (
            <DisputedResultActions
                requestId={requestId}
                confirmation={c}
                opponentName={opponentName}
                teams={teams}
                adLabels={buildAdLabels(labels)}
                disputerName={disputerName}
                badgeClassName={WAITING_BADGE}
            />
        )
    }

    const reviewMode = canRespondToProposal(c)
    const editingOwn = c.status === 'proposed' && c.proposedByMe
    // 이의를 거친 재제안이면 어느 분기든 "무엇에 대한 답인가"를 먼저 말한다(0062)
    const reentry = <ReentryContextBadge confirmation={c} disputerName={disputerName} badgeClassName={WAITING_BADGE} />

    // 내 확인은 끝났고 남은 좌석을 기다린다(0060) — 버튼 없이 배지만
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
            <Button size="sm" variant={reviewMode ? 'default' : 'outline'} className="h-7 text-caption" onClick={d.openDialog}>
                {reviewMode ? '결과 확인' : editingOwn ? '제안 수정' : '결과 입력'}
            </Button>
            <NegotiationDialog
                requestId={requestId}
                confirmation={c}
                opponentName={opponentName}
                teams={teams}
                adLabels={buildAdLabels(labels)}
                disputerName={disputerName}
                dialog={d}
            />
        </span>
    )
}
