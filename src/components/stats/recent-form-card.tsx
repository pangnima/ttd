import type { RecentFormResult } from '@/lib/analytics/form'
import { FORM_BADGE_STYLE } from '@/lib/dashboard/outcome'
import { SectionCard } from '@/components/common/section-card'

type Props = {
    recentForm: RecentFormResult
}

export function RecentFormCard({ recentForm }: Props) {
    const { last10, currentStreak, recentWins, recentLosses, recentDraws } = recentForm

    const streakLabel = currentStreak
        ? `현재 ${currentStreak.length}연${currentStreak.type === 'W' ? '승' : currentStreak.type === 'L' ? '패' : '무'}`
        : null

    return (
        <SectionCard
            title="최근 경기 승패"
            isEmpty={last10.length === 0}
            emptyMessage="경기 데이터가 없습니다"
            contentClass="p-4 space-y-4"
        >
            {/* 배지 행 */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex gap-1.5 flex-wrap">
                    {last10.map((outcome, i) => (
                        <span
                            key={i}
                            className={`w-7 h-7 rounded-[4px] text-xs font-bold flex items-center justify-center ${FORM_BADGE_STYLE[outcome]}`}
                        >
                            {outcome}
                        </span>
                    ))}
                </div>
                {streakLabel && (
                    <span className="text-xs text-muted-foreground shrink-0">{streakLabel}</span>
                )}
            </div>
            {/* 방향 설명 */}
            <p className="text-xs text-muted-foreground/70">
                ← 과거&nbsp;&nbsp;&nbsp;최신 →
            </p>
            {/* 집계 요약 */}
            <div className="flex gap-4 text-sm text-muted-foreground">
                <span><span className="text-emerald-600 font-semibold dark:text-emerald-400">{recentWins}</span>승</span>
                <span><span className="text-red-600 font-semibold dark:text-red-400">{recentLosses}</span>패</span>
                {recentDraws > 0 && <span><span className="text-muted-foreground font-semibold">{recentDraws}</span>무</span>}
            </div>
        </SectionCard>
    )
}
