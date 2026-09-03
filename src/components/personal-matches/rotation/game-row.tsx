'use client'

import { SetsSection } from '@/components/personal-matches/form-sections/sets-section'
import { PoolSelect } from '@/components/personal-matches/rotation/pool-select'
import type { PoolPlayer, RotationGame } from '@/lib/personal-matches/rotation'
import { cn } from '@/lib/utils'

type GameRowProps = {
    index: number
    game: RotationGame
    pool: PoolPlayer[]
    onChange: (patch: Partial<Omit<RotationGame, 'tempId'>>) => void
    onRemove: () => void
    onAddSet: () => void
    onUpdateSet: (i: number, field: 'me' | 'opp', val: string) => void
    onRemoveSet: (i: number) => void
    onMyAd: (i: number, v: 'me' | 'partner' | undefined) => void
    onOppAd: (i: number, v: 'opponent' | 'opponent2' | undefined) => void
}

function nameOf(pool: PoolPlayer[], ref: string | null, fallback: string): string {
    const p = ref ? pool.find((x) => x.tempId === ref) : undefined
    return p?.player.name.trim() || fallback
}

/**
 * 로테이션 게임 1건 — 내 파트너/상대1/상대2 선택(풀에서) + 세트 스코어.
 * 세트별 애드/듀스 라벨은 이 게임의 풀 참조(파트너·상대 이름)로 동적 계산한다.
 */
export function GameRow({ index, game, pool, onChange, onRemove, onAddSet, onUpdateSet, onRemoveSet, onMyAd, onOppAd }: GameRowProps) {
    const present = (refs: (string | null)[]) => refs.filter((r): r is string => !!r)
    const opp1Name = nameOf(pool, game.opp1Ref, '상대1')
    const opp2Name = nameOf(pool, game.opp2Ref, '상대2')
    const oppLabel = `${opp1Name}·${opp2Name}`
    return (
        <div className={cn('space-y-3', index > 0 && 'mt-6 border-t border-border pt-6')}>
            <div className="flex items-center justify-between">
                <span className="text-caption font-semibold text-foreground">게임 {index + 1}</span>
                <button type="button" onClick={onRemove} className="text-caption text-destructive/80 hover:text-destructive">
                    삭제
                </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
                <PoolSelect
                    label="내 파트너"
                    pool={pool}
                    value={game.partnerRef}
                    exclude={present([game.opp1Ref, game.opp2Ref])}
                    onChange={(id) => onChange({ partnerRef: id })}
                />
                <PoolSelect
                    label="상대1"
                    pool={pool}
                    value={game.opp1Ref}
                    exclude={present([game.partnerRef, game.opp2Ref])}
                    onChange={(id) => onChange({ opp1Ref: id })}
                />
                <PoolSelect
                    label="상대2"
                    pool={pool}
                    value={game.opp2Ref}
                    exclude={present([game.partnerRef, game.opp1Ref])}
                    onChange={(id) => onChange({ opp2Ref: id })}
                />
            </div>
            <SetsSection
                sets={game.sets}
                isDoubles
                opponentLabel={oppLabel}
                myAdLabels={{ me: '나', partner: nameOf(pool, game.partnerRef, '파트너') }}
                oppAdLabels={{ opponent: opp1Name, opponent2: opp2Name }}
                onAddSet={onAddSet}
                onUpdateSet={onUpdateSet}
                onRemoveSet={onRemoveSet}
                onMyAd={onMyAd}
                onOppAd={onOppAd}
            />
        </div>
    )
}
