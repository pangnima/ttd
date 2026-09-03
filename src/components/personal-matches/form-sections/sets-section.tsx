'use client'

import type { PersonalMatchSetScore } from '@/types'
import { SetScoreRow } from '@/components/personal-matches/set-score-row'
import { AddButton } from '@/components/personal-matches/add-button'

type SetsSectionProps = {
    sets: PersonalMatchSetScore[]
    isDoubles: boolean
    // 게임 라벨 우측에 표시할 상대(팀) 이름
    opponentLabel: string
    // 스코어 1줄 고정(로테이션 게임): 추가/삭제 버튼·안내문 숨김, 행 라벨 '스코어'
    single?: boolean
    onAddSet?: () => void
    onUpdateSet: (i: number, field: 'me' | 'opp', val: string) => void
    onRemoveSet?: (i: number) => void
    // 복식 애드/듀스 토글 노출 여부 (기본 true). 라벨·핸들러가 모두 있어야 실제로 렌더된다.
    enableAdDeuce?: boolean
    myAdLabels?: { me: string; partner: string }
    oppAdLabels?: { opponent: string; opponent2: string }
    onMyAd?: (i: number, v: 'me' | 'partner' | undefined) => void
    onOppAd?: (i: number, v: 'opponent' | 'opponent2' | undefined) => void
}

/**
 * 게임 스코어 입력 영역 — 게임 추가/삭제, 나/상대 라벨, 게임별 행(SetScoreRow).
 * 동호인 경기: 세트 1개 = 게임 1개. 게임마다 승패가 따로 기록된다(다수결 아님).
 */
export function SetsSection({
    sets, isDoubles, opponentLabel, single = false, enableAdDeuce = true, myAdLabels, oppAdLabels,
    onAddSet, onUpdateSet, onRemoveSet, onMyAd, onOppAd,
}: SetsSectionProps) {
    return (
        <div>
            {/* 왼쪽=나(등록유저), 오른쪽=상대 라벨 */}
            <div className="flex items-center gap-2 mb-1">
                <span className="w-10" />
                <span className="w-16 text-center text-caption text-muted-foreground truncate">나</span>
                <span className="w-3" />
                <span className="w-16 text-center text-caption text-muted-foreground truncate">{opponentLabel}</span>
            </div>
            {/* 복식 게임은 각 행이 mt-6/구분선으로 간격을 가지므로 래퍼 space-y 제거 */}
            <div className={isDoubles ? '' : 'space-y-2'}>
                {sets.map((s, i) => (
                    <SetScoreRow
                        key={i}
                        index={i}
                        set={s}
                        isDoubles={isDoubles}
                        label={single ? '스코어' : undefined}
                        removable={!single && sets.length > 1}
                        onChange={(field, val) => onUpdateSet(i, field, val)}
                        onRemove={() => onRemoveSet?.(i)}
                        enableAdDeuce={enableAdDeuce}
                        onMyAdChange={onMyAd ? (v) => onMyAd(i, v) : undefined}
                        onOppAdChange={onOppAd ? (v) => onOppAd(i, v) : undefined}
                        myAdLabels={myAdLabels}
                        oppAdLabels={oppAdLabels}
                    />
                ))}
            </div>
            {!single && (
                <>
                    <div className="mt-2">
                        <AddButton label="게임 추가" onClick={() => onAddSet?.()} />
                    </div>
                    <p className="mt-2 text-body2 text-muted-foreground">게임마다 승패가 따로 기록되며, 통계에도 게임 단위로 반영됩니다.</p>
                </>
            )}
        </div>
    )
}
