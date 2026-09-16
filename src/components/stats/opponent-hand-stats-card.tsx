import { HAND_LABEL } from '@/lib/profile/signup-fields'
import type { OpponentHandStats } from '@/lib/analytics/opponent-hand'
import { SectionCard } from '@/components/common/section-card'
import { StatBarRow } from '@/components/stats/stat-bar-row'

type Props = {
    handStats: OpponentHandStats
}

const HAND_LABELS: Record<keyof OpponentHandStats, string> = {
    right: `${HAND_LABEL.right} 상대`,
    left: `${HAND_LABEL.left} 상대`,
}

// 손잡이별 막대 색상 (오른손=블루, 왼손=바이올렛)
const HAND_BAR_CLASS: Record<keyof OpponentHandStats, string> = {
    right: 'bg-cat-1',
    left: 'bg-cat-5',
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
            emptyImage="/empty/handedness.svg"
            contentClass="p-4 space-y-3"
        >
            {entries.map(([hand, wl]) => (
                <StatBarRow
                    key={hand}
                    label={HAND_LABELS[hand]}
                    total={wl.total}
                    wins={wl.wins}
                    losses={wl.losses}
                    draws={wl.draws}
                    winRate={wl.winRate}
                    barClass={HAND_BAR_CLASS[hand]}
                />
            ))}
            {/* 복식은 상대 둘을 각각 세므로 합계가 경기 수를 넘는다 — 뜻을 말하지 않으면 숫자가 틀려 보인다(U-11) */}
            <p className="text-caption text-muted-foreground">복식은 상대별로 셉니다 — 합계가 경기 수보다 클 수 있어요.</p>
        </SectionCard>
    )
}
