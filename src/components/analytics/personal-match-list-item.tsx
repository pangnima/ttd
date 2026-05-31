'use client'

import Link from 'next/link'
import { useTransition } from 'react'
import type { PersonalMatch } from '@/types'
import { deletePersonalMatchAction } from '@/lib/actions/personal-matches'

type Props = { match: PersonalMatch }

const SURFACE_LABEL: Record<string, string> = {
    hard: '하드', clay: '클레이', grass: '인조잔디', other: '기타',
}
const MATCH_TYPE_LABEL: Record<string, string> = {
    singles: '단식', men_doubles: '남복', women_doubles: '여복', mixed_doubles: '혼복',
}
const WINNER_STYLE: Record<string, string> = {
    me: 'text-green-600 font-bold',
    opponent: 'text-red-500 font-bold',
    draw: 'text-muted-foreground font-bold',
}
const WINNER_LABEL: Record<string, string> = { me: '승', opponent: '패', draw: '무' }

export function PersonalMatchListItem({ match: m }: Props) {
    const [isPending, startTransition] = useTransition()

    function handleDelete() {
        if (!confirm('이 경기 기록을 삭제할까요?')) return
        startTransition(async () => {
            await deletePersonalMatchAction(m.id)
        })
    }

    return (
        <div className="flex items-center justify-between p-4">
            <div className="space-y-0.5 flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                    vs <span className="text-foreground">{m.opponentName}</span>
                    <span className={`ml-2 text-base ${WINNER_STYLE[m.winner]}`}>
                        {WINNER_LABEL[m.winner]}
                    </span>
                </p>
                <p className="text-xs text-muted-foreground">
                    {m.playedAt}
                    <span className="mx-1 text-muted-foreground">·</span>
                    {MATCH_TYPE_LABEL[m.matchType]}
                    {m.surface && (
                        <>
                            <span className="mx-1 text-muted-foreground">·</span>
                            {SURFACE_LABEL[m.surface]}
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
                    className="text-xs text-red-400 hover:text-red-600 transition-colors disabled:opacity-40"
                >
                    삭제
                </button>
            </div>
        </div>
    )
}
