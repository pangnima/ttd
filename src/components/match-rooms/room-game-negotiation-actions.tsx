'use client'

import type { MatchRoomGame, PersonalMatchConfirmation } from '@/types'
import { canRespondToProposal, disputerNameOf } from '@/lib/personal-matches/confirmation'
import { buildAdLabels, formatOpponents, formatTeams } from '@/lib/personal-matches/labels'
import { buildRoomGameLabels } from '@/lib/match-rooms/game-labels'
import { DisputedResultActions } from '@/components/personal-matches/disputed-result-actions'
import { ConfirmedSeatActions } from '@/components/personal-matches/confirmed-seat-actions'
import { NegotiationTurnActions } from '@/components/personal-matches/negotiation-turn-actions'

type Props = {
    game: MatchRoomGame
    requestId: string
    viewerId: string
    confirmation: PersonalMatchConfirmation
    badgeClassName: string
}

/**
 * 방 게임 행의 협상 3갈래 — 이의 / 내 확인 완료 / 내 차례.
 * 개인 경기 카드(MutualResultActions)와 같은 순서·같은 하위 컴포넌트를 쓰고, 라벨만 뷰어 관점으로 뒤집는다
 * (세트 반전은 propose RPC가 서버에서 한다). 확정·자유 기록·비좌석 폴백은 호출부가 먼저 걸러 낸다.
 */
export function RoomGameNegotiationActions({ game, requestId, viewerId, confirmation: c, badgeClassName }: Props) {
    const labels = buildRoomGameLabels(game, viewerId)
    const teams = formatTeams(labels)
    const opponentName = formatOpponents(labels)
    const adLabels = buildAdLabels(labels)
    // 이름 해석·남은 확인자 명단의 좌석 = 작성자 + 라인업 회원 (0061)
    const seats = [{ userId: game.ownerUserId, name: game.ownerName }, ...game.participants]
    const disputerName = disputerNameOf(c, seats)

    // 이의(0061) — 개인 경기 카드와 같은 컴포넌트
    if (c.status === 'disputed') {
        return (
            <DisputedResultActions
                requestId={requestId}
                confirmation={c}
                opponentName={opponentName}
                teams={teams}
                adLabels={adLabels}
                disputerName={disputerName}
                badgeClassName={badgeClassName}
            />
        )
    }

    // 내 확인은 끝났고 남은 좌석을 기다린다(0060) — [이의 제기]만 남는다
    const editingOwn = c.status === 'proposed' && c.proposedByMe
    if (c.status === 'proposed' && !canRespondToProposal(c) && !editingOwn) {
        return (
            <ConfirmedSeatActions
                requestId={requestId}
                confirmation={c}
                opponentName={opponentName}
                teams={teams}
                adLabels={adLabels}
                disputerName={disputerName}
                seats={seats}
                badgeClassName={badgeClassName}
            />
        )
    }

    return (
        <NegotiationTurnActions
            requestId={requestId}
            confirmation={c}
            opponentName={opponentName}
            teams={teams}
            adLabels={adLabels}
            disputerName={disputerName}
            seats={seats}
            badgeClassName={badgeClassName}
        />
    )
}
