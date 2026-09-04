import Link from 'next/link'
import { Crown } from 'lucide-react'
import { CARD_BASE, TYPO, TEXT_MUTED } from '@/lib/dashboard/tokens'
import { formatRecord } from '@/lib/dashboard/outcome'
import { RankBadge } from '@/components/common/rank-badge'
import { MATCH_TYPE_LABELS, getMatchTypeBadgeClass } from '@/lib/dashboard/match-type-style'
import type { MatchType } from '@/types'
import type { WinRateRankingEntry } from '@/lib/queries/club-dashboard'

type ClubAceCardProps = {
    clubId: string
    singles: WinRateRankingEntry[]
    menDoubles: WinRateRankingEntry[]
    womenDoubles: WinRateRankingEntry[]
    mixedDoubles: WinRateRankingEntry[]
}

function entryName(entry: WinRateRankingEntry) {
    return entry.user?.name ?? '알 수 없음'
}

function profileHrefOf(entry: WinRateRankingEntry, clubId: string) {
    return entry.user && !entry.user.isGuest ? `/profile/${entry.userId}?clubId=${clubId}` : undefined
}

function AceColumn({ type, entries, clubId }: { type: MatchType; entries: WinRateRankingEntry[]; clubId: string }) {
    const top3 = entries.slice(0, 3)
    const ace = top3[0]
    const runnersUp = top3.slice(1)
    const aceHref = ace ? profileHrefOf(ace, clubId) : undefined

    return (
        <div className={`${CARD_BASE} p-4 flex flex-col gap-3`}>
            <span className={`self-start ${getMatchTypeBadgeClass(type)} border rounded-[4px] px-2 py-0.5 text-micro font-medium`}>
                {MATCH_TYPE_LABELS[type]}
            </span>
            {ace ? (
                <div className="flex flex-col gap-3">
                    {/* 1위 — 에이스 강조 */}
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <Crown className="w-4 h-4 shrink-0 text-spot" />
                            {aceHref ? (
                                <Link href={aceHref} className="text-body font-semibold text-foreground hover:text-foreground truncate">
                                    {entryName(ace)}
                                </Link>
                            ) : (
                                <span className="text-body font-semibold text-foreground truncate">{entryName(ace)}</span>
                            )}
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-h2 font-bold tabular-nums text-foreground leading-none">
                                {ace.winRate}<span className={`text-caption font-normal ml-0.5 ${TEXT_MUTED}`}>%</span>
                            </span>
                            <span className={`text-caption ${TEXT_MUTED}`}>{formatRecord(ace.winCount, ace.lossCount)}</span>
                        </div>
                    </div>

                    {/* 2·3위 */}
                    {runnersUp.length > 0 && (
                        <div className="space-y-1.5 pt-2 border-t border-border">
                            {runnersUp.map((entry, idx) => {
                                const href = profileHrefOf(entry, clubId)
                                return (
                                    <div key={entry.userId} className="flex items-center gap-2">
                                        <div className="w-4 shrink-0 flex justify-center">
                                            <RankBadge index={idx + 1} iconClass="w-3.5 h-3.5" textClass="text-caption" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            {href ? (
                                                <Link href={href} className="text-body2 text-foreground hover:text-foreground truncate block leading-tight">
                                                    {entryName(entry)}
                                                </Link>
                                            ) : (
                                                <p className="text-body2 text-foreground truncate leading-tight">{entryName(entry)}</p>
                                            )}
                                            <p className={`text-caption ${TEXT_MUTED}`}>{formatRecord(entry.winCount, entry.lossCount)}</p>
                                        </div>
                                        <span className="text-body2 font-semibold text-foreground shrink-0">
                                            {entry.winRate}<span className={`text-caption font-normal ml-0.5 ${TEXT_MUTED}`}>%</span>
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            ) : (
                <p className={`text-body2 ${TEXT_MUTED} py-3`}>아직 에이스 없음</p>
            )}
        </div>
    )
}

export function ClubAceCard({ clubId, singles, menDoubles, womenDoubles, mixedDoubles }: ClubAceCardProps) {
    return (
        <section className="space-y-3">
            <h2 className={TYPO.h4}>우리 클럽 에이스</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <AceColumn type="singles" entries={singles} clubId={clubId} />
                <AceColumn type="men_doubles" entries={menDoubles} clubId={clubId} />
                <AceColumn type="women_doubles" entries={womenDoubles} clubId={clubId} />
                <AceColumn type="mixed_doubles" entries={mixedDoubles} clubId={clubId} />
            </div>
        </section>
    )
}
