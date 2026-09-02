'use client'

import type { PersonalMatchSetScore } from '@/types'
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { ResultProposePanel } from '@/components/personal-matches/result-propose-panel'
import { ResultReviewPanel } from '@/components/personal-matches/result-review-panel'

type ProposeProps = {
    mode: 'propose'
    initialSets?: PersonalMatchSetScore[]
    onSubmit: (sets: PersonalMatchSetScore[]) => void
    submitLabel?: string
}
type ReviewProps = {
    mode: 'review'
    proposedSets: PersonalMatchSetScore[]
    onConfirm: () => void
    onDispute: (reason: string) => void
}

type Props = (ProposeProps | ReviewProps) & {
    open: boolean
    onOpenChange: (open: boolean) => void
    opponentName: string
    title: string
    description?: string
    isPending: boolean
    error: string | null
}

/**
 * 개인 경기 결과 등록 레이어 팝업.
 *  - propose: 세트별 스코어 입력(추가/삭제) → 저장 (자유 기록은 즉시 확정, 상호 확인 경기는 상대 확인 대기)
 *  - review : 상대가 제안한 세트를 검토 → 확인 / 이의 제기
 * 닫히면 내부 패널이 언마운트되어 입력 state가 초기화된다.
 */
export function MatchResultDialog(props: Props) {
    const { open, onOpenChange, opponentName, title, description, isPending, error } = props
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        {description ?? `vs ${opponentName}`}
                    </DialogDescription>
                </DialogHeader>

                {props.mode === 'propose' ? (
                    <ResultProposePanel
                        opponentName={opponentName}
                        initialSets={props.initialSets}
                        onSubmit={props.onSubmit}
                        submitLabel={props.submitLabel}
                        isPending={isPending}
                        error={error}
                    />
                ) : (
                    <ResultReviewPanel
                        opponentName={opponentName}
                        sets={props.proposedSets}
                        onConfirm={props.onConfirm}
                        onDispute={props.onDispute}
                        isPending={isPending}
                        error={error}
                    />
                )}
            </DialogContent>
        </Dialog>
    )
}
