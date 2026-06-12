type Props = {
    /** 현재 scope 기준 경기 수 */
    games: number
    /** 현재 연승(연승 중이 아니면 0) */
    winStreak: number
}

// 헤더 보조 스탯: 경기 · 현재 연승. (승률은 프라이버시상 미표기)
// 카드 박스 없이 작은 인라인 형태로 노출한다.
export function ProfileStatRow({ games, winStreak }: Props) {
    return (
        <div className="flex items-center gap-4 text-sm">
            <span className="flex items-baseline gap-1">
                <span className="text-lg font-bold tabular-nums text-foreground">{games}</span>
                <span className="text-xs text-muted-foreground">경기</span>
            </span>
            <span className="h-4 w-px bg-border" aria-hidden />
            <span className="flex items-baseline gap-1">
                <span className="text-lg font-bold tabular-nums text-foreground">{winStreak}</span>
                <span className="text-xs text-muted-foreground">현재 연승</span>
            </span>
        </div>
    )
}
