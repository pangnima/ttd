'use client'

import { useMemo, useState } from 'react'
import type { MatchType } from '@/types'
import type { OpponentCandidate } from '@/lib/queries/users'
import {
    buildRoomLineup,
    gamesForPerPlayer,
    toLineupPlayers,
    type LineupPreset,
    type LineupResult,
} from '@/lib/match-rooms/lineup'

type Options = { candidates: OpponentCandidate[]; matchType: MatchType }

export type RoomLineupState = {
    /** 대진에 넣을 참가자 key (체크 해제로 제외할 수 있다) */
    included: Set<string>
    toggle: (id: string) => void
    perPlayer: number
    setPerPlayer: (n: number) => void
    preset: LineupPreset
    setPreset: (p: LineupPreset) => void
    /** 총 게임 수 — 1인당 경기 수에서 환산된 값 */
    gameCount: number
    result: LineupResult
    /** [다시 뽑기] — 시드만 바꾼다 */
    reroll: () => void
    nameOf: (key: string) => string
}

/**
 * 자동 대진표 다이얼로그의 상태.
 * 생성 자체는 순수 함수라 옵션이 바뀔 때마다 즉시 다시 계산된다 — 저장 전까지 아무 일도 일어나지 않는다.
 */
export function useRoomLineup({ candidates, matchType }: Options): RoomLineupState {
    const [excluded, setExcluded] = useState<Set<string>>(new Set())
    const [perPlayer, setPerPlayer] = useState(2)
    const [preset, setPreset] = useState<LineupPreset>('balanced')
    const [seed, setSeed] = useState(1)

    const included = useMemo(
        () => new Set(candidates.filter((c) => !excluded.has(c.id)).map((c) => c.id)),
        [candidates, excluded],
    )

    const players = useMemo(
        () => toLineupPlayers(candidates.filter((c) => included.has(c.id))),
        [candidates, included],
    )

    const isDoubles = matchType !== 'singles'
    const gameCount = gamesForPerPlayer(players.length, perPlayer, isDoubles)
    const result = useMemo(
        () => buildRoomLineup(players, { matchType, games: gameCount, preset, seed }),
        [players, matchType, gameCount, preset, seed],
    )

    const names = useMemo(() => new Map(candidates.map((c) => [c.id, c.name])), [candidates])

    return {
        included,
        toggle: (id) =>
            setExcluded((prev) => {
                const next = new Set(prev)
                if (next.has(id)) next.delete(id)
                else next.add(id)
                return next
            }),
        perPlayer,
        setPerPlayer,
        preset,
        setPreset,
        gameCount,
        result,
        reroll: () => setSeed((s) => s + 1),
        nameOf: (key) => names.get(key) ?? key,
    }
}
