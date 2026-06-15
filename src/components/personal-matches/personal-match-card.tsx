import type { ReactNode } from 'react'
import type { PersonalMatch } from '@/types'
import { MATCH_TYPE_LABELS, getMatchTypeBadgeClass } from '@/lib/dashboard/match-type-style'
import { SURFACE_LABELS } from '@/lib/dashboard/surface'
import { PILL_BASE } from '@/lib/dashboard/tokens'

type Props = {
    match: PersonalMatch
    actions?: ReactNode
}

const MONTHS_EN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

const RESULT = {
    me: { bar: 'bg-win', badge: 'bg-win text-win-foreground', label: 'WIN' },
    opponent: { bar: 'bg-loss', badge: 'bg-loss text-loss-foreground', label: 'LOSS' },
    draw: { bar: 'bg-muted-foreground/40', badge: 'bg-muted text-muted-foreground', label: '무' },
} as const

// 개인 경기 1건 카드. 코트·경기시간은 데이터가 없어 미표기.
export function PersonalMatchCard({ match: m, actions }: Props) {
    const [, mm, dd] = m.playedAt.split('-')
    const result = RESULT[m.winner]
    const opponentLabel = m.opponent2Name ? `${m.opponentName} · ${m.opponent2Name}` : m.opponentName

    return (
        <div className="flex items-center gap-3 px-3 py-3">
            <span className={`w-1 self-stretch rounded-full ${result.bar}`} aria-hidden />
            <div className="w-9 text-center shrink-0">
                <div className="text-lg font-bold leading-none tabular-nums text-foreground">{Number(dd)}</div>
                <div className="text-[10px] mt-0.5 text-muted-foreground">{MONTHS_EN[Number(mm) - 1]}</div>
            </div>

            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                    <span className="text-muted-foreground">vs </span>{opponentLabel}
                </p>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className={`${PILL_BASE} ${getMatchTypeBadgeClass(m.matchType)}`}>
                        {MATCH_TYPE_LABELS[m.matchType]}
                    </span>
                    {m.surface && (
                        <span className="text-[11px] text-muted-foreground">{SURFACE_LABELS[m.surface] ?? m.surface}</span>
                    )}
                    {m.partnerName && (
                        <span className="text-[11px] text-muted-foreground truncate">· 파트너 {m.partnerName}</span>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
                {m.setScores.map((s, i) => (
                    <span
                        key={i}
                        className={`px-1.5 py-1 rounded-[4px] text-xs font-semibold tabular-nums ${
                            s.me > s.opp ? 'bg-win/15 text-win' : s.me < s.opp ? 'bg-muted text-muted-foreground' : 'bg-muted text-muted-foreground'
                        }`}
                    >
                        {s.me}-{s.opp}
                    </span>
                ))}
                <span className={`ml-1 px-2 py-1 rounded-[4px] text-xs font-bold ${result.badge}`}>{result.label}</span>
                {actions}
            </div>
        </div>
    )
}
