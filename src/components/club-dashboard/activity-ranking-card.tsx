import Link from 'next/link'
import { CARD_BASE, SECTION_LABEL, TEXT_META, TEXT_MUTED, calcWinRate } from '@/lib/dashboard/tokens'
import { Medal } from 'lucide-react'
import type { ActivityRankingEntry } from '@/lib/queries/club-dashboard'

type ActivityRankingCardProps = {
    ranking: ActivityRankingEntry[]
}

const RANK_COLORS = ['text-yellow-400', 'text-slate-300', 'text-amber-600']

export function ActivityRankingCard({ ranking }: ActivityRankingCardProps) {
    if (ranking.length === 0) {
        return (
            <div className={`${CARD_BASE} p-4 space-y-3`}>
                <p className={SECTION_LABEL}>이번 달 활동 랭킹</p>
                <p className={`text-sm ${TEXT_MUTED} text-center py-6`}>이번 달 확정된 경기가 없습니다.</p>
            </div>
        )
    }

    return (
        <div className={`${CARD_BASE} p-4 space-y-3`}>
            <p className={SECTION_LABEL}>이번 달 활동 랭킹</p>
            <div className="space-y-1">
                {ranking.map((entry, idx) => {
                    const winRate = calcWinRate(entry.winCount, entry.matchCount)
                    const profileHref = entry.user && !entry.user.isGuest
                        ? `/profile/${entry.userId}`
                        : undefined

                    return (
                        <div key={entry.userId} className="flex items-center gap-3 px-1 py-2">
                            <div className="w-6 shrink-0 flex justify-center">
                                {idx < 3 ? (
                                    <Medal className={`w-4 h-4 ${RANK_COLORS[idx]}`} />
                                ) : (
                                    <span className={`text-xs font-medium ${TEXT_MUTED}`}>{idx + 1}</span>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                {profileHref ? (
                                    <Link href={profileHref} className="text-sm text-foreground/85 hover:text-foreground truncate block">
                                        {entry.user?.name ?? '알 수 없음'}
                                    </Link>
                                ) : (
                                    <p className="text-sm text-foreground/85 truncate">
                                        {entry.user?.name ?? '알 수 없음'}
                                    </p>
                                )}
                                <p className={`text-[11px] ${TEXT_MUTED}`}>{entry.user?.nickname}</p>
                            </div>
                            <div className="text-right shrink-0">
                                <p className="text-sm font-semibold text-foreground">
                                    {entry.matchCount}
                                    <span className={`text-xs font-normal ml-0.5 ${TEXT_META}`}>경기</span>
                                </p>
                                <p className={`text-[11px] ${TEXT_MUTED}`}>{winRate}% 승률</p>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
