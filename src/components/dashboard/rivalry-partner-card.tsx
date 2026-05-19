import Link from 'next/link'
import type { HeadToHead } from '@/lib/stats'
import type { PartnerStat } from '@/lib/queries/stats'
import type { User } from '@/types'
import { CARD_BASE, SECTION_LABEL, calcWinRate } from '@/lib/dashboard/tokens'

type Props = {
    rivals: HeadToHead[]
    partners: PartnerStat[]
    userMap: Map<string, User>
}

function UserRow({
    userId,
    wins,
    losses,
    draws,
    userMap,
}: {
    userId: string
    wins: number
    losses: number
    draws: number
    userMap: Map<string, User>
}) {
    const user = userMap.get(userId)
    const name = user?.nickname ?? '?'
    const isGuest = user?.isGuest ?? false

    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
                {!isGuest ? (
                    <Link
                        href={`/profile/${userId}`}
                        className="text-sm text-foreground/85 hover:text-foreground transition-colors truncate"
                    >
                        {name}
                    </Link>
                ) : (
                    <span className="text-sm text-foreground/85 truncate">{name}</span>
                )}
                {isGuest && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-foreground/15 text-foreground/55 shrink-0">
                        게스트
                    </span>
                )}
            </div>
            <span className="text-[11px] text-foreground/65 shrink-0">
                {wins}승 {losses}패{draws > 0 ? ` ${draws}무` : ''}
                <span className="ml-1.5 text-foreground/75">{calcWinRate(wins, losses) ?? 0}%</span>
            </span>
        </div>
    )
}

export function RivalryPartnerCard({ rivals, partners, userMap }: Props) {
    // 라이벌: 3회 이상 대전 중 순 패배수(losses-wins) 내림차순 — 가장 많이 진 상대 우선
    const topRivals = rivals
        .filter((r) => r.wins + r.losses >= 3)
        .sort((a, b) => (b.losses - b.wins) - (a.losses - a.wins))
        .slice(0, 3)

    const topPartners = partners
        .filter((p) => p.matches >= 2)
        .sort((a, b) => {
            const rateA = calcWinRate(a.wins, a.losses) ?? 0
            const rateB = calcWinRate(b.wins, b.losses) ?? 0
            return rateB - rateA || b.matches - a.matches
        })
        .slice(0, 3)

    return (
        <section className="space-y-3">
            <p className={SECTION_LABEL}>라이벌 · 파트너</p>
            <div className={`${CARD_BASE} p-4 grid grid-cols-1 sm:grid-cols-2 gap-6`}>
                <div className="space-y-3">
                    <p className="text-[11px] font-semibold text-foreground/50">라이벌 TOP</p>
                    {topRivals.length === 0 ? (
                        <p className="text-xs text-foreground/55">경기 3회 이상 상대 없음</p>
                    ) : (
                        <div className="space-y-2">
                            {topRivals.map((r) => (
                                <UserRow
                                    key={r.opponentId}
                                    userId={r.opponentId}
                                    wins={r.wins}
                                    losses={r.losses}
                                    draws={r.draws}
                                    userMap={userMap}
                                />
                            ))}
                        </div>
                    )}
                </div>
                <div className="space-y-3 sm:border-l sm:border-foreground/8 sm:pl-6">
                    <p className="text-[11px] font-semibold text-foreground/50">베스트 파트너</p>
                    {topPartners.length === 0 ? (
                        <p className="text-xs text-foreground/55">복식 2회 이상 파트너 없음</p>
                    ) : (
                        <div className="space-y-2">
                            {topPartners.map((p) => (
                                <UserRow
                                    key={p.partnerId}
                                    userId={p.partnerId}
                                    wins={p.wins}
                                    losses={p.losses}
                                    draws={p.draws}
                                    userMap={userMap}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </section>
    )
}
