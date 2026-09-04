'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import type { PersonalMatch } from '@/types'
import { Button } from '@/components/ui/button'
import { deletePersonalMatchAction, updatePersonalMatchSetsAction } from '@/lib/actions/personal-matches'
import { buildAdLabels, formatOpponents, formatTeams } from '@/lib/personal-matches/labels'
import { hasResult } from '@/lib/personal-matches/winner'
import { isLineupComplete } from '@/lib/personal-matches/lineup'
import { MatchResultDialog } from '@/components/personal-matches/match-result-dialog'
import { MutualResultActions } from '@/components/personal-matches/mutual-result-actions'
import { useResultDialog } from '@/components/personal-matches/use-result-dialog'

type Props = { match: PersonalMatch }

/**
 * 개인 경기 카드 우측 액션.
 *  - 상호 확인 경기 → MutualResultActions (제안/확인 플로우)
 *  - 자유 기록: 미확정이면 [결과 입력](즉시 확정, 복식은 애드/듀스 포함) + 수정/삭제
 */
export function MatchActions({ match }: Props) {
    if (match.sourceRequestId) return <MutualResultActions match={match} />
    return <FreeMatchActions match={match} />
}

function FreeMatchActions({ match }: Props) {
    const [isDeleting, startDelete] = useTransition()
    const d = useResultDialog()
    // 모집 중(참가자 미정)인 기록에는 결과를 넣을 수 없다 — 통계는 상대가 정해진 경기만 집계한다(액션도 같은 규칙으로 방어)
    const lineupReady = isLineupComplete(match)

    function handleDelete() {
        if (!confirm('이 경기 기록을 삭제할까요?')) return
        startDelete(async () => { await deletePersonalMatchAction(match.id) })
    }

    return (
        <span className="flex items-center gap-2">
            {!hasResult(match) && !lineupReady && (
                <span className="text-caption text-muted-foreground">참가자를 채우면 결과 입력</span>
            )}
            {!hasResult(match) && lineupReady && (
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
            )}
            <Link href={`/me/personal-matches/${match.id}/edit`} className="text-caption text-muted-foreground hover:text-foreground transition-colors">
                수정
            </Link>
            <button onClick={handleDelete} disabled={isDeleting} className="text-caption text-destructive/80 hover:text-destructive transition-colors disabled:opacity-40">
                삭제
            </button>
        </span>
    )
}
