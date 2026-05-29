import Link from 'next/link'
import { CARD_BASE, SECTION_LABEL, TEXT_META, TEXT_MUTED, PILL_BASE } from '@/lib/dashboard/tokens'
import { Trophy, Calendar, ChevronRight } from 'lucide-react'
import type { ClubMatchGameActivity } from '@/lib/queries/club-dashboard'

type MatchGameActivityCardProps = {
    clubId: string
    activity: ClubMatchGameActivity
}

function formatDate(dateStr: string): string {
    return new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric' }).format(new Date(dateStr))
}

export function MatchGameActivityCard({ clubId, activity }: MatchGameActivityCardProps) {
    return (
        <div className={`${CARD_BASE} p-4 space-y-4`}>
            <p className={SECTION_LABEL}>대진표 현황</p>

            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <span className={`text-[11px] ${TEXT_MUTED}`}>확정 완료</span>
                    <p className="text-xl font-semibold text-foreground">
                        {activity.fixedCount}
                        <span className={`text-xs font-normal ml-0.5 ${TEXT_META}`}>개</span>
                    </p>
                </div>
                <div className="space-y-1">
                    <span className={`text-[11px] ${TEXT_MUTED}`}>진행 예정</span>
                    <p className="text-xl font-semibold text-foreground">
                        {activity.pendingCount}
                        <span className={`text-xs font-normal ml-0.5 ${TEXT_META}`}>개</span>
                    </p>
                </div>
            </div>

            {activity.nextGame && (
                <div className="flex items-center gap-2 pt-1 border-t border-foreground/8">
                    <Calendar className={`w-3.5 h-3.5 shrink-0 ${TEXT_MUTED}`} />
                    <span className={`text-xs ${TEXT_MUTED}`}>다음 예정</span>
                    <span className={`${PILL_BASE} text-[10px] border-blue-400/40 text-blue-400/85 bg-blue-400/8`}>
                        {formatDate(activity.nextGame.date)}
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
                <div className="space-y-2 pt-1 border-t border-foreground/8">
                    <div className="flex items-center justify-between">
                        <span className={`text-[11px] ${TEXT_MUTED}`}>최근 대진표</span>
                        <Link
                            href={`/clubs/${clubId}/match-games`}
                            className={`text-xs ${TEXT_MUTED} hover:text-foreground flex items-center gap-0.5`}
                        >
                            전체보기 <ChevronRight className="w-3 h-3" />
                        </Link>
                    </div>
                    {activity.recentGames.slice(0, 3).map((g) => (
                        <Link
                            key={g.id}
                            href={`/clubs/${clubId}/match-games/${g.id}`}
                            className="flex items-center justify-between gap-2 hover:opacity-70 transition-opacity"
                        >
                            <div className="flex items-center gap-1.5 min-w-0">
                                <Trophy className={`w-3 h-3 shrink-0 ${TEXT_MUTED}`} />
                                <span className="text-xs text-foreground/75 truncate">{g.name}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                <span className={`text-[10px] ${TEXT_MUTED}`}>{formatDate(g.date)}</span>
                                <span className={`${PILL_BASE} text-[10px] ${g.isFixed ? 'border-emerald-400/40 text-emerald-400/85 bg-emerald-400/8' : 'border-foreground/20 text-foreground/50'}`}>
                                    {g.isFixed ? '확정' : '예정'}
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}
