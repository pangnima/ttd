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
import { bystanderWaitingBadge, canReopenResult } from '@/lib/personal-matches/confirmation'
import { ReopenResultButton } from '@/components/personal-matches/reopen-result-button'
import { buildAdLabels, formatOpponents, formatTeams } from '@/lib/personal-matches/labels'
import { isLineupCompleteByRoles } from '@/lib/personal-matches/lineup'
import { MatchResultDialog } from '@/components/personal-matches/match-result-dialog'
import { useResultDialog } from '@/components/personal-matches/use-result-dialog'

type Props = {
    game: MatchRoomGame
    viewerId: string
    /**
     * 협상 행 — 0052 이후 복식 파트너·상대2도 **읽기만** 하므로 존재 자체는 자격이 아니다.
     * 결과 입력·확인 자격의 판정은 `viewerIsParty`(요청자 또는 상대 대표)다.
     */
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

    // 결과가 이미 있으면 스코어만 보여준다 (roomGameStatusLabel도 null).
    // 예외: 상호 확인 게임을 확정한 당사자에게는 [결과 정정]을 남긴다 — 확정 후 오입력을
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
    // 액션 자격이 없는 참가자(복식 파트너·상대2) — 대표가 확인해야 확정된다.
    // 협상 행은 0052로 읽히므로 배지 문구만 실제 상태로 승격한다.
    if (!c || !requestId || !c.viewerIsParty) {
        if (!isRoomGameParty(game, viewerId)) return null
        const badge = bystanderWaitingBadge(c)
        return <span className={WAITING_BADGE} title={badge.title}>{badge.label}</span>
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
