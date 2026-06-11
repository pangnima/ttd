import { CARD_BASE, SECTION_LABEL, TEXT_MUTED } from '@/lib/dashboard/tokens'
import type { User } from '@/types'

type Props = {
    // 이 대진표에서 선수별 누적 변동 (내림차순). docs/rating-system.md
    byUserTotal: Array<{ userId: string; total: number }>
    members: User[]
}

// 확정된 대진표에서 선수별 클럽 레이팅 순변동 요약.
export function RatingChangeSummary({ byUserTotal, members }: Props) {
    const entries = byUserTotal.filter((e) => e.total !== 0)
    if (entries.length === 0) return null

    const nameOf = (id: string) => members.find((m) => m.id === id)?.nickname ?? id

    return (
        <section className="space-y-3">
            <p className={SECTION_LABEL}>레이팅 변동</p>
            <div className={`${CARD_BASE} p-4`}>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {entries.map((e) => {
                        const up = e.total > 0
                        return (
                            <div key={e.userId} className="flex items-center gap-1.5">
                                <span className="text-sm text-foreground">{nameOf(e.userId)}</span>
                                <span className={`text-sm font-mono ${up ? 'text-win' : 'text-loss'}`}>
                                    {up ? '▲' : '▼'}{Math.abs(e.total).toFixed(3)}
                                </span>
                            </div>
                        )
                    })}
                </div>
                <p className={`text-[11px] ${TEXT_MUTED} mt-3`}>이 대진표 확정으로 반영된 순변동입니다.</p>
            </div>
        </section>
    )
}
