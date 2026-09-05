'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import type { PersonalMatch } from '@/types'
import { Button } from '@/components/ui/button'
import { deletePersonalMatchAction, updatePersonalMatchSetsAction } from '@/lib/actions/personal-matches'
import { buildAdLabels, formatOpponents, formatTeams } from '@/lib/personal-matches/labels'
import { MatchResultDialog } from '@/components/personal-matches/match-result-dialog'
import { useResultDialog } from '@/components/personal-matches/use-result-dialog'

type Props = { match: PersonalMatch }

const LOCKED_BADGE = 'text-caption px-1.5 py-0.5 rounded-sm border border-primary/40 text-primary'

/**
 * 개인 경기 **결과**(확정) 카드의 우측 액션.
 *  - 상호 확인 경기 → 잠금 배지 (수정·삭제를 DB가 RESTRICTIVE 정책으로 막는다)
 *  - 자유 기록 → 수정/삭제
 * 미확정 경기의 결과 입력·확인·참가자 채우기는 확인 요청 허브(PendingMatchActions)가 담당한다.
 */
export function MatchActions({ match }: Props) {
    if (match.sourceRequestId) return <MutualLockedBadge />
    return <FreeMatchEditActions match={match} />
}

/** 상대 확인으로 확정된 경기 표식 — 상호 확인 경기는 양쪽 기록이 한 쌍이라 혼자 고칠 수 없다 */
export function MutualLockedBadge() {
    return (
        <span className={LOCKED_BADGE} title="상대 확인으로 확정된 경기는 수정·삭제할 수 없습니다">
            상호 확인
        </span>
    )
}

/**
 * 자유 기록의 [결과 입력] — 상대 확인 없이 즉시 확정한다(복식은 세트별 애드/듀스 포함).
 * 개인 경기 결과 목록과 확인 요청 허브가 공용한다.
 */
export function FreeResultEntryButton({ match }: Props) {
    const d = useResultDialog()
    return (
        <>
            <Button size="sm" variant="outline" className="h-7 text-caption" onClick={d.openDialog}>
                결과 입력
            </Button>
            <MatchResultDialog
                mode="propose"
                open={d.open}
                onOpenChange={d.setOpen}
                opponentName={formatOpponents(match)}
                title="경기 결과 입력"
                description={formatTeams(match)}
                adLabels={buildAdLabels(match)}
                onSubmit={(sets) => d.run(() => updatePersonalMatchSetsAction(match.id, sets))}
                isPending={d.isPending}
                error={d.error}
            />
        </>
    )
}

/**
 * 자유 기록의 수정/삭제 — 상호 확인 경기에는 붙지 않는다(RESTRICTIVE 정책으로 DB가 잠근다).
 * editLabel은 모집 중 기록에서 '참가자 채우기'로 바꿔 다는 용도(목적지는 같은 수정 폼).
 */
export function FreeMatchEditActions({ match, editLabel = '수정' }: Props & { editLabel?: string }) {
    const [isDeleting, startDelete] = useTransition()

    function handleDelete() {
        if (!confirm('이 경기 기록을 삭제할까요?')) return
        startDelete(async () => { await deletePersonalMatchAction(match.id) })
    }

    return (
        <>
            <Link href={`/me/personal-matches/${match.id}/edit`} className="text-caption text-muted-foreground hover:text-foreground transition-colors">
                {editLabel}
            </Link>
            <button onClick={handleDelete} disabled={isDeleting} className="text-caption text-destructive/80 hover:text-destructive transition-colors disabled:opacity-40">
                삭제
            </button>
        </>
    )
}
