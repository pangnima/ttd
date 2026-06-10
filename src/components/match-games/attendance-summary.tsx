import { cn } from '@/lib/utils'

type RestSlot = { key: string; label: string; names: string[] }
type GameCount = { id: string; name: string; count: number }

type AttendanceSummaryProps = {
    // 인원별 총 게임수 (게임수 내림차순 정렬된 상태로 전달)
    gameCounts: GameCount[]
    // 시간대별 휴식 인원 — 생략하면 게임수만 표시(상세 테이블은 휴식을 헤더에 인라인 표시).
    restingBySlot?: RestSlot[]
    className?: string
}

// 대진표 휴식 인원·인원별 게임수 요약 표시 전용 컴포넌트.
// 상세 페이지(게임수만)와 생성 폼(휴식+게임수) 양쪽에서 공용으로 사용.
export function AttendanceSummary({ gameCounts, restingBySlot, className }: AttendanceSummaryProps) {
    if (gameCounts.length === 0 && (!restingBySlot || restingBySlot.length === 0)) return null

    return (
        <div className={cn('rounded-xl border border-border bg-card p-4 space-y-3', className)}>
            {restingBySlot && restingBySlot.some((s) => s.names.length > 0) && (
                <div className="space-y-1">
                    <p className="text-[10px] font-medium tracking-widest uppercase text-muted-foreground">
                        시간대별 휴식
                    </p>
                    <ul className="space-y-0.5">
                        {restingBySlot
                            .filter((s) => s.names.length > 0)
                            .map((s) => (
                                <li key={s.key} className="text-xs text-foreground">
                                    <span className="text-muted-foreground">{s.label}</span>
                                    {'  '}휴식: {s.names.join(', ')}
                                </li>
                            ))}
                    </ul>
                </div>
            )}

            {gameCounts.length > 0 && (
                <div className="space-y-1.5">
                    <p className="text-[10px] font-medium tracking-widest uppercase text-muted-foreground">
                        인원별 게임수
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {gameCounts.map((g) => (
                            <span
                                key={g.id}
                                className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-xs text-foreground"
                            >
                                {g.name}
                                <span className="font-semibold tabular-nums">{g.count}게임</span>
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
