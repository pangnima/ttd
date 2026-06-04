import Link from 'next/link'
import type { PersonalMatch } from '@/types'
import { CARD_BASE, SECTION_LABEL } from '@/lib/dashboard/tokens'
import { PERSONAL_OUTCOME_LABEL } from '@/lib/dashboard/outcome'
import { MATCH_TYPE_LABELS } from '@/lib/dashboard/match-type-style'

type Props = {
    personalMatches: PersonalMatch[]
}

// 개인 경기 미리보기 목록에서 사용하는 승/패/무 색상
const WINNER_CLS: Record<string, string> = {
    me: 'text-emerald-600 dark:text-emerald-400',
    opponent: 'text-red-600 dark:text-red-400',
    draw: 'text-muted-foreground',
}

export function PersonalMatchesPreview({ personalMatches }: Props) {
    const recent = personalMatches.slice(0, 5)

    return (
        <section className="space-y-3">
            <div className="flex items-center justify-between">
                <p className={SECTION_LABEL}>개인 경기 기록</p>
                <Link
                    href="/me/personal-matches"
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                    전체 보기 →
                </Link>
            </div>
            <div className={CARD_BASE}>
                {recent.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground text-center py-8">
                        기록된 개인 경기가 없습니다.{' '}
                        <Link href="/me/personal-matches/new" className="text-primary hover:underline">
                            첫 경기 입력하기
                        </Link>
                    </div>
                ) : (
                    <ul className="divide-y divide-border">
                        {recent.map((pm) => {
                            const scoreStr = pm.setScores.map((s) => `${s.me}-${s.opp}`).join(', ')
                            return (
                                <li key={pm.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                                    <span className={`w-5 font-bold tabular-nums ${WINNER_CLS[pm.winner] ?? WINNER_CLS.draw}`}>
                                        {PERSONAL_OUTCOME_LABEL[pm.winner] ?? '무'}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-foreground truncate">vs {pm.opponentName}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {MATCH_TYPE_LABELS[pm.matchType] ?? pm.matchType}
                                            {scoreStr && ` · ${scoreStr}`}
                                        </p>
                                    </div>
                                    <span className="text-xs text-muted-foreground tabular-nums shrink-0">{pm.playedAt}</span>
                                </li>
                            )
                        })}
                    </ul>
                )}
            </div>
        </section>
    )
}
