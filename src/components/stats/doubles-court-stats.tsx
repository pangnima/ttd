import type { DoublesCourtStats } from '@/lib/queries/stats'
import { calcWinRate } from '@/lib/dashboard/tokens'
import { SectionCard } from '@/components/common/section-card'

type Props = { court: DoublesCourtStats }

function CourtBar({ label, stat }: { label: string; stat: DoublesCourtStats['ad'] }) {
    const rate = calcWinRate(stat.wins, stat.losses)
    const barWidth = rate ?? 0

    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
                <span className="text-base text-foreground/85 font-medium">{label}</span>
                <span className="text-foreground/80">
                    {stat.wins}승 {stat.losses}패 {stat.draws > 0 ? `${stat.draws}무` : ''}
                    {rate !== null && (
                        <span className="ml-1.5 text-foreground/90 font-semibold">{rate}%</span>
                    )}
                </span>
            </div>
            <div className="h-1.5 rounded-full bg-foreground/8 overflow-hidden">
                <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400/60 to-cyan-400/30 transition-all"
                    style={{ width: `${barWidth}%` }}
                />
            </div>
            <p className="text-xs text-foreground/70">총 {stat.matches}경기</p>
        </div>
    )
}

export function DoublesCourtStatsCard({ court }: Props) {
    const hasData = court.ad.matches > 0 || court.deuce.matches > 0

    return (
        <SectionCard
            title="복식 코트 성향"
            isEmpty={!hasData}
            emptyMessage="복식 경기 데이터가 없습니다"
            contentClass="p-4 space-y-4"
        >
            <CourtBar label="애드코트 (백핸드)" stat={court.ad} />
            <CourtBar label="듀스코트 (포핸드)" stat={court.deuce} />
            <p className="text-xs text-foreground/70 border-t border-foreground/5 pt-2">
                * 복식 경기 기준. 코트 미지정 경기는 듀스에 포함.
            </p>
        </SectionCard>
    )
}
