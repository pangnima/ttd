'use client'

import Link from 'next/link'
import { useTransition } from 'react'
import type { PersonalMatch } from '@/types'
import { deletePersonalMatchAction } from '@/lib/actions/personal-matches'
import { PERSONAL_OUTCOME_STYLE, PERSONAL_OUTCOME_LABEL } from '@/lib/dashboard/outcome'
import { SURFACE_LABELS } from '@/lib/dashboard/surface'
import { MATCH_TYPE_LABELS } from '@/lib/dashboard/match-type-style'

type Props = { match: PersonalMatch }

export function PersonalMatchListItem({ match: m }: Props) {
    const [isPending, startTransition] = useTransition()

    function handleDelete() {
        if (!confirm('이 경기 기록을 삭제할까요?')) return
        startTransition(async () => {
            await deletePersonalMatchAction(m.id)
        })
    }

    // 복식이면 상대팀 2명을 병기 (상대 #2가 있을 때만)
    const opponentLabel = m.opponent2Name
        ? `${m.opponentName} · ${m.opponent2Name}`
        : m.opponentName

    return (
        <div className="flex items-center justify-between p-4">
            <div className="space-y-0.5 flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                    vs <span className="text-foreground">{opponentLabel}</span>
                    <span className={`ml-2 text-base ${PERSONAL_OUTCOME_STYLE[m.winner]}`}>
                        {PERSONAL_OUTCOME_LABEL[m.winner]}
                    </span>
                </p>
                {m.partnerName && (
                    <p className="text-xs text-muted-foreground">파트너: {m.partnerName}</p>
                )}
                <p className="text-xs text-muted-foreground">
                    {m.playedAt}
                    <span className="mx-1 text-muted-foreground">·</span>
                    {MATCH_TYPE_LABELS[m.matchType]}
                    {m.surface && (
                        <>
                            <span className="mx-1 text-muted-foreground">·</span>
                            {SURFACE_LABELS[m.surface] ?? m.surface}
                        </>
                    )}
                </p>
                {m.setScores.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                        세트: {m.setScores.map((s, i) => (
                            <span key={i}>{i > 0 ? ' ' : ''}{s.me}-{s.opp}</span>
                        ))}
                    </p>
                )}
                {m.notes && (
                    <p className="text-xs text-muted-foreground truncate max-w-xs">{m.notes}</p>
                )}
            </div>
            <div className="flex items-center gap-2 ml-3 shrink-0">
                <Link
                    href={`/me/personal-matches/${m.id}/edit`}
                    className="text-xs text-muted-foreground hover:text-foreground/80 transition-colors"
                >
                    수정
                </Link>
                <button
                    onClick={handleDelete}
                    disabled={isPending}
                    className="text-xs text-destructive/80 hover:text-destructive transition-colors disabled:opacity-40"
                >
                    삭제
                </button>
            </div>
        </div>
    )
}
