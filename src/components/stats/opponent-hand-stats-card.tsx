import type { OpponentHandStats } from '@/lib/analytics/opponent-hand'
import { formatRecord } from '@/lib/dashboard/outcome'
import { SectionCard } from '@/components/common/section-card'

type Props = {
    handStats: OpponentHandStats
}

const HAND_LABELS: Record<keyof OpponentHandStats, string> = {
    right: '오른손 상대',
    left: '왼손 상대',
}

// 손잡이별 막대 색상 (오른손=블루, 왼손=바이올렛)
const HAND_BAR_CLASS: Record<keyof OpponentHandStats, string> = {
    right: 'bg-sky-500 dark:bg-sky-400',
    left: 'bg-violet-500 dark:bg-violet-400',
}

export function OpponentHandStatsCard({ handStats }: Props) {
    const entries = (Object.entries(handStats) as [keyof OpponentHandStats, OpponentHandStats[keyof OpponentHandStats]][])
        .filter(([, wl]) => wl.total > 0)
        .sort(([, a], [, b]) => b.total - a.total)

    return (
        <SectionCard
            title="상대 손잡이별 성적"
            isEmpty={entries.length === 0}
            emptyMessage="손잡이가 기록된 경기가 없습니다"
            contentClass="p-4 space-y-3"
        >
            {entries.map(([hand, wl]) => (
                <div key={hand} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-foreground">{HAND_LABELS[hand]}</span>
                        <span className="text-muted-foreground tabular-nums">
                            {formatRecord(wl.wins, wl.losses, wl.draws)} · {wl.winRate}%
                        </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all ${HAND_BAR_CLASS[hand]}`}
                            style={{ width: `${wl.winRate}%` }}
                        />
                    </div>
                </div>
            ))}
        </SectionCard>
    )
}
