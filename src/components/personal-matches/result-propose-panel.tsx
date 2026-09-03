'use client'

import type { PersonalMatchSetScore } from '@/types'
import type { AdLabels } from '@/lib/personal-matches/labels'
import { Button } from '@/components/ui/button'
import { DialogFooter } from '@/components/ui/dialog'
import { SetsSection } from '@/components/personal-matches/form-sections/sets-section'
import { SetScoreChips } from '@/components/personal-matches/set-score-chips'
import { useSetScores, MAX_SETS } from '@/components/personal-matches/use-set-scores'

type Props = {
    opponentName: string  // 단식 상대 또는 "상대1 · 상대2"
    initialSets?: PersonalMatchSetScore[]
    onSubmit: (sets: PersonalMatchSetScore[]) => void
    isPending: boolean
    error: string | null
    submitLabel?: string
    // 복식: 게임별 애드(백핸드) 코트 토글 노출용 라벨. 단식이면 undefined
    adLabels?: AdLabels
}

/**
 * 결과 등록 Dialog의 입력 패널 — 게임 추가/삭제 + 실시간 게임별 결과 미리보기 + 저장.
 * 스코어 입력 부품(SetsSection/SetScoreRow)은 로테이션 게임 빌더와 공유한다(로테이션은 single 모드).
 * 복식이면 adLabels로 게임별 애드/듀스 토글이 켜진다(doubles-court 통계 입력).
 */
export function ResultProposePanel({
    opponentName, initialSets, onSubmit, isPending, error, submitLabel = '결과 저장', adLabels,
}: Props) {
    const s = useSetScores(initialSets)

    return (
        <div className="space-y-4">
            <SetsSection
                sets={s.sets}
                isDoubles={!!adLabels}
                opponentLabel={opponentName}
                enableAdDeuce={!!adLabels}
                myAdLabels={adLabels?.myAdLabels}
                oppAdLabels={adLabels?.oppAdLabels}
                onAddSet={s.addSet}
                onUpdateSet={s.updateSet}
                onRemoveSet={s.removeSet}
                onMyAd={adLabels ? s.setMyAd : undefined}
                onOppAd={adLabels ? s.setOppAd : undefined}
            />
            {!s.canAdd && (
                <p className="text-caption text-muted-foreground">게임은 최대 {MAX_SETS}개까지 등록할 수 있습니다.</p>
            )}

            {/* 미리보기: 유효한 게임만으로 게임별 결과·전적 계산 */}
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 space-y-1">
                <p className="text-caption text-muted-foreground">게임별 결과</p>
                <SetScoreChips sets={s.sets} />
            </div>

            {error && <p className="text-caption text-destructive">{error}</p>}

            <DialogFooter showCloseButton>
                <Button
                    type="button"
                    disabled={!s.isValid || isPending}
                    onClick={() => onSubmit(s.cleanSets())}
                >
                    {isPending ? '저장 중...' : submitLabel}
                </Button>
            </DialogFooter>
        </div>
    )
}
