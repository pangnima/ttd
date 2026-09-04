import { formatRecord } from '@/lib/dashboard/outcome'

type Props = {
    /** 항목 레이블 (예: "하드", "오른손 상대", "애드코트 (백핸드)") */
    label: string
    /** 총 경기수 (레이블 옆에 표기) */
    total: number
    wins: number
    losses: number
    draws: number
    /** 승률(%) — 무승부 제외 분모. 경기 없으면 null */
    winRate: number | null
    /** 막대 색상 클래스 (예: "bg-cat-1") */
    barClass: string
}

/**
 * 성적 카드 공용 행: 레이블 + 총 경기수 + 승무패·승률 + 진행 막대.
 * 코트 표면별 / 상대 손잡이별 / 복식 코트 성향 카드가 동일 형태로 공유한다.
 */
export function StatBarRow({ label, total, wins, losses, draws, winRate, barClass }: Props) {
    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-body2">
                <span className="flex items-baseline gap-1.5 min-w-0">
                    <span className="font-medium text-foreground truncate">{label}</span>
                    <span className="shrink-0 text-caption text-muted-foreground tabular-nums">총 {total}경기</span>
                </span>
                <span className="shrink-0 text-foreground/80 tabular-nums">
                    {formatRecord(wins, losses, draws)}
                    {winRate !== null && (
                        <span className="ml-1.5 text-foreground/90 font-semibold">{winRate}%</span>
                    )}
                </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all ${barClass}`}
                    style={{ width: `${winRate ?? 0}%` }}
                />
            </div>
        </div>
    )
}
