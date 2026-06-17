'use client'

import type { OpponentCandidate } from '@/lib/queries/users'
import type { PastOpponent } from '@/lib/queries/personal-matches'
import { PlayerNtrpField } from '@/components/personal-matches/player-ntrp-field'
import type { PoolPlayer } from '@/lib/personal-matches/rotation'
import { cn } from '@/lib/utils'

type PoolPlayerRowProps = {
    index: number
    value: PoolPlayer
    candidates: OpponentCandidate[]
    pastOpponents: PastOpponent[]
    onChange: (patch: Partial<Omit<PoolPlayer, 'tempId'>>) => void
    onRemove: () => void
    canRemove: boolean
}

/**
 * 선수 풀의 한 항목 — 이름 선택(PlayerNtrpField 재사용) + NTRP. 삭제 버튼.
 * NTRP는 로테이션에서 상대 역할로 쓰일 수 있어 필수로 표시한다.
 */
export function PoolPlayerRow({ index, value, candidates, pastOpponents, onChange, onRemove, canRemove }: PoolPlayerRowProps) {
    return (
        <div className={cn('space-y-2', index > 0 && 'mt-6 border-t border-border pt-6')}>
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">참가자 {index + 1}</span>
                {canRemove && (
                    <button type="button" onClick={onRemove} className="text-xs text-destructive/80 hover:text-destructive">
                        삭제
                    </button>
                )}
            </div>
            <PlayerNtrpField
                label="이름"
                candidates={candidates}
                pastOpponents={pastOpponents}
                player={value.player}
                onPlayerChange={(p) => onChange({ player: p })}
                ntrp={value.ntrp}
                onNtrpChange={(n) => onChange({ ntrp: n })}
                ntrpRequired
                placeholder="이름 또는 닉네임"
            />
        </div>
    )
}
