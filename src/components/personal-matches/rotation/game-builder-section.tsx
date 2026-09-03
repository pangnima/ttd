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
    onAddSet: (gameId: string) => void
    onUpdateSet: (gameId: string, i: number, field: 'me' | 'opp', val: string) => void
    onRemoveSet: (gameId: string, i: number) => void
    onMyAd: (gameId: string, i: number, v: 'me' | 'partner' | undefined) => void
    onOppAd: (gameId: string, i: number, v: 'opponent' | 'opponent2' | undefined) => void
}

/**
 * 로테이션 게임 빌더 — 게임을 자유롭게 추가하며 각 게임의 페어·스코어를 입력한다.
 * 참가자 3명 이상이어야 게임을 만들 수 있다.
 */
export function GameBuilderSection({
    games, pool, onAddGame, onUpdateGame, onRemoveGame, onAddSet, onUpdateSet, onRemoveSet, onMyAd, onOppAd,
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
                        onAddSet={() => onAddSet(g.tempId)}
                        onUpdateSet={(si, f, v) => onUpdateSet(g.tempId, si, f, v)}
                        onRemoveSet={(si) => onRemoveSet(g.tempId, si)}
                        onMyAd={(si, v) => onMyAd(g.tempId, si, v)}
                        onOppAd={(si, v) => onOppAd(g.tempId, si, v)}
                    />
                ))}
            </div>
            {/* 게임(세트 추가)이 있을 때는 게임 추가와 구분선으로 분리 */}
            <div className={cn(games.length > 0 && 'border-t border-border pt-4')}>
                <AddButton label="게임 추가" onClick={onAddGame} disabled={!canAddGame} />
                <p className="mt-2 text-body2 text-destructive">게임마다 별도 경기로 저장됩니다. 파트너를 바꿔가며 추가하세요.</p>
            </div>
        </div>
    )
}
