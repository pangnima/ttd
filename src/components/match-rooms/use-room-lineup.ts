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
import { effectiveCourtCount } from '@/lib/match-rooms/court-slots'
import { fromResult, validateDraft, type DraftGame } from '@/lib/match-rooms/lineup-draft'
import {
    DEFAULT_SLOT_MINUTES,
    estimateMinutes,
    recommendGames,
    type LineupRecommendation,
} from '@/lib/match-rooms/schedule'

type Options = {
    candidates: OpponentCandidate[]
    matchType: MatchType
    /** 방의 예정 소요 시간(분) — 없으면 권장 경기 수를 내지 않는다 (0073 이전 방) */
    durationMinutes?: number
    /** 동시에 도는 경기 수 */
    courtCount?: number
}

export type RoomLineupState = {
    /** 대진에 넣을 참가자 key (체크 해제로 제외할 수 있다) */
    included: Set<string>
    toggle: (id: string) => void
    perPlayer: number
    setPerPlayer: (n: number) => void
    /** 경기당 시간(분) — 방이 아니라 대진을 짤 때 고른다 */
    slotMinutes: number
    setSlotMinutes: (n: number) => void
    /** 시간과 코트 면 수로 낸 권장값 — 소요 시간을 모르는 방이면 null */
    recommendation: LineupRecommendation | null
    /** 지금 대진을 소화하는 데 걸리는 시간(분) */
    estimatedMinutes: number
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
    /** 실제로 동시에 도는 면 수 — 생성과 표시가 같은 값을 봐야 라운드 묶음이 대진과 맞는다 */
    courts: number
}

/**
 * 자동 대진표 다이얼로그의 상태.
 *
 * 생성은 순수 함수라 옵션이 바뀔 때마다 즉시 다시 계산된다 — 저장 전까지 아무 일도 일어나지 않는다.
 * 사람이 자리를 고치면 그 결과가 `edited`에 남고 화면은 그것을 그린다. 옵션을 다시 건드리는 순간
 * `edited`를 비워 생성분으로 돌아간다 — 바뀐 조건으로 뽑은 대진에 옛 편집을 덧대면 무엇을 보고 있는지
 * 알 수 없기 때문이다. useEffect 없이 렌더 중 파생으로만 처리한다.
 */
export function useRoomLineup({ candidates, matchType, durationMinutes, courtCount = 1 }: Options): RoomLineupState {
    const [excluded, setExcluded] = useState<Set<string>>(new Set())
    const [perPlayer, setPerPlayer] = useState(2)
    const [preset, setPreset] = useState<LineupPreset>('balanced')
    const [slotMinutes, setSlotMinutesState] = useState(DEFAULT_SLOT_MINUTES)
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
    // 면 수를 생성에 넘긴다 — 한 라운드 안에서 같은 사람이 두 코트에 서면 실행할 수 없는 대진이 된다
    const generated = useMemo(
        () => buildRoomLineup(players, { matchType, games: gameCount, preset, seed, courtCount }),
        [players, matchType, gameCount, preset, seed, courtCount],
    )
    const courts = effectiveCourtCount(players.length, matchType, courtCount)

    const draft = edited ?? fromResult(generated)

    // 권장값은 경기 수가 아니라 **1인당 경기 수**로 낸다 — 화면이 조작하는 축과 같아야
    // [적용] 뒤에 요약 줄의 총 경기 수가 저절로 맞는다.
    const recommendation = recommendGames({
        durationMinutes, slotMinutes, courtCount, playerCount: players.length, matchType,
    })

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
        slotMinutes,
        setSlotMinutes: (n) => { setEdited(null); setSlotMinutesState(n) },
        recommendation,
        estimatedMinutes: estimateMinutes(draft.length, slotMinutes, courts),
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
        courts,
    }
}
