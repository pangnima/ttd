'use client'

import type { PersonalMatchSetScore } from '@/types'
import type { AdLabels } from '@/lib/personal-matches/labels'
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
    adLabels?: AdLabels  // 복식이면 게임별 애드/듀스 토글
}
type ReviewProps = {
    mode: 'review'
    proposedSets: PersonalMatchSetScore[]
    /** 제안자 표시 이름 — 없으면 opponentName */
    proposerName?: string
    onConfirm: () => void
    onDispute: (reason: string) => void
    progressLabel?: string  // '2/4명 확인' — 복식 만장일치 진행도(0060). 단식은 생략
    /** false면 [결과 확인] 없이 이의만 — 이미 확인한 좌석(정산 전에는 이의만 남는다, 0060 §7). 기본 true */
    confirmable?: boolean
}

type Props = (ProposeProps | ReviewProps) & {
    open: boolean
    onOpenChange: (open: boolean) => void
    opponentName: string   // 단식 상대 또는 "상대1 · 상대2"
    title: string
    description?: string   // 기본: "vs {opponentName}" (복식은 formatTeams 결과를 넘긴다)
    isPending: boolean
    error: string | null
}

/**
 * 내 경기 결과 등록 레이어 팝업.
 *  - propose: 게임별 스코어 입력(추가/삭제) → 저장 (자유 기록은 즉시 확정, 상호 확인 경기는 회원 참가자 확인 대기)
 *  - review : 제안된 게임 스코어를 검토 → 확인 / 이의 제기 (회원 좌석 전원이 확인하면 확정, 0060)
 * 닫히면 내부 패널이 언마운트되어 입력 state가 초기화된다. 복식 게임의 애드/듀스는 propose 모드에서 입력한다.
 */
export function MatchResultDialog(props: Props) {
    const { open, onOpenChange, opponentName, title, description, isPending, error } = props
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md" showCloseButton={false}>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        {description ?? `vs ${opponentName}`}
                    </DialogDescription>
                </DialogHeader>

                {props.mode === 'propose' ? (
                    <ResultProposePanel
                        onCancel={() => onOpenChange(false)}
                        opponentName={opponentName}
                        initialSets={props.initialSets}
                        onSubmit={props.onSubmit}
                        submitLabel={props.submitLabel}
                        adLabels={props.adLabels}
                        isPending={isPending}
                        error={error}
                    />
                ) : (
                    <ResultReviewPanel
                        onCancel={() => onOpenChange(false)}
                        opponentName={opponentName}
                        proposerName={props.proposerName}
                        sets={props.proposedSets}
                        onConfirm={props.onConfirm}
                        onDispute={props.onDispute}
                        progressLabel={props.progressLabel}
                        confirmable={props.confirmable}
                        isPending={isPending}
                        error={error}
                    />
                )}
            </DialogContent>
        </Dialog>
    )
}
