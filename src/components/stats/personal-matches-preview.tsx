import Link from 'next/link'
import type { PersonalMatch } from '@/types'
import { CARD_BASE, SECTION_LABEL } from '@/lib/dashboard/tokens'
import { PERSONAL_OUTCOME_LABEL, PERSONAL_OUTCOME_STYLE } from '@/lib/dashboard/outcome'
import { MATCH_TYPE_LABELS } from '@/lib/dashboard/match-type-style'

type Props = {
    personalMatches: PersonalMatch[]
}

export function PersonalMatchesPreview({ personalMatches }: Props) {
    const recent = personalMatches.slice(0, 5)

    return (
        <section className="space-y-3">
            <div className="flex items-center justify-between">
                <p className={SECTION_LABEL}>개인 경기 기록</p>
                <div className="flex items-center gap-2">
                    <Link
                        href="/me/personal-matches/new"
                        className="inline-flex items-center gap-1 text-xs border border-border rounded-[4px] px-2.5 py-1 text-foreground hover:border-input transition-colors"
                    >
                        + 경기 추가
                    </Link>
                    <Link
                        href="/me/personal-matches"
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                        전체 보기 →
                    </Link>
                </div>
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
                                    <span className={`w-5 tabular-nums ${PERSONAL_OUTCOME_STYLE[pm.winner] ?? PERSONAL_OUTCOME_STYLE.draw}`}>
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
