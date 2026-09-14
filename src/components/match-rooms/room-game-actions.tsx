'use client'

import type { MatchRoomGame, PersonalMatchConfirmation } from '@/types'
import { PILL_BASE } from '@/lib/dashboard/tokens'
import { buildRoomGameLabels } from '@/lib/match-rooms/game-labels'
import { isRoomGameParty } from '@/lib/match-rooms/game-status'
import { bystanderWaitingBadge, canReopenResult } from '@/lib/personal-matches/confirmation'
import { formatTeams } from '@/lib/personal-matches/labels'
import { ReopenResultButton } from '@/components/personal-matches/reopen-result-button'
import { RoomFreeGameActions } from '@/components/match-rooms/room-free-game-actions'
import { RoomGameNegotiationActions } from '@/components/match-rooms/room-game-negotiation-actions'

type Props = {
    game: MatchRoomGame
    viewerId: string
    /**
     * 협상 행 — 존재 자체는 열람 자격(0052)일 뿐이다. 입력·확인 자격은 `viewerIsParty`(좌석 넷 중 하나, 0059)와
     * `canRespondToProposal`(제안자도 아니고 아직 확인하지 않은 좌석, 0060)이 판정한다.
     */
    confirmation?: PersonalMatchConfirmation
    /** 호스트가 닫은 방(0083) — 확정 결과의 [결과 정정]까지 잠긴다 */
    roomClosed?: boolean
}

const WAITING_BADGE = `${PILL_BASE} border-dashed border-border text-muted-foreground`

/**
 * 매칭 룸 게임 행의 액션 디스패처 — 룸을 떠나지 않고 결과를 입력·확인한다.
 * 여기서는 "협상에 들어갈 수 있는 행인가"만 가르고, 협상 3갈래는 RoomGameNegotiationActions가,
 * 자유 기록은 RoomFreeGameActions가 맡는다(둘 다 공유 상태가 없어 잘라도 규칙이 갈라지지 않는다).
 */
export function RoomGameActions({ game, viewerId, confirmation: c, roomClosed = false }: Props) {
    // 결과가 이미 있으면 스코어만 보여준다 (roomGameStatusLabel도 null).
    // 예외: 상호 확인 게임을 확정한 좌석에게는 [결과 정정]을 남긴다 — 확정 후 오입력을
    // 고칠 유일한 경로이고, 룸을 떠나지 않고 끝내는 이 화면의 원칙과도 같다(0055).
    // 호스트가 닫은 방(0083)은 그 예외마저 닫는다 — RPC room_closed와 짝.
    if (game.setScores.length > 0) {
        const settledRequestId = game.sourceRequestId
        if (!settledRequestId || !canReopenResult(c, { roomClosed })) return null
        return <ReopenResultButton requestId={settledRequestId} description={formatTeams(buildRoomGameLabels(game, viewerId))} />
    }

    // 자유 기록 — 협상이 없어 작성자가 즉시 확정한다
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

    return (
        <RoomGameNegotiationActions
            game={game}
            requestId={requestId}
            viewerId={viewerId}
            confirmation={c}
            badgeClassName={WAITING_BADGE}
        />
    )
}
