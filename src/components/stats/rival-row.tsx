import type { RivalEntry } from '@/lib/analytics/rival'
import type { User } from '@/types'
import { getTier, TIER_LABELS, TIER_STYLE } from '@/lib/rating/tier'
import { FORM_BADGE_STYLE } from '@/lib/dashboard/outcome'
import { PILL_BASE, TEXT_MUTED } from '@/lib/dashboard/tokens'
import { relativeDayLabel } from '@/lib/analytics/date-utils'
import { ProfileLink } from '@/components/common/profile-link'
import { GuestBadge } from '@/components/common/guest-badge'

type Props = {
    rival: RivalEntry
    userMap: Map<string, User>
    today: string
}

const OUTCOME_KO: Record<'W' | 'L' | 'D', string> = { W: '승', L: '패', D: '무' }

export function RivalRow({ rival, userMap, today }: Props) {
    const user = rival.opponentUserId ? userMap.get(rival.opponentUserId) : undefined
    const name = user?.nickname ?? user?.name ?? rival.opponentName ?? '?'
    const initial = name.slice(0, 1)
    const tier = user ? getTier(user.ntrp) : null

    return (
        <div className="space-y-2 py-1">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="w-7 h-7 rounded-full bg-muted text-foreground/80 text-xs font-semibold flex items-center justify-center shrink-0">
                        {initial}
                    </span>
                    {user ? (
                        <ProfileLink userId={rival.opponentUserId!} isGuest={user.isGuest} className="text-sm font-medium text-foreground/90 hover:text-foreground transition-colors truncate">
                            {name}
                        </ProfileLink>
                    ) : (
                        <span className="text-sm font-medium text-foreground/90 truncate">{name}</span>
                    )}
                    {user?.isGuest && <GuestBadge />}
                    {tier && <span className={`${PILL_BASE} ${TIER_STYLE[tier]} shrink-0`}>{TIER_LABELS[tier]}</span>}
                </div>
                <span className="text-sm text-foreground/80 shrink-0 tabular-nums">
                    {rival.wins} · {rival.losses}
                    <span className="ml-1.5 text-foreground/90 font-semibold">{rival.winRate}%</span>
                </span>
            </div>

            {/* 승률 분할 바 */}
            <div className="flex h-1.5 rounded-full overflow-hidden bg-muted">
                <div className="bg-win" style={{ width: `${rival.winRate}%` }} />
                <div className="bg-loss flex-1" />
            </div>

            <div className="flex items-center justify-between gap-2">
                {/* 최근 5경기 */}
                <div className="flex gap-1">
                    {rival.last5.map((o, i) => (
                        <span key={i} className={`w-4 h-4 rounded-[3px] text-[9px] font-bold flex items-center justify-center ${FORM_BADGE_STYLE[o]}`}>
                            {o}
                        </span>
                    ))}
                </div>
                {/* 최근 맞대결 */}
                {rival.lastOutcome && rival.lastDate && (
                    <span className={`text-[11px] ${TEXT_MUTED} shrink-0`}>
                        최근 <span className="text-foreground/80">{OUTCOME_KO[rival.lastOutcome]} {rival.lastScore}</span>
                        <span className="mx-1">·</span>{relativeDayLabel(rival.lastDate, today)}
                    </span>
                )}
            </div>
        </div>
    )
}
