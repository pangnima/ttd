import type { DiagnosisResult } from '@/lib/analytics/diagnostics'
import { CARD_BASE, SECTION_LABEL } from '@/lib/dashboard/tokens'

type Props = {
    diagnosis: DiagnosisResult
}

export function StrengthWeaknessCard({ diagnosis }: Props) {
    const { strengths, weaknesses } = diagnosis
    const isEmpty = strengths.length === 0 && weaknesses.length === 0

    if (isEmpty) {
        return (
            <section className="space-y-3">
                <p className={SECTION_LABEL}>강점 · 약점 진단</p>
                <div className={`${CARD_BASE} p-4 text-sm text-muted-foreground text-center py-8`}>
                    진단에 충분한 데이터가 없습니다 (각 조건 최소 3~5경기 필요)
                </div>
            </section>
        )
    }

    return (
        <section className="space-y-3">
            <p className={SECTION_LABEL}>강점 · 약점 진단</p>
            <div className={`${CARD_BASE} p-4 space-y-4`}>
                {strengths.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-xs font-semibold tracking-widest uppercase text-emerald-700 dark:text-emerald-400/80">강점</p>
                        <ul className="space-y-2">
                            {strengths.map((item, i) => (
                                <li key={i} className="text-sm">
                                    <span className="font-medium text-foreground">{item.label}</span>
                                    <span className="text-muted-foreground"> — {item.description}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                {weaknesses.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-xs font-semibold tracking-widest uppercase text-amber-700 dark:text-amber-400/80">개선 포인트</p>
                        <ul className="space-y-2">
                            {weaknesses.map((item, i) => (
                                <li key={i} className="text-sm">
                                    <span className="font-medium text-foreground">{item.label}</span>
                                    <span className="text-muted-foreground"> — {item.description}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </section>
    )
}
