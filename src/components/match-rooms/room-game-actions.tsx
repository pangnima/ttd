'use client'

import Link from 'next/link'
import type { MatchRoomGame, PersonalMatchConfirmation } from '@/types'
import { Button } from '@/components/ui/button'
import { PILL_BASE } from '@/lib/dashboard/tokens'
import {
    confirmMatchResultAction, disputeMatchResultAction, proposeMatchResultAction,
} from '@/lib/actions/match-results'
import { updatePersonalMatchSetsAction } from '@/lib/actions/personal-matches'
import { buildRoomGameLabels } from '@/lib/match-rooms/game-labels'
import { canEditRoomGame, isRoomGameParty } from '@/lib/match-rooms/game-status'
import { buildAdLabels, formatOpponents, formatTeams } from '@/lib/personal-matches/labels'
import { isLineupCompleteByRoles } from '@/lib/personal-matches/lineup'
import { MatchResultDialog } from '@/components/personal-matches/match-result-dialog'
import { useResultDialog } from '@/components/personal-matches/use-result-dialog'

type Props = {
    game: MatchRoomGame
    viewerId: string
    /** 협상 행 — **있으면 곧 결과 입력·확인 자격이 있다는 뜻**(RLS가 요청 당사자에게만 내려준다) */
    confirmation?: PersonalMatchConfirmation
}

const WAITING_BADGE = `${PILL_BASE} border-dashed border-border text-muted-foreground`

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

    // 결과가 이미 있으면 스코어만 보여준다 (roomGameStatusLabel도 null)
    if (game.setScores.length > 0) return null

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
    // 협상을 읽을 수 없는 참가자(복식 파트너·상대2) — 대표가 확인해야 확정된다
    if (!c || !requestId || !c.viewerIsParty) {
        return isRoomGameParty(game, viewerId) ? (
            <span className={WAITING_BADGE} title="이 경기의 결과는 작성자와 상대 대표가 확인하면 확정됩니다">
                대표 확인 대기
            </span>
        ) : null
    }

    const reviewMode = c.status === 'proposed' && !c.proposedByMe
    const editingOwn = c.status === 'proposed' && c.proposedByMe

    return (
        <span className="flex items-center gap-2">
            {editingOwn && <span className={WAITING_BADGE}>상대 확인 대기</span>}
            <Button size="sm" variant={reviewMode ? 'default' : 'outline'} className="h-7 text-caption" onClick={d.openDialog}>
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
                    adLabels={buildAdLabels(labels)}
                    submitLabel="확인 요청"
                    onSubmit={(sets) => d.run(() => proposeMatchResultAction(requestId, sets))}
                    isPending={d.isPending}
                    error={d.error}
                />
            )}
        </span>
    )
}
