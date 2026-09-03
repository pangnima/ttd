import Link from 'next/link'
import { CARD_BASE, TYPO, TEXT_MUTED, PILL_BASE } from '@/lib/dashboard/tokens'
import { formatShortDate } from '@/lib/format'
import { Trophy, Calendar, ChevronRight } from 'lucide-react'
import { MATCH_TYPE_LABELS, getMatchTypeBadgeClass } from '@/lib/dashboard/match-type-style'
import type { MatchType } from '@/types'
import type { ClubMatchGameActivity, MatchTypeCounts } from '@/lib/queries/club-dashboard'

const MATCH_TYPE_ORDER: ReadonlyArray<{ type: MatchType; key: keyof MatchTypeCounts }> = [
    { type: 'singles', key: 'singles' },
    { type: 'men_doubles', key: 'menDoubles' },
    { type: 'women_doubles', key: 'womenDoubles' },
    { type: 'mixed_doubles', key: 'mixedDoubles' },
]

type MatchGameActivityCardProps = {
    clubId: string
    activity: ClubMatchGameActivity
}

export function MatchGameActivityCard({ clubId, activity }: MatchGameActivityCardProps) {
    const totalMatches = MATCH_TYPE_ORDER.reduce((sum, { key }) => sum + activity.matchTypeCounts[key], 0)

    return (
        <section className="space-y-3">
            <h2 className={TYPO.h4}>대진표 현황</h2>
            <div className={`${CARD_BASE} p-4 space-y-4`}>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-body2">
                    <span className={TEXT_MUTED}>확정 완료 <span className="text-body font-bold text-foreground">{activity.fixedCount}</span></span>
                    <span className="text-border">·</span>
                    <span className={TEXT_MUTED}>진행 예정 <span className="text-body font-bold text-foreground">{activity.pendingCount}</span></span>
                    {totalMatches > 0 && (
                        <>
                            <span className="text-border">·</span>
                            <span className={TEXT_MUTED}>총 <span className="text-body font-bold text-foreground">{totalMatches}</span>경기</span>
                            <span className="mx-0.5 h-4 w-px bg-border hidden sm:block" />
                            {MATCH_TYPE_ORDER.map(({ type, key }) => (
                                <span key={type} className="flex items-center gap-1">
                                    <span className={`${getMatchTypeBadgeClass(type)} border rounded-[4px] px-1.5 py-0.5 text-micro font-medium shrink-0`}>
                                        {MATCH_TYPE_LABELS[type]}
                                    </span>
                                    <span className="text-body2 font-semibold text-foreground">{activity.matchTypeCounts[key]}</span>
                                </span>
                            ))}
                        </>
                    )}
                </div>

                {activity.nextGame && (
                    <div className="flex items-center gap-2 pt-3 border-t border-border">
                        <Calendar className={`w-3.5 h-3.5 shrink-0 ${TEXT_MUTED}`} />
                        <span className={`text-caption ${TEXT_MUTED}`}>다음 예정</span>
                        <span className={`${PILL_BASE} text-micro border-info/40 text-info bg-info/10`}>
                            {formatShortDate(activity.nextGame.date)}
                        </span>
                        <Link
                            href={`/clubs/${clubId}/match-games/${activity.nextGame.id}`}
                            className={`text-caption ${TEXT_MUTED} hover:text-foreground truncate flex-1 text-right`}
                        >
                            {activity.nextGame.name}
                        </Link>
                    </div>
                )}

                {activity.recentGames.length > 0 && (
                    <div className="space-y-2 pt-3 border-t border-border">
                        <div className="flex items-center justify-between">
                            <span className={`text-caption font-medium text-muted-foreground`}>최근 대진표</span>
                            <Link
                                href={`/clubs/${clubId}/match-games`}
                                className={`text-caption ${TEXT_MUTED} hover:text-foreground flex items-center gap-0.5`}
                            >
                                전체보기 <ChevronRight className="w-3 h-3" />
                            </Link>
                        </div>
                        {activity.recentGames.slice(0, 4).map((g) => (
                            <Link
                                key={g.id}
                                href={`/clubs/${clubId}/match-games/${g.id}`}
                                className="flex items-center justify-between gap-2 hover:opacity-70 transition-opacity"
                            >
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <Trophy className={`w-3 h-3 shrink-0 ${TEXT_MUTED}`} />
                                    <span className="text-body2 text-foreground truncate">{g.name}</span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <span className={`text-caption ${TEXT_MUTED}`}>{formatShortDate(g.date)}</span>
                                    <span className={`${PILL_BASE} text-micro ${g.isFixed ? 'border-win/40 text-win bg-win/10' : 'border-border text-muted-foreground'}`}>
                                        {g.isFixed ? '확정' : '예정'}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </section>
    )
}
