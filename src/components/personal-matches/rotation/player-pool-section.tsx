'use client'

import type { OpponentCandidate } from '@/lib/queries/users'
import type { PastOpponent } from '@/lib/queries/personal-matches'
import { MATCH_FORM_LABEL } from '@/lib/dashboard/tokens'
import type { PoolPlayer } from '@/lib/personal-matches/rotation'
import { PoolPlayerRow } from '@/components/personal-matches/rotation/pool-player-row'
import { AddButton } from '@/components/personal-matches/add-button'

type PlayerPoolSectionProps = {
    pool: PoolPlayer[]
    candidates: OpponentCandidate[]
    pastOpponents: PastOpponent[]
    onAdd: () => void
    onUpdate: (tempId: string, patch: Partial<Omit<PoolPlayer, 'tempId'>>) => void
    onRemove: (tempId: string) => void
}

/**
 * 로테이션 참가자 풀 입력 — 나를 제외한 함께 친 선수들을 한 번씩 등록한다(게임에서 재사용).
 */
export function PlayerPoolSection({ pool, candidates, pastOpponents, onAdd, onUpdate, onRemove }: PlayerPoolSectionProps) {
    return (
        <div className="space-y-2">
            <label className={MATCH_FORM_LABEL}>참가자 (나 제외) *</label>
            {pool.length === 0 && (
                <p className="text-xs text-muted-foreground">함께 친 선수를 추가하세요. (최소 3명)</p>
            )}
            {pool.map((p, i) => (
                <PoolPlayerRow
                    key={p.tempId}
                    index={i}
                    value={p}
                    candidates={candidates}
                    pastOpponents={pastOpponents}
                    onChange={(patch) => onUpdate(p.tempId, patch)}
                    onRemove={() => onRemove(p.tempId)}
                    canRemove
                />
            ))}
            <AddButton label="참가자 추가" onClick={onAdd} />
        </div>
    )
}
