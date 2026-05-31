import Link from 'next/link'
import { CARD_BASE, SECTION_LABEL, TEXT_MUTED } from '@/lib/dashboard/tokens'
import { Medal } from 'lucide-react'
import type { WinRateRankingEntry } from '@/lib/queries/club-dashboard'

type WinRateRankingCardProps = {
    singles: WinRateRankingEntry[]
    menDoubles: WinRateRankingEntry[]
    womenDoubles: WinRateRankingEntry[]
    mixedDoubles: WinRateRankingEntry[]
}

const RANK_COLORS = ['text-yellow-500', 'text-slate-400', 'text-amber-600']

function RankingColumn({ title, entries }: { title: string; entries: WinRateRankingEntry[] }) {
    return (
        <div className="min-w-0">
            <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-3">{title}</p>
            {entries.length === 0 ? (
                <p className={`text-xs ${TEXT_MUTED} py-6 text-center`}>데이터 없음</p>
            ) : (
                <div className="space-y-1">
                    {entries.map((entry, idx) => {
                        const profileHref = entry.user && !entry.user.isGuest
                            ? `/profile/${entry.userId}`
                            : undefined

                        return (
                            <div key={entry.userId} className="flex items-center gap-2 py-2">
                                <div className="w-5 shrink-0 flex justify-center">
                                    {idx < 3 ? (
                                        <Medal className={`w-3.5 h-3.5 ${RANK_COLORS[idx]}`} />
                                    ) : (
                                        <span className={`text-xs font-medium ${TEXT_MUTED}`}>{idx + 1}</span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    {profileHref ? (
                                        <Link href={profileHref} className="text-sm text-foreground hover:text-foreground truncate block leading-tight">
                                            {entry.user?.name ?? '알 수 없음'}
                                        </Link>
                                    ) : (
                                        <p className="text-sm text-foreground truncate leading-tight">
                                            {entry.user?.name ?? '알 수 없음'}
                                        </p>
                                    )}
                                    <p className={`text-[11px] ${TEXT_MUTED}`}>{entry.winCount}승 {entry.lossCount}패</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-xl font-bold text-foreground leading-tight">{entry.winRate}<span className={`text-xs font-normal ml-0.5 ${TEXT_MUTED}`}>%</span></p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

export function WinRateRankingCard({ singles, menDoubles, womenDoubles, mixedDoubles }: WinRateRankingCardProps) {
    return (
        <section className="space-y-3">
            <p className={SECTION_LABEL}>승률 랭킹</p>
            <div className={`${CARD_BASE} p-4`}>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 [&>*:not(:first-child)]:border-l [&>*:not(:first-child)]:border-border [&>*:not(:first-child)]:pl-6">
                    <RankingColumn title="단식" entries={singles} />
                    <RankingColumn title="남자복식" entries={menDoubles} />
                    <RankingColumn title="여자복식" entries={womenDoubles} />
                    <RankingColumn title="혼합복식" entries={mixedDoubles} />
                </div>
            </div>
        </section>
    )
}
