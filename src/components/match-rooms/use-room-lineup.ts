'use client'

import { useMemo, useState } from 'react'
import type { MatchType } from '@/types'
import type { OpponentCandidate } from '@/lib/queries/users'
import type { LineupPlayer } from '@/lib/match-games/lineup-core'
import {
    buildRoomLineup,
    gamesForPerPlayer,
    toLineupPlayers,
    type LineupPreset,
} from '@/lib/match-rooms/lineup'
import { fromResult, validateDraft, type DraftGame } from '@/lib/match-rooms/lineup-draft'

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
    /** 자리 후보 = 대진에 넣기로 한 사람 전원 */
    players: LineupPlayer[]
    /** 지금 화면에 있는 대진 — 자동 생성분이거나, 사람이 고친 것 */
    draft: DraftGame[]
    setDraft: (games: DraftGame[]) => void
    /** 사람이 손을 댔는가 — 옵션을 바꾸면 이 편집이 버려진다는 것을 화면이 알려야 한다 */
    isEdited: boolean
    /** 생성 경고(인원 부족·성별 불일치 등) */
    warnings: string[]
    /** 저장을 막는 이유 — 비어 있어야 저장할 수 있다 */
    errors: string[]
    /** [다시 뽑기] — 시드만 바꾼다 */
    reroll: () => void
}

/**
 * 자동 대진표 다이얼로그의 상태.
 *
 * 생성은 순수 함수라 옵션이 바뀔 때마다 즉시 다시 계산된다 — 저장 전까지 아무 일도 일어나지 않는다.
 * 사람이 자리를 고치면 그 결과가 `edited`에 남고 화면은 그것을 그린다. 옵션을 다시 건드리는 순간
 * `edited`를 비워 생성분으로 돌아간다 — 바뀐 조건으로 뽑은 대진에 옛 편집을 덧대면 무엇을 보고 있는지
 * 알 수 없기 때문이다. useEffect 없이 렌더 중 파생으로만 처리한다.
 */
export function useRoomLineup({ candidates, matchType }: Options): RoomLineupState {
    const [excluded, setExcluded] = useState<Set<string>>(new Set())
    const [perPlayer, setPerPlayer] = useState(2)
    const [preset, setPreset] = useState<LineupPreset>('balanced')
    const [seed, setSeed] = useState(1)
    const [edited, setEdited] = useState<DraftGame[] | null>(null)

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
    const generated = useMemo(
        () => buildRoomLineup(players, { matchType, games: gameCount, preset, seed }),
        [players, matchType, gameCount, preset, seed],
    )

    const draft = edited ?? fromResult(generated)

    return {
        included,
        toggle: (id) => {
            setEdited(null)
            setExcluded((prev) => {
                const next = new Set(prev)
                if (next.has(id)) next.delete(id)
                else next.add(id)
                return next
            })
        },
        perPlayer,
        setPerPlayer: (n) => { setEdited(null); setPerPlayer(n) },
        preset,
        setPreset: (p) => { setEdited(null); setPreset(p) },
        gameCount,
        players,
        draft,
        setDraft: setEdited,
        isEdited: edited !== null,
        warnings: generated.warnings,
        errors: validateDraft(draft),
        reroll: () => { setEdited(null); setSeed((s) => s + 1) },
    }
}
