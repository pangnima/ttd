import type { NtrpDiffStats } from '@/lib/analytics/ntrp'
import { CARD_BASE, SECTION_LABEL } from '@/lib/dashboard/tokens'

type Props = {
    ntrpStats: NtrpDiffStats
}

type BucketDef = { key: keyof NtrpDiffStats; label: string; color: string }

const BUCKETS: BucketDef[] = [
    { key: 'stronger', label: '상위 상대', color: 'text-purple-600 dark:text-purple-400' },
    { key: 'peer', label: '동급 상대', color: 'text-cyan-600 dark:text-cyan-400' },
    { key: 'weaker', label: '하위 상대', color: 'text-emerald-600 dark:text-emerald-400' },
]

export function NtrpDifferentialCard({ ntrpStats }: Props) {
    const hasData = BUCKETS.some(({ key }) => ntrpStats[key].total > 0)

    if (!hasData) {
        return (
            <section className="space-y-3">
                <p className={SECTION_LABEL}>NTRP 대비 성적</p>
                <div className={`${CARD_BASE} p-4 text-sm text-muted-foreground text-center py-8`}>
                    경기 데이터가 없거나 상대 NTRP 정보가 부족합니다
                </div>
            </section>
        )
    }

    return (
        <section className="space-y-3">
            <p className={SECTION_LABEL}>NTRP 대비 성적</p>
            <div className={`${CARD_BASE} p-4`}>
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
            </div>
        </section>
    )
}
