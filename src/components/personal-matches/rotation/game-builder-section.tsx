'use client'

import type { PoolPlayer, RotationGame } from '@/lib/personal-matches/rotation'
import { GameRow } from '@/components/personal-matches/rotation/game-row'
import { AddButton } from '@/components/personal-matches/add-button'
import { cn } from '@/lib/utils'

type GameBuilderSectionProps = {
    games: RotationGame[]
    pool: PoolPlayer[]
    onAddGame: () => void
    onUpdateGame: (tempId: string, patch: Partial<Omit<RotationGame, 'tempId'>>) => void
    onRemoveGame: (tempId: string) => void
    onUpdateSet: (gameId: string, i: number, field: 'me' | 'opp', val: string) => void
    onMyAd: (gameId: string, i: number, v: 'me' | 'partner' | undefined) => void
    onOppAd: (gameId: string, i: number, v: 'opponent' | 'opponent2' | undefined) => void
}

/**
 * 로테이션 게임 빌더 — 게임을 자유롭게 추가하며 각 게임의 페어·스코어(1줄)를 입력한다.
 * 참가자 3명 이상이어야 게임을 만들 수 있다. 같은 구성으로 여러 게임을 쳤으면 게임을 그만큼 추가한다.
 */
export function GameBuilderSection({
    games, pool, onAddGame, onUpdateGame, onRemoveGame, onUpdateSet, onMyAd, onOppAd,
}: GameBuilderSectionProps) {
    const canAddGame = pool.length >= 3
    return (
        <div className="space-y-4">
            {!canAddGame && (
                <p className="text-body2 text-muted-foreground">참가자를 3명 이상 추가하면 게임을 만들 수 있어요.</p>
            )}
            {/* 게임 행은 자체 mt/구분선으로 간격을 가지므로 래퍼에는 space-y를 두지 않는다 */}
            <div>
                {games.map((g, i) => (
                    <GameRow
                        key={g.tempId}
                        index={i}
                        game={g}
                        pool={pool}
                        onChange={(patch) => onUpdateGame(g.tempId, patch)}
                        onRemove={() => onRemoveGame(g.tempId)}
                        onUpdateSet={(si, f, v) => onUpdateSet(g.tempId, si, f, v)}
                        onMyAd={(si, v) => onMyAd(g.tempId, si, v)}
                        onOppAd={(si, v) => onOppAd(g.tempId, si, v)}
                    />
                ))}
            </div>
            {/* 게임이 있을 때는 게임 추가와 구분선으로 분리 */}
            <div className={cn(games.length > 0 && 'border-t border-border pt-4')}>
                <AddButton label="게임 추가" onClick={onAddGame} disabled={!canAddGame} />
                <p className="mt-2 text-body2 text-muted-foreground">게임 1개 = 스코어 1줄. 게임마다 별도 경기로 저장되며 목록에서는 한 묶음으로 보입니다.</p>
            </div>
        </div>
    )
}
