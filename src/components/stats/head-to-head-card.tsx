'use client'

import { useState, useMemo } from 'react'
import { aggregateHeadToHeadUnified, type UnifiedHeadToHeadDetail } from '@/lib/analytics/head-to-head'
import type { UnifiedHeadToHead } from '@/lib/queries/stats'
import type { CourtSurface, Match, User } from '@/types'
import type { SettledPersonalMatch } from '@/lib/personal-matches/winner'
import { CARD_BASE, TYPO } from '@/lib/dashboard/tokens'
import { H2HDetail } from '@/components/stats/head-to-head/h2h-detail'
import { H2HOpponentSelect, h2hOpponentKey } from '@/components/stats/head-to-head/h2h-opponent-select'

type Props = {
    h2hList: UnifiedHeadToHead[]
    bundle: {
        matches: Match[]
        gameMetaById: Record<string, { date: string }>
        personalMatches: SettledPersonalMatch[]  // 분해본(personalGames)
        courtSurfaceByMatchId: Record<string, CourtSurface | null>
    }
    userId: string
    userMap: Map<string, User>
}

/**
 * 1:1 맞대결 비교 — 상대를 고르면 그 상대와의 전적을 집계해 보여준다.
 * 집계는 `lib/analytics/head-to-head.ts`(순수), 표시는 `head-to-head/*`로 나뉜다(Week 69 — 368줄이던 파일).
 */
export function HeadToHeadCard({ h2hList, bundle, userId, userMap }: Props) {
    const [selectedKey, setSelectedKey] = useState<string>('')

    const selectedEntry = useMemo(
        () => h2hList.find((h) => h2hOpponentKey(h) === selectedKey),
        [h2hList, selectedKey],
    )

    const detail = useMemo<UnifiedHeadToHeadDetail | null>(() => {
        if (!selectedEntry) return null
        return aggregateHeadToHeadUnified(
            bundle,
            userId,
            { userId: selectedEntry.opponentUserId, name: selectedEntry.opponentName },
            userMap,
        )
    }, [bundle, userId, selectedEntry, userMap])

    const myName = userMap.get(userId)?.name ?? '나'

    // 상대 표시명: opponentName 우선, 없으면 userMap, 없으면 ID 앞 8자
    const opponentDisplayName = useMemo(() => {
        if (!selectedEntry) return ''
        const { opponentName, opponentUserId } = selectedEntry
        if (opponentName) return opponentName
        if (opponentUserId) return userMap.get(opponentUserId)?.name ?? opponentUserId.slice(0, 8)
        return ''
    }, [selectedEntry, userMap])

    if (h2hList.length === 0) return null

    return (
        <section className="space-y-3">
            <div className="flex items-center justify-between gap-x-3 gap-y-2 flex-wrap">
                <h2 className={`${TYPO.h4} shrink-0`}>1:1 맞대결 비교</h2>
                <H2HOpponentSelect h2hList={h2hList} userMap={userMap} value={selectedKey} onChange={setSelectedKey} />
            </div>

            <div className={`${CARD_BASE} p-4`}>
                {detail ? (
                    detail.totalMatches > 0 ? (
                        <H2HDetail detail={detail} myName={myName} opponentDisplayName={opponentDisplayName} />
                    ) : (
                        <p className="text-body2 text-muted-foreground text-center py-4">
                            해당 상대와의 맞대결 기록이 없습니다
                        </p>
                    )
                ) : (
                    <p className="text-body2 text-muted-foreground text-center py-6">
                        상대를 선택하면 1:1 대결 기록을 확인할 수 있습니다
                    </p>
                )}
            </div>
        </section>
    )
}
