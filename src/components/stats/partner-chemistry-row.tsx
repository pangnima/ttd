import type { PartnerChemistry } from '@/lib/analytics/partner-chemistry'
import type { User } from '@/types'
import { TEXT_MUTED } from '@/lib/dashboard/tokens'
import { ProfileLink } from '@/components/common/profile-link'
import { GuestBadge } from '@/components/common/guest-badge'

type Props = {
    partner: PartnerChemistry
    userMap: Map<string, User>
}

// 케미지수에 따른 바 색 (높을수록 라임).
function chemColor(chem: number): string {
    if (chem >= 65) return 'bg-win'
    if (chem >= 45) return 'bg-info'
    return 'bg-loss'
}

const TREND_GLYPH: Record<PartnerChemistry['trend'], { mark: string; cls: string; label: string }> = {
    up: { mark: '▲', cls: 'text-win', label: '상승세' },
    down: { mark: '▼', cls: 'text-loss', label: '하락세' },
    flat: { mark: '–', cls: 'text-muted-foreground', label: '유지' },
}

export function PartnerChemistryRow({ partner, userMap }: Props) {
    const isExternal = partner.partnerId.startsWith('name:')
    const user = isExternal ? undefined : userMap.get(partner.partnerId)
    const name = user?.nickname ?? user?.name ?? partner.partnerName ?? partner.partnerId.replace(/^name:/, '')
    const showStreak = partner.streakType === 'W' && partner.currentStreak >= 2
    const trend = TREND_GLYPH[partner.trend]

    return (
        <div className="space-y-2 py-1">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    {user ? (
                        <ProfileLink userId={partner.partnerId} isGuest={user.isGuest} className="text-sm font-medium text-foreground/90 hover:text-foreground transition-colors truncate">
                            {name}
                        </ProfileLink>
                    ) : (
                        <span className="text-sm font-medium text-foreground/90 truncate">{name}</span>
                    )}
                    {user?.isGuest && <GuestBadge />}
                    {showStreak && (
                        <span className="text-micro px-1.5 py-0.5 rounded-sm bg-win/20 text-win font-semibold shrink-0">
                            {partner.currentStreak}연승
                        </span>
                    )}
                </div>
                <span className="text-sm text-foreground/80 shrink-0 tabular-nums">
                    <span className="text-foreground/90 font-semibold">{partner.winRate}%</span>
                    <span className={`ml-1.5 ${TEXT_MUTED}`}>{partner.total}경기</span>
                </span>
            </div>

            {/* 케미지수 바 */}
            <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-muted">
                    <div className={chemColor(partner.chemistry)} style={{ width: `${partner.chemistry}%`, height: '100%' }} />
                </div>
                <span className="text-xs tabular-nums text-foreground/70 w-12 text-right">
                    케미 {partner.chemistry}
                </span>
                <span className={`text-xs ${trend.cls}`} title={`최근 호흡 ${trend.label}`}>{trend.mark}</span>
            </div>
        </div>
    )
}
