import Link from 'next/link'
import { CARD_BASE, SECTION_LABEL, TEXT_MUTED, calcWinRate } from '@/lib/dashboard/tokens'
import { Medal } from 'lucide-react'
import type { ActivityRankingEntry } from '@/lib/queries/club-dashboard'

type ActivityRankingCardProps = {
    ranking: ActivityRankingEntry[]
}

const RANK_COLORS = ['text-yellow-500', 'text-slate-400', 'text-amber-600']

export function ActivityRankingCard({ ranking }: ActivityRankingCardProps) {
    return (
        <section className="space-y-3">
            <p className={SECTION_LABEL}>이번 달 활동 랭킹</p>
            <div className={`${CARD_BASE}`}>
                {ranking.length === 0 ? (
                    <p className={`text-sm ${TEXT_MUTED} text-center py-8`}>이번 달 확정된 경기가 없습니다.</p>
                ) : (
                    <div className="divide-y divide-border">
                        {ranking.map((entry, idx) => {
                            const winRate = calcWinRate(entry.winCount, entry.matchCount - entry.winCount)
                            const profileHref = entry.user && !entry.user.isGuest
                                ? `/profile/${entry.userId}`
                                : undefined

                            return (
                                <div key={entry.userId} className="flex items-center gap-3 px-4 py-3">
                                    <div className="w-6 shrink-0 flex justify-center">
                                        {idx < 3 ? (
                                            <Medal className={`w-4 h-4 ${RANK_COLORS[idx]}`} />
                                        ) : (
                                            <span className={`text-sm font-medium ${TEXT_MUTED}`}>{idx + 1}</span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        {profileHref ? (
                                            <Link href={profileHref} className="text-sm font-medium text-foreground hover:text-foreground truncate block">
                                                {entry.user?.name ?? '알 수 없음'}
                                            </Link>
                                        ) : (
                                            <p className="text-sm font-medium text-foreground truncate">
                                                {entry.user?.name ?? '알 수 없음'}
                                            </p>
                                        )}
                                        <p className={`text-xs ${TEXT_MUTED}`}>{entry.user?.nickname}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-lg font-bold text-foreground">
                                            {entry.matchCount}
                                            <span className={`text-xs font-normal ml-0.5 ${TEXT_MUTED}`}>경기</span>
                                        </p>
                                        <p className={`text-xs ${TEXT_MUTED}`}>
                                            {winRate !== null ? `승률 ${winRate}%` : '기록 없음'}
                                        </p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </section>
    )
}
