'use client'

import type { PersonalMatchSetScore } from '@/types'
import { SetScoreRow } from '@/components/personal-matches/set-score-row'
import { AddButton } from '@/components/personal-matches/add-button'

type SetsSectionProps = {
    sets: PersonalMatchSetScore[]
    isDoubles: boolean
    // 세트 라벨 우측에 표시할 상대(팀) 이름
    opponentLabel: string
    onAddSet: () => void
    onUpdateSet: (i: number, field: 'me' | 'opp', val: string) => void
    onRemoveSet: (i: number) => void
    // 복식 애드/듀스 토글 노출 여부 (기본 true). 로테이션 복식은 false.
    enableAdDeuce?: boolean
    myAdLabels?: { me: string; partner: string }
    oppAdLabels?: { opponent: string; opponent2: string }
    onMyAd?: (i: number, v: 'me' | 'partner' | undefined) => void
    onOppAd?: (i: number, v: 'opponent' | 'opponent2' | undefined) => void
}

/**
 * 세트 스코어 입력 영역 — 세트 추가/삭제, 나/상대 라벨, 세트별 행(SetScoreRow).
 */
export function SetsSection({
    sets, isDoubles, opponentLabel, enableAdDeuce = true, myAdLabels, oppAdLabels,
    onAddSet, onUpdateSet, onRemoveSet, onMyAd, onOppAd,
}: SetsSectionProps) {
    return (
        <div>
            {/* 왼쪽=나(등록유저), 오른쪽=상대 라벨 */}
            <div className="flex items-center gap-2 mb-1">
                <span className="w-10" />
                <span className="w-16 text-center text-xs text-muted-foreground truncate">나</span>
                <span className="w-3" />
                <span className="w-16 text-center text-xs text-muted-foreground truncate">{opponentLabel}</span>
            </div>
            <div className="space-y-2">
                {sets.map((s, i) => (
                    <SetScoreRow
                        key={i}
                        index={i}
                        set={s}
                        isDoubles={isDoubles}
                        removable={sets.length > 1}
                        onChange={(field, val) => onUpdateSet(i, field, val)}
                        onRemove={() => onRemoveSet(i)}
                        enableAdDeuce={enableAdDeuce}
                        onMyAdChange={onMyAd ? (v) => onMyAd(i, v) : undefined}
                        onOppAdChange={onOppAd ? (v) => onOppAd(i, v) : undefined}
                        myAdLabels={myAdLabels}
                        oppAdLabels={oppAdLabels}
                    />
                ))}
            </div>
            <div className="mt-2">
                <AddButton label="세트 추가" onClick={onAddSet} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">한 경기로 저장되며, 세트 승수가 많은 쪽이 승리로 기록됩니다.</p>
        </div>
    )
}
