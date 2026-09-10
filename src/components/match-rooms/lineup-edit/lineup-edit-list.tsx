'use client'

import type { MatchType } from '@/types'
import type { LineupPlayer } from '@/lib/match-games/lineup-core'
import type { LineupSlot } from '@/lib/match-rooms/lineup'
import { summarizeLineup } from '@/lib/match-rooms/lineup'
import {
    derivedSlotMinutes, groupByRound, restingByRound, roundStartLabels,
} from '@/lib/match-rooms/court-slots'
import {
    addGame, removeGame, setSlot, validateDraft, type DraftGame, type DraftSide,
} from '@/lib/match-rooms/lineup-draft'
import { CARD_BASE, EMPTY_BLOCK, PILL_BASE, TYPO } from '@/lib/dashboard/tokens'
import { Button } from '@/components/ui/button'
import { LineupEditCard } from '@/components/match-rooms/lineup-edit/lineup-edit-card'
import { LineupRoundGroup } from '@/components/match-rooms/lineup-edit/lineup-round-group'

type Props = {
    games: DraftGame[]
    /** 대진에 넣기로 한 사람 전원 — 자리 후보이자 출전 횟수의 분모 */
    players: LineupPlayer[]
    matchType: MatchType
    onChange: (games: DraftGame[]) => void
    /** 동시에 도는 면 수(실효값). 2 이상이면 라운드로 묶어 보여준다 */
    courts?: number
    playedTime?: string
    /** 자동 대진표는 고른 값을 안다. 저장된 대진은 몰라서 예정 소요 시간에서 되짚는다 */
    slotMinutes?: number
    durationMinutes?: number
}

/**
 * 편집 가능한 대진 목록 — 카드 N장 + [게임 추가] + 출전 횟수.
 *
 * 자동 대진표의 미리보기와 저장된 대진의 편집이 이 컴포넌트 한 벌을 함께 쓴다. 두 화면의 차이는
 * 초기 대진을 어디서 받아 어디로 저장하느냐뿐이고, 편집 규칙은 `lineup-draft.ts`가 한 곳에서 쥔다.
 *
 * 2면 이상이면 라운드로 묶는다(Week 44). 라운드·코트는 저장하지 않고 **목록 순서에서 파생**하므로
 * 자리를 바꾸거나 게임을 지워도 다시 계산되어 어긋나지 않는다.
 */
export function LineupEditList({
    games, players, matchType, onChange, courts = 1, playedTime, slotMinutes, durationMinutes,
}: Props) {
    const { resting, playCounts } = summarizeLineup(games, players)
    const errors = validateDraft(games)
    const nameOf = (key: string) => players.find((p) => p.key === key)?.name ?? key

    const rounds = groupByRound(games, courts)
    const slot = slotMinutes ?? derivedSlotMinutes(durationMinutes, rounds.length)
    const starts = roundStartLabels(playedTime, rounds.length, slot)
    const grouped = courts > 1
    const roundResting = restingByRound(resting, courts)

    const card = (g: DraftGame, i: number) => (
        <LineupEditCard
            key={g.key}
            game={g}
            index={i}
            players={players}
            // 묶었을 때는 라운드 헤더가 「쉼」을 말한다 — 카드마다 붙이면 옆 코트에서 뛰는 사람까지 쉬는 것처럼 읽힌다
            restingNames={grouped ? [] : (resting[i] ?? []).map(nameOf)}
            slotLabel={grouped ? `${(i % courts) + 1}번 코트` : starts[i]}
            onSlotChange={(side: DraftSide, slotIndex, player: LineupSlot) =>
                onChange(setSlot(games, g.key, side, slotIndex, player))}
            onRemove={() => onChange(removeGame(games, g.key))}
        />
    )

    return (
        <div className="space-y-3">
            {games.length > 0 && errors.length > 0 && (
                <div className="space-y-1">
                    {errors.map((e) => (
                        <p key={e} className={`${TYPO.caption} text-spot break-keep`}>{e}</p>
                    ))}
                </div>
            )}

            {games.length === 0 ? (
                <div className={EMPTY_BLOCK}>아직 경기가 없습니다. 아래에서 하나 추가해 주세요.</div>
            ) : grouped ? (
                <div className="space-y-3">
                    {rounds.map((round, r) => (
                        <LineupRoundGroup
                            key={r}
                            title={`${r + 1}라운드${starts[r] ? ` · ${starts[r]}` : ''}`}
                            restingNames={(roundResting[r] ?? []).map(nameOf)}
                        >
                            {round.map((g, i) => card(g, r * courts + i))}
                        </LineupRoundGroup>
                    ))}
                </div>
            ) : (
                <ol className={`${CARD_BASE} divide-y divide-border`}>{games.map(card)}</ol>
            )}

            <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-caption w-full"
                onClick={() => onChange(addGame(games, matchType))}
            >
                게임 추가
            </Button>

            {games.length > 0 && (
                <div>
                    <p className={`${TYPO.eyebrow} mb-1.5`}>출전 횟수</p>
                    <ul className="flex flex-wrap gap-1.5">
                        {Object.entries(playCounts).map(([key, count]) => (
                            <li key={key} className={`${PILL_BASE} border-border text-foreground tabular-nums`}>
                                {nameOf(key)} {count}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    )
}
