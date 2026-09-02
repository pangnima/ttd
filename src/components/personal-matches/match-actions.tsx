'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import type { PersonalMatch } from '@/types'
import { Button } from '@/components/ui/button'
import { deletePersonalMatchAction, updatePersonalMatchSetsAction } from '@/lib/actions/personal-matches'
import { MatchResultDialog } from '@/components/personal-matches/match-result-dialog'
import { MutualResultActions } from '@/components/personal-matches/mutual-result-actions'
import { useResultDialog } from '@/components/personal-matches/use-result-dialog'

type Props = { match: PersonalMatch }

/**
 * 개인 경기 카드 우측 액션.
 *  - 상호 확인 경기 → MutualResultActions (제안/확인 플로우)
 *  - 자유 기록: 미확정이면 [결과 입력](즉시 확정) + 수정/삭제
 */
export function MatchActions({ match }: Props) {
    if (match.sourceRequestId) return <MutualResultActions match={match} />
    return <FreeMatchActions match={match} />
}

function FreeMatchActions({ match }: Props) {
    const [isDeleting, startDelete] = useTransition()
    const d = useResultDialog()

    function handleDelete() {
        if (!confirm('이 경기 기록을 삭제할까요?')) return
        startDelete(async () => { await deletePersonalMatchAction(match.id) })
    }

    return (
        <span className="flex items-center gap-2">
            {match.winner === null && (
                <>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={d.openDialog}>
                        결과 입력
                    </Button>
                    <MatchResultDialog
                        mode="propose"
                        open={d.open}
                        onOpenChange={d.setOpen}
                        opponentName={match.opponentName}
                        title="경기 결과 입력"
                        onSubmit={(sets) => d.run(() => updatePersonalMatchSetsAction(match.id, sets))}
                        isPending={d.isPending}
                        error={d.error}
                    />
                </>
            )}
            <Link href={`/me/personal-matches/${match.id}/edit`} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                수정
            </Link>
            <button onClick={handleDelete} disabled={isDeleting} className="text-xs text-destructive/80 hover:text-destructive transition-colors disabled:opacity-40">
                삭제
            </button>
        </span>
    )
}
