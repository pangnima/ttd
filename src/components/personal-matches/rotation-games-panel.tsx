'use client'

import type { RotationSession } from '@/types'
import { Button } from '@/components/ui/button'
import { DialogFooter } from '@/components/ui/dialog'
import { playersToPool, type RotationGamePayload } from '@/lib/personal-matches/rotation'
import { GameBuilderSection } from '@/components/personal-matches/rotation/game-builder-section'
import { PoolEditorBlock, type PoolPickerProps } from '@/components/personal-matches/rotation/pool-editor-block'
import { useRotationGames } from '@/components/personal-matches/use-rotation-games'

type Props = {
    session: RotationSession
    // 참가자 편집용 자동완성 후보 (모집형으로 풀을 비운 채 연 세션에서 여기서 채운다)
    picker: PoolPickerProps
    onSubmit: (games: RotationGamePayload[]) => void
    isPending: boolean
    error: string | null
}

/**
 * 로테이션 세션 결과 입력 패널 — 세션의 선수 풀을 참조해 게임(파트너·상대1·상대2 + 스코어 1줄)을 구성한다.
 * 등록 폼에서 쓰던 GameBuilderSection/GameRow/PoolSelect를 그대로 재사용하며, 저장하면 게임별 경기로 분해된다.
 * 풀이 비어 있거나 모자라면 PoolEditorBlock에서 선수를 채운다(이 팝업 안에서만 유지 — 세션 행은 수정하지 않는다).
 */
export function RotationGamesPanel({ session, picker, onSubmit, isPending, error }: Props) {
    const r = useRotationGames(playersToPool(session.players))

    return (
        <div className="space-y-4">
            <p className="text-caption text-muted-foreground break-keep">
                {r.pool.length === 0
                    ? '참가자가 아직 없습니다. 아래에서 추가한 뒤 게임을 구성하세요.'
                    : `참가자 ${r.pool.length}명: ${r.pool.map((p) => p.player.name || '이름 미정').join(', ')}`}
            </p>
            <PoolEditorBlock
                pool={r.pool}
                picker={picker}
                onAdd={r.addPoolPlayer}
                onUpdate={r.updatePoolPlayer}
                onRemove={r.removePoolPlayer}
            />
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
