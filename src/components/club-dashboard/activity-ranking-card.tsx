import { TEXT_MUTED, calcWinRate } from '@/lib/dashboard/tokens'
import { SectionCard } from '@/components/common/section-card'
import { ProfileLink } from '@/components/common/profile-link'
import { RankBadge } from '@/components/common/rank-badge'
import type { ActivityRankingEntry } from '@/lib/queries/club-dashboard'

type ActivityRankingCardProps = {
    ranking: ActivityRankingEntry[]
}

export function ActivityRankingCard({ ranking }: ActivityRankingCardProps) {
    return (
        <SectionCard
            title="이번 달 활동 랭킹"
            isEmpty={ranking.length === 0}
            emptyMessage="이번 달 확정된 경기가 없습니다."
            contentClass=""
        >
            <div className="divide-y divide-border">
                {ranking.map((entry, idx) => {
                    const winRate = calcWinRate(entry.winCount, entry.matchCount - entry.winCount)

                    return (
                        <div key={entry.userId} className="flex items-center gap-3 px-4 py-3">
                            <div className="w-6 shrink-0 flex justify-center">
                                <RankBadge index={idx} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <ProfileLink
                                    userId={entry.userId}
                                    isGuest={!entry.user || entry.user.isGuest}
                                    className="text-sm font-medium text-foreground hover:text-foreground truncate block"
                                >
                                    {entry.user?.name ?? '알 수 없음'}
                                </ProfileLink>
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
        </SectionCard>
    )
}
