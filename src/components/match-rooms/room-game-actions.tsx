'use client'

import Link from 'next/link'
import type { MatchRoomGame, PersonalMatchConfirmation } from '@/types'
import { Button } from '@/components/ui/button'
import { PILL_BASE } from '@/lib/dashboard/tokens'
import { updatePersonalMatchSetsAction } from '@/lib/actions/personal-matches'
import { buildRoomGameLabels } from '@/lib/match-rooms/game-labels'
import { canEditRoomGame, isRoomGameParty } from '@/lib/match-rooms/game-status'
import { bystanderWaitingBadge, canReopenResult, canRespondToProposal } from '@/lib/personal-matches/confirmation'
import { ReopenResultButton } from '@/components/personal-matches/reopen-result-button'
import { buildAdLabels, formatOpponents, formatTeams } from '@/lib/personal-matches/labels'
import { isLineupCompleteByRoles } from '@/lib/personal-matches/lineup'
import { MatchResultDialog } from '@/components/personal-matches/match-result-dialog'
import { NegotiationDialog } from '@/components/personal-matches/negotiation-dialog'
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
 * 매칭 룸 게임 행의 액션 — 룸을 떠나지 않고 결과를 입력·확인한다.
 * 분기 규칙은 개인 경기 카드의 MutualResultActions/FreeMatchActions를 그대로 이식한 것이고,
 * 팀 라벨만 buildRoomGameLabels로 뷰어 관점을 맞춘다(세트 반전은 propose RPC가 서버에서 한다).
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

    // 자유 기록 — 작성자만 손댈 수 있고, 라인업이 차면 즉시 확정된다
    if (game.sourceType !== 'confirmation') {
        if (!canEditRoomGame(game, viewerId)) return null
        const lineupReady = isLineupCompleteByRoles(game.matchType, game.participants.map((p) => p.role))
        if (!lineupReady) {
            return (
                <Link href={`/me/personal-matches/${game.id}/edit`} className="text-caption text-primary hover:underline">
                    참가자 채우기
                </Link>
            )
        }
        return (
            <>
                <Button size="sm" variant="outline" className="h-7 text-caption" onClick={d.openDialog}>결과 입력</Button>
                <MatchResultDialog
                    mode="propose"
                    open={d.open}
                    onOpenChange={d.setOpen}
                    opponentName={opponentName}
                    title="경기 결과 입력"
                    description={teams}
                    adLabels={buildAdLabels(labels)}
                    onSubmit={(sets) => d.run(() => updatePersonalMatchSetsAction(game.id, sets))}
                    isPending={d.isPending}
                    error={d.error}
                />
            </>
        )
    }

    const requestId = game.sourceRequestId
    // 좌석 판정에 실패한 관점 행(참가자 미부착 등) — 0059 이후 폴백 경로다.
    if (!c || !requestId || !c.viewerIsParty) {
        if (!isRoomGameParty(game, viewerId)) return null
        const badge = bystanderWaitingBadge(c)
        return <span className={WAITING_BADGE} title={badge.title}>{badge.label}</span>
    }

    const reviewMode = canRespondToProposal(c)
    const editingOwn = c.status === 'proposed' && c.proposedByMe

    // 내 확인은 끝났고 남은 좌석을 기다린다(0060) — 버튼 없이 배지만
    if (c.status === 'proposed' && !reviewMode && !editingOwn) {
        return (
            <span className="flex items-center gap-2">
                <span className={WAITING_BADGE} title={REMAINING_TITLE}>확인 완료</span>
                <ResultConfirmProgressBadge confirmation={c} title={REMAINING_TITLE} />
            </span>
        )
    }

    return (
        <span className="flex items-center gap-2">
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
                dialog={d}
            />
        </span>
    )
}
