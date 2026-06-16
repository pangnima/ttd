'use client'

import { MATCH_FORM_LABEL } from '@/lib/dashboard/tokens'
import type { PoolPlayer, RotationGame } from '@/lib/personal-matches/rotation'
import { GameRow } from '@/components/personal-matches/rotation/game-row'

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
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label className={`${MATCH_FORM_LABEL} mb-0`}>게임 *</label>
                <button
                    type="button"
                    onClick={onAddGame}
                    disabled={!canAddGame}
                    className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    + 게임 추가
                </button>
            </div>
            {!canAddGame && (
                <p className="text-xs text-muted-foreground">참가자를 3명 이상 추가하면 게임을 만들 수 있어요.</p>
            )}
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
    )
}
