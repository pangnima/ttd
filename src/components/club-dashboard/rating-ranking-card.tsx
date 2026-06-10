import Link from 'next/link'
import { CARD_BASE, SECTION_LABEL, TEXT_MUTED } from '@/lib/dashboard/tokens'
import { RankBadge } from '@/components/common/rank-badge'
import { GuestBadge } from '@/components/common/guest-badge'
import { ProvisionalBadge } from '@/components/common/provisional-badge'
import { formatClubRating, isProvisional } from '@/lib/rating/display'
import type { ClubRatingRankingEntry } from '@/lib/queries/ratings'

type RatingRankingCardProps = {
    clubId: string
    entries: ClubRatingRankingEntry[]
}

// 클럽 동적 레이팅(클럽 NTRP) 랭킹. 레이팅은 소수점 3자리로 표시(docs/rating-system.md §5).
export function RatingRankingCard({ clubId, entries }: RatingRankingCardProps) {
    return (
        <section className="space-y-3">
            <div className="flex items-center justify-between">
                <p className={SECTION_LABEL}>클럽 레이팅 랭킹</p>
                <span className={`text-[11px] ${TEXT_MUTED}`}>경기 결과로 자동 산정</span>
            </div>
            <div className={`${CARD_BASE} p-4`}>
                {entries.length === 0 ? (
                    <p className={`text-xs ${TEXT_MUTED} py-6 text-center`}>아직 확정된 경기가 없습니다</p>
                ) : (
                    <div className="space-y-1">
                        {entries.map((entry, idx) => {
                            const isGuest = entry.user?.isGuest ?? false
                            const name = entry.user?.name ?? '알 수 없음'
                            const profileHref = entry.user && !isGuest
                                ? `/profile/${entry.userId}?clubId=${clubId}`
                                : undefined

                            return (
                                <div key={entry.userId} className="flex items-center gap-3 py-2">
                                    <div className="w-5 shrink-0 flex justify-center">
                                        <RankBadge index={idx} iconClass="w-3.5 h-3.5" textClass="text-xs" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            {profileHref ? (
                                                <Link href={profileHref} className="text-sm text-foreground hover:text-foreground truncate leading-tight">
                                                    {name}
                                                </Link>
                                            ) : (
                                                <p className="text-sm text-foreground truncate leading-tight">{name}</p>
                                            )}
                                            {isGuest && <GuestBadge />}
                                            {isProvisional(entry.matchesPlayed) && <ProvisionalBadge />}
                                        </div>
                                        <p className={`text-[11px] ${TEXT_MUTED}`}>{entry.matchesPlayed}경기</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-xl font-bold font-mono text-foreground leading-tight tabular-nums">
                                            {formatClubRating(entry.rating)}
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
