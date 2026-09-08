'use client'

import { useMemo } from 'react'
import type { RotationPoolPlayer } from '@/types'
import { Button } from '@/components/ui/button'
import { DialogFooter } from '@/components/ui/dialog'
import { playersToPool, poolPlayerToJson, type RotationGamePayload } from '@/lib/personal-matches/rotation'
import { isImmediateGame } from '@/lib/personal-matches/rotation-rep'
import { GameBuilderSection } from '@/components/personal-matches/rotation/game-builder-section'
import { PoolEditorBlock, type PoolAdmin, type PoolPickerProps } from '@/components/personal-matches/rotation/pool-editor-block'
import { useRotationGames } from '@/components/personal-matches/use-rotation-games'
import { EnteredGamesBlock } from '@/components/personal-matches/rotation/entered-games-block'
import type { EnteredRotationGame } from '@/lib/personal-matches/rotation-entered'

type Props = {
    /** 빌더 풀 — 세션 풀 ∪ 방 참가자 − 나. '나'는 로그인한 참가자다(0050) */
    pool: RotationPoolPlayer[]
    isRoomSession: boolean
    // 참가자 편집용 자동완성 후보 (모집형으로 풀을 비운 채 연 세션에서 여기서 채운다)
    picker: PoolPickerProps
    onSubmit: (games: RotationGamePayload[]) => void
    isPending: boolean
    error: string | null
    /** 세션 명부를 실제로 바꿀 수 있는 화면일 때만 온다 — 방 밖 세션 + 소유자/수락자 (0058) */
    poolAdmin?: Omit<PoolAdmin, 'onLocalAdd'>
    /** 내가 이미 넣은 게임 — 중복 입력을 막기 위해 상단에 읽기 전용으로 보여준다 (0063) */
    enteredGames?: EnteredRotationGame[]
}

/**
 * 로테이션 세션 결과 입력 패널 — 풀에서 내 파트너·상대1·상대2를 골라 게임(스코어 1줄)을 구성한다.
 * 등록 폼에서 쓰던 GameBuilderSection/GameRow/PoolSelect를 그대로 재사용한다.
 * 풀이 비어 있거나 모자라면 PoolEditorBlock에서 선수를 채운다(이 팝업 안에서만 유지 — 세션 행은 수정하지 않는다).
 *
 * 상대팀에 회원이 있는 게임은 상호 확인 경기가 되어 '결과 확인 대기'로 저장되고(입력자의 제안 = 입력자의 확인,
 * 나머지 회원 참가자 전원이 확인해야 확정 — 0060), 상대팀이 전원 비회원인 게임만 즉시 확정된다(0050).
 */
export function RotationGamesPanel({ pool: initialPool, picker, onSubmit, isPending, error, poolAdmin, enteredGames = [] }: Props) {
    const r = useRotationGames(playersToPool(initialPool))

    // 0057부터 방 밖 세션도 상대팀에 회원이 있으면 제안 → 회원 참가자 확인을 거친다 —
    // 즉시 확정은 방 안팎을 가리지 않고 '상대가 전원 비회원'일 때뿐이다.
    const immediateCount = useMemo(() => {
        const byRef = (ref: string | null) => {
            const p = ref ? r.pool.find((x) => x.tempId === ref) : undefined
            return p ? poolPlayerToJson(p) : undefined
        }
        return r.games.filter((g) => {
            const opp1 = byRef(g.opp1Ref)
            const opp2 = byRef(g.opp2Ref)
            return opp1 && opp2 && isImmediateGame(opp1, opp2)
        }).length
    }, [r.games, r.pool])

    return (
        <div className="space-y-4">
            {/* 무엇이 이미 들어갔는지 먼저 말한다 — 안 보이면 같은 게임을 다시 넣게 된다(0063) */}
            <EnteredGamesBlock games={enteredGames} />
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
                poolAdmin={poolAdmin ? { ...poolAdmin, onLocalAdd: r.addPoolMember } : undefined}
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

            {r.games.length > 0 && (
                <p className="text-caption text-muted-foreground break-keep">
                    상대팀에 회원이 있는 게임은 나를 뺀 회원 참가자 전원이 결과를 확인해야 확정됩니다.
                    {immediateCount > 0 && ` 상대가 모두 비회원인 게임 ${immediateCount}개는 바로 확정됩니다.`}
                    {poolAdmin && ' 아직 참여를 수락하지 않은 회원이 낀 게임은 그분이 수락한 뒤에 기록됩니다.'}
                </p>
            )}

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
