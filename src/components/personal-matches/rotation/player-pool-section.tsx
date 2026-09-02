'use client'

import type { OpponentCandidate } from '@/lib/queries/users'
import type { PastOpponent } from '@/lib/queries/personal-matches'
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
    // 전체 회원 검색 활성화 (로그인 유저 id)
    searchSelfUserId?: string
}

/**
 * 로테이션 참가자 풀 입력 — 나를 제외한 함께 친 선수들을 한 번씩 등록한다.
 * 게임(팀 구성·스코어)은 저장 후 카드의 '결과 입력'에서 이 풀을 참조해 만든다.
 */
export function PlayerPoolSection({ pool, candidates, pastOpponents, onAdd, onUpdate, onRemove, searchSelfUserId }: PlayerPoolSectionProps) {
    return (
        <div className="space-y-4">
            {pool.length === 0 && (
                <p className="text-xs text-muted-foreground">함께 친 선수를 추가하세요. (최소 3명)</p>
            )}
            {/* 행은 자체 mt/구분선으로 간격을 가지므로 래퍼에는 space-y를 두지 않는다 */}
            <div>
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
                        searchSelfUserId={searchSelfUserId}
                    />
                ))}
            </div>
            <AddButton label="참가자 추가" onClick={onAdd} />
        </div>
    )
}
