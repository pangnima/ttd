import type { NtrpDiffStats } from '@/lib/analytics/ntrp'
import { SectionCard } from '@/components/common/section-card'

type Props = {
    ntrpStats: NtrpDiffStats
}

type BucketDef = { key: keyof NtrpDiffStats; label: string; color: string }

// 상대 난도 카테고리 — 상위(클레이=난적) / 동급(블루=중립 데이터) / 하위(코트그린=우세)
const BUCKETS: BucketDef[] = [
    { key: 'stronger', label: '상위 상대', color: 'text-loss' },
    { key: 'peer', label: '동급 상대', color: 'text-info' },
    { key: 'weaker', label: '하위 상대', color: 'text-win' },
]

export function NtrpDifferentialCard({ ntrpStats }: Props) {
    const hasData = BUCKETS.some(({ key }) => ntrpStats[key].total > 0)

    return (
        <SectionCard
            title="NTRP 대비 성적"
            isEmpty={!hasData}
            emptyMessage="경기 데이터가 없거나 상대 NTRP 정보가 부족합니다"
        >
            <div className="grid grid-cols-3 gap-3">
                {BUCKETS.map(({ key, label, color }) => {
                    const wl = ntrpStats[key]
                    return (
                        <div key={key} className="text-center space-y-1">
                            <p className={`text-xs font-semibold ${color}`}>{label}</p>
                            {wl.total > 0 ? (
                                <>
                                    <p className="text-2xl font-bold text-foreground tabular-nums">{wl.winRate}%</p>
                                    <p className="text-xs text-muted-foreground tabular-nums">
                                        {wl.wins}승 {wl.losses}패
                                        {wl.draws > 0 ? ` ${wl.draws}무` : ''}
                                    </p>
                                </>
                            ) : (
                                <p className="text-sm text-muted-foreground">기록 없음</p>
                            )}
                        </div>
                    )
                })}
            </div>
        </SectionCard>
    )
}
