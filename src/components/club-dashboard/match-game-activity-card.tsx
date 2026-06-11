import Link from 'next/link'
import { CARD_BASE, SECTION_LABEL, TEXT_META, TEXT_MUTED, PILL_BASE } from '@/lib/dashboard/tokens'
import { formatShortDate } from '@/lib/format'
import { Trophy, Calendar, ChevronRight } from 'lucide-react'
import type { ClubMatchGameActivity } from '@/lib/queries/club-dashboard'

type MatchGameActivityCardProps = {
    clubId: string
    activity: ClubMatchGameActivity
}

export function MatchGameActivityCard({ clubId, activity }: MatchGameActivityCardProps) {
    return (
        <section className="space-y-3">
            <p className={SECTION_LABEL}>대진표 현황</p>
            <div className={`${CARD_BASE} p-4 space-y-4`}>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <p className="text-2xl font-bold text-foreground">
                            {activity.fixedCount}
                            <span className={`text-sm font-normal ml-1 ${TEXT_META}`}>개</span>
                        </p>
                        <p className={`text-sm ${TEXT_MUTED}`}>확정 완료</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-2xl font-bold text-foreground">
                            {activity.pendingCount}
                            <span className={`text-sm font-normal ml-1 ${TEXT_META}`}>개</span>
                        </p>
                        <p className={`text-sm ${TEXT_MUTED}`}>진행 예정</p>
                    </div>
                </div>

                {activity.nextGame && (
                    <div className="flex items-center gap-2 pt-3 border-t border-border">
                        <Calendar className={`w-3.5 h-3.5 shrink-0 ${TEXT_MUTED}`} />
                        <span className={`text-xs ${TEXT_MUTED}`}>다음 예정</span>
                        <span className={`${PILL_BASE} text-[10px] border-info/40 text-info bg-info/10`}>
                            {formatShortDate(activity.nextGame.date)}
                        </span>
                        <Link
                            href={`/clubs/${clubId}/match-games/${activity.nextGame.id}`}
                            className={`text-xs ${TEXT_MUTED} hover:text-foreground truncate flex-1 text-right`}
                        >
                            {activity.nextGame.name}
                        </Link>
                    </div>
                )}

                {activity.recentGames.length > 0 && (
                    <div className="space-y-2 pt-3 border-t border-border">
                        <div className="flex items-center justify-between">
                            <span className={`text-xs font-medium text-muted-foreground`}>최근 대진표</span>
                            <Link
                                href={`/clubs/${clubId}/match-games`}
                                className={`text-xs ${TEXT_MUTED} hover:text-foreground flex items-center gap-0.5`}
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
                                    <span className="text-sm text-foreground truncate">{g.name}</span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <span className={`text-xs ${TEXT_MUTED}`}>{formatShortDate(g.date)}</span>
                                    <span className={`${PILL_BASE} text-[10px] ${g.isFixed ? 'border-win/40 text-win bg-win/10' : 'border-border text-muted-foreground'}`}>
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
