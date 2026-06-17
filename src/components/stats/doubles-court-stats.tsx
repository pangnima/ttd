import type { DoublesCourtStats } from '@/lib/queries/stats'
import { calcWinRate } from '@/lib/dashboard/tokens'
import { SectionCard } from '@/components/common/section-card'
import { StatBarRow } from '@/components/stats/stat-bar-row'

type Props = { court: DoublesCourtStats }

// 코트 사이드별 막대 색상 (애드/백핸드=바이올렛, 듀스/포핸드=블루)
const COURT_BAR_CLASS: Record<'ad' | 'deuce', string> = {
    ad: 'bg-violet-500 dark:bg-violet-400',
    deuce: 'bg-sky-500 dark:bg-sky-400',
}

export function DoublesCourtStatsCard({ court }: Props) {
    const hasData = court.ad.matches > 0 || court.deuce.matches > 0

    return (
        <SectionCard
            title="복식 코트 성향"
            isEmpty={!hasData}
            emptyMessage="복식 경기 데이터가 없습니다"
            emptyImage="/empty/doubles.svg"
            contentClass="p-4 space-y-3"
        >
            <StatBarRow
                label="애드코트 (백핸드)"
                total={court.ad.matches}
                wins={court.ad.wins}
                losses={court.ad.losses}
                draws={court.ad.draws}
                winRate={calcWinRate(court.ad.wins, court.ad.losses)}
                barClass={COURT_BAR_CLASS.ad}
            />
            <StatBarRow
                label="듀스코트 (포핸드)"
                total={court.deuce.matches}
                wins={court.deuce.wins}
                losses={court.deuce.losses}
                draws={court.deuce.draws}
                winRate={calcWinRate(court.deuce.wins, court.deuce.losses)}
                barClass={COURT_BAR_CLASS.deuce}
            />
            <p className="text-xs text-foreground/70 border-t border-foreground/5 pt-2">
                * 복식 경기 기준. 코트 미지정 경기는 듀스에 포함.
            </p>
        </SectionCard>
    )
}
