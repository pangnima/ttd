'use client'

import type { RotationSession } from '@/types'
import { Button } from '@/components/ui/button'
import { DialogFooter } from '@/components/ui/dialog'
import { playersToPool, type RotationGamePayload } from '@/lib/personal-matches/rotation'
import { GameBuilderSection } from '@/components/personal-matches/rotation/game-builder-section'
import { useRotationGames } from '@/components/personal-matches/use-rotation-games'

type Props = {
    session: RotationSession
    onSubmit: (games: RotationGamePayload[]) => void
    isPending: boolean
    error: string | null
}

/**
 * 로테이션 세션 결과 입력 패널 — 세션의 선수 풀을 참조해 게임(파트너·상대1·상대2 + 스코어 1줄)을 구성한다.
 * 등록 폼에서 쓰던 GameBuilderSection/GameRow/PoolSelect를 그대로 재사용하며, 저장하면 게임별 경기로 분해된다.
 */
export function RotationGamesPanel({ session, onSubmit, isPending, error }: Props) {
    const r = useRotationGames(playersToPool(session.players))

    return (
        <div className="space-y-4">
            <p className="text-caption text-muted-foreground break-keep">
                참가자 {session.players.length}명: {session.players.map((p) => p.name).join(', ')}
            </p>
            <GameBuilderSection
                games={r.games}
                pool={r.pool}
                onAddGame={r.addGame}
                onUpdateGame={r.updateGame}
                onRemoveGame={r.removeGame}
                onUpdateSet={r.updateSet}
                onMyAd={r.setMyAd}
                onOppAd={r.setOppAd}
            />

            {error && <p className="text-caption text-destructive">{error}</p>}

            <DialogFooter showCloseButton>
                <Button
                    type="button"
                    disabled={!r.isGamesValid || isPending}
                    onClick={() => onSubmit(r.buildPayloads())}
                >
                    {isPending ? '저장 중...' : `게임 ${r.games.length}개 저장`}
                </Button>
            </DialogFooter>
        </div>
    )
}
