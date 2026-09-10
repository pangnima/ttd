'use client'

import type { MatchType } from '@/types'
import type { LineupPlayer } from '@/lib/match-games/lineup-core'
import type { LineupSlot } from '@/lib/match-rooms/lineup'
import { summarizeLineup } from '@/lib/match-rooms/lineup'
import {
    addGame, removeGame, setSlot, validateDraft, type DraftGame, type DraftSide,
} from '@/lib/match-rooms/lineup-draft'
import { CARD_BASE, EMPTY_BLOCK, PILL_BASE, TYPO } from '@/lib/dashboard/tokens'
import { Button } from '@/components/ui/button'
import { LineupEditCard } from '@/components/match-rooms/lineup-edit/lineup-edit-card'

type Props = {
    games: DraftGame[]
    /** 대진에 넣기로 한 사람 전원 — 자리 후보이자 출전 횟수의 분모 */
    players: LineupPlayer[]
    matchType: MatchType
    onChange: (games: DraftGame[]) => void
}

/**
 * 편집 가능한 대진 목록 — 카드 N장 + [게임 추가] + 출전 횟수.
 *
 * 자동 대진표의 미리보기와 저장된 대진의 편집이 이 컴포넌트 한 벌을 함께 쓴다. 두 화면의 차이는
 * 초기 대진을 어디서 받아 어디로 저장하느냐뿐이고, 편집 규칙은 `lineup-draft.ts`가 한 곳에서 쥔다.
 */
export function LineupEditList({ games, players, matchType, onChange }: Props) {
    const { resting, playCounts } = summarizeLineup(games, players)
    const errors = validateDraft(games)
    const nameOf = (key: string) => players.find((p) => p.key === key)?.name ?? key

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
            ) : (
                <ol className={`${CARD_BASE} divide-y divide-border`}>
                    {games.map((g, i) => (
                        <LineupEditCard
                            key={g.key}
                            game={g}
                            index={i}
                            players={players}
                            restingNames={(resting[i] ?? []).map(nameOf)}
                            onSlotChange={(side: DraftSide, slot, player: LineupSlot) =>
                                onChange(setSlot(games, g.key, side, slot, player))}
                            onRemove={() => onChange(removeGame(games, g.key))}
                        />
                    ))}
                </ol>
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
