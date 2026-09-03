import type { ReactNode } from 'react'
import type { PersonalMatch } from '@/types'
import type { MonthGroup } from '@/lib/personal-matches/grouping'
import { CARD_BASE } from '@/lib/dashboard/tokens'
import { formatRecord } from '@/lib/dashboard/outcome'
import { PersonalMatchCard } from '@/components/personal-matches/personal-match-card'

type Props = {
    group: MonthGroup
    renderActions?: (match: PersonalMatch) => ReactNode
}

// 월별 그룹: 헤더(년월 + 승패 + 승률) + 경기 카드 목록.
export function PersonalMatchMonthGroup({ group, renderActions }: Props) {
    return (
        <section className="space-y-2">
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <h3 className="text-h4 font-semibold text-foreground">{group.label}</h3>
                    <span className="text-xs px-1.5 py-0.5 rounded-sm bg-muted text-muted-foreground">
                        {formatRecord(group.wins, group.losses, group.draws)}
                    </span>
                </div>
                <span className="text-xs text-muted-foreground">승률 {group.winRate}%</span>
            </div>
            <div className={`${CARD_BASE} divide-y divide-border/60`}>
                {group.matches.map((m) => (
                    <PersonalMatchCard key={m.id} match={m} actions={renderActions?.(m)} />
                ))}
            </div>
        </section>
    )
}
