'use client'

import Link from 'next/link'
import { TEXT_LINK } from '@/lib/dashboard/tokens'
import type { MatchRoomGame } from '@/types'
import { Button } from '@/components/ui/button'
import { updatePersonalMatchSetsAction } from '@/lib/actions/personal-matches'
import { buildRoomGameLabels } from '@/lib/match-rooms/game-labels'
import { canEditRoomGame } from '@/lib/match-rooms/game-status'
import { buildAdLabels, formatOpponents, formatTeams } from '@/lib/personal-matches/labels'
import { isLineupCompleteByRoles } from '@/lib/personal-matches/lineup'
import { MatchResultDialog } from '@/components/personal-matches/match-result-dialog'
import { useResultDialog } from '@/components/personal-matches/use-result-dialog'

type Props = { game: MatchRoomGame; viewerId: string }

/**
 * 매칭 룸 게임 행의 **자유 기록** 액션 — 상대가 전원 비회원이라 협상이 없고, 작성자가 즉시 확정한다.
 * 라인업이 덜 찼으면(모집 중) 결과를 넣을 수 없으므로 참가자 채우기로 보낸다.
 *
 * RoomGameActions에서 분리한 갈래다(0062) — 한 컴포넌트가 협상 5분기와 자유 기록 3분기를 함께 들고 있어
 * 100줄 규약을 넘겼다. 협상 쪽 분기와 공유하는 상태가 없어 잘라 내도 규칙이 갈라지지 않는다.
 */
export function RoomFreeGameActions({ game, viewerId }: Props) {
    const d = useResultDialog()
    if (!canEditRoomGame(game, viewerId)) return null

    const labels = buildRoomGameLabels(game, viewerId)
    const lineupReady = isLineupCompleteByRoles(game.matchType, game.participants.map((p) => p.role))
    if (!lineupReady) {
        return (
            <Link href={`/me/personal-matches/${game.id}/edit`} className={`text-caption ${TEXT_LINK}`}>
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
                opponentName={formatOpponents(labels)}
                title="경기 결과 입력"
                description={formatTeams(labels)}
                adLabels={buildAdLabels(labels)}
                onSubmit={(sets) => d.run(() => updatePersonalMatchSetsAction(game.id, sets))}
                isPending={d.isPending}
                error={d.error}
            />
        </>
    )
}
