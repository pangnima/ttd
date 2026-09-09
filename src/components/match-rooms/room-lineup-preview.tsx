'use client'

import { teamDiff, type LineupPlayer } from '@/lib/match-games/lineup-core'
import type { LineupResult } from '@/lib/match-rooms/lineup'
import { CARD_BASE, EMPTY_BLOCK, PILL_BASE, TYPO } from '@/lib/dashboard/tokens'

type Props = {
    result: LineupResult
    nameOf: (key: string) => string
}

const teamNames = (team: LineupPlayer[]) => team.map((p) => p.name).join(' · ')
const teamNtrp = (team: LineupPlayer[]) => team.reduce((sum, p) => sum + p.ntrp, 0)

/** 미리보기 — 게임별 팀 구성과 전력 차, 쉬는 사람, 선수별 출전 횟수 */
export function RoomLineupPreview({ result, nameOf }: Props) {
    if (result.games.length === 0) {
        return <div className={EMPTY_BLOCK}>{result.warnings[0] ?? '대진을 만들 수 없습니다.'}</div>
    }

    return (
        <div className="space-y-3">
            <ol className={`${CARD_BASE} divide-y divide-border`}>
                {result.games.map((g, i) => (
                    <li key={g.seq} className="px-3 py-2.5 space-y-1">
                        <div className="flex items-baseline justify-between gap-2">
                            <span className={TYPO.eyebrow}>게임 {g.seq}</span>
                            <span className={TYPO.caption}>
                                전력차 {teamDiff(g).toFixed(1)}
                            </span>
                        </div>
                        <div className={`${TYPO.body2} break-keep`}>
                            <span>{teamNames(g.team1)}</span>
                            <span className="text-muted-foreground"> vs </span>
                            <span>{teamNames(g.team2)}</span>
                        </div>
                        <div className={TYPO.caption}>
                            NTRP 합 {teamNtrp(g.team1).toFixed(1)} : {teamNtrp(g.team2).toFixed(1)}
                            {result.resting[i].length > 0 && (
                                <> · 쉬는 사람 {result.resting[i].map(nameOf).join(', ')}</>
                            )}
                        </div>
                    </li>
                ))}
            </ol>

            <div>
                <p className={`${TYPO.eyebrow} mb-1.5`}>출전 횟수</p>
                <ul className="flex flex-wrap gap-1.5">
                    {Object.entries(result.playCounts).map(([key, count]) => (
                        <li key={key} className={`${PILL_BASE} border-border text-foreground`}>
                            {nameOf(key)} {count}
                        </li>
                    ))}
                </ul>
            </div>

            {result.warnings.length > 0 && (
                <ul className={`${TYPO.caption} space-y-1 break-keep`}>
                    {result.warnings.map((w) => (
                        <li key={w} className="text-spot">{w}</li>
                    ))}
                </ul>
            )}
        </div>
    )
}
