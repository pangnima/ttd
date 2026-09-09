'use client'

import type { LineupResult } from '@/lib/match-rooms/lineup'
import { CARD_BASE, EMPTY_BLOCK, PILL_BASE, TYPO } from '@/lib/dashboard/tokens'
import { RoomLineupGameCard } from '@/components/match-rooms/room-lineup-game-card'

type Props = {
    result: LineupResult
    nameOf: (key: string) => string
}

/**
 * 미리보기 — 게임 카드 목록 + 선수별 출전 횟수.
 * 만들지 못한 이유(경고)는 RoomLineupNotices가 이 위에서 먼저 말한다.
 */
export function RoomLineupPreview({ result, nameOf }: Props) {
    if (result.games.length === 0) {
        return <div className={EMPTY_BLOCK}>조건에 맞는 대진을 만들지 못했습니다.</div>
    }

    return (
        <div className="space-y-3">
            <ol className={`${CARD_BASE} divide-y divide-border`}>
                {result.games.map((g, i) => (
                    <RoomLineupGameCard
                        key={g.seq}
                        game={g}
                        restingNames={(result.resting[i] ?? []).map(nameOf)}
                    />
                ))}
            </ol>

            <div>
                <p className={`${TYPO.eyebrow} mb-1.5`}>출전 횟수</p>
                <ul className="flex flex-wrap gap-1.5">
                    {Object.entries(result.playCounts).map(([key, count]) => (
                        <li key={key} className={`${PILL_BASE} border-border text-foreground tabular-nums`}>
                            {nameOf(key)} {count}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}
