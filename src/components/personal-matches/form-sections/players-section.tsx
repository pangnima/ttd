'use client'

import type { OpponentCandidate } from '@/lib/queries/users'
import type { PastOpponent } from '@/lib/queries/personal-matches'
import { PlayerNtrpField } from '@/components/personal-matches/player-ntrp-field'
import type { PlayerPickerValue } from '@/components/personal-matches/player-picker'

// 선수 1명의 선택값·NTRP 상태와 변경 핸들러 묶음 (prop drilling 축소용)
export type PlayerFieldState = {
    player: PlayerPickerValue
    onPlayerChange: (v: PlayerPickerValue) => void
    ntrp: string
    onNtrpChange: (v: string) => void
}

type PlayersSectionProps = {
    isDoubles: boolean
    candidates: OpponentCandidate[]
    pastOpponents: PastOpponent[]
    opponent: PlayerFieldState
    partner: PlayerFieldState
    opponent2: PlayerFieldState
}

/**
 * 경기 타입(단식/복식)에 따라 선수 입력란을 분기 렌더링.
 * 단식은 상대 1명, 복식은 내 팀(파트너) + 상대팀(상대1·상대2) 박스로 구성한다.
 */
export function PlayersSection({ isDoubles, candidates, pastOpponents, opponent, partner, opponent2 }: PlayersSectionProps) {
    if (!isDoubles) {
        return (
            <PlayerNtrpField
                label="상대 *"
                candidates={candidates}
                pastOpponents={pastOpponents}
                player={opponent.player}
                onPlayerChange={opponent.onPlayerChange}
                ntrp={opponent.ntrp}
                onNtrpChange={opponent.onNtrpChange}
                ntrpRequired
                placeholder="상대방 이름 또는 닉네임"
            />
        )
    }
    return (
        <>
            {/* 내 팀 (나 + 파트너) */}
            <div className="rounded-md border border-border/70 bg-muted/20 p-3 space-y-3">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground px-2 py-0.5 rounded bg-primary/10 text-primary">내 팀</span>
                    <span className="text-xs text-muted-foreground">나 + 파트너</span>
                </div>
                <PlayerNtrpField
                    label="내 파트너 *"
                    candidates={candidates}
                    pastOpponents={pastOpponents}
                    player={partner.player}
                    onPlayerChange={partner.onPlayerChange}
                    ntrp={partner.ntrp}
                    onNtrpChange={partner.onNtrpChange}
                    placeholder="파트너 이름 또는 닉네임"
                />
            </div>

            {/* 상대팀 (상대1 + 상대2) */}
            <div className="rounded-md border border-border/70 bg-muted/20 p-3 space-y-3">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground px-2 py-0.5 rounded bg-destructive/10 text-destructive">상대팀</span>
                    <span className="text-xs text-muted-foreground">상대1 + 상대2</span>
                </div>
                <PlayerNtrpField
                    label="상대팀 선수 1 *"
                    candidates={candidates}
                    pastOpponents={pastOpponents}
                    player={opponent.player}
                    onPlayerChange={opponent.onPlayerChange}
                    ntrp={opponent.ntrp}
                    onNtrpChange={opponent.onNtrpChange}
                    ntrpRequired
                    placeholder="상대방 이름 또는 닉네임"
                />
                <PlayerNtrpField
                    label="상대팀 선수 2 *"
                    candidates={candidates}
                    pastOpponents={pastOpponents}
                    player={opponent2.player}
                    onPlayerChange={opponent2.onPlayerChange}
                    ntrp={opponent2.ntrp}
                    onNtrpChange={opponent2.onNtrpChange}
                    ntrpRequired
                    placeholder="상대방 이름 또는 닉네임"
                />
            </div>
        </>
    )
}
