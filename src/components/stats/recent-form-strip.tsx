import { FORM_BADGE_STYLE } from '@/lib/dashboard/outcome'

type Streak = { type: 'W' | 'L' | 'D'; length: number } | null

type Props = {
    /** 최근 N경기 결과 (과거→최신, 왼쪽=과거) */
    last10: ('W' | 'L' | 'D')[]
    /** 현재 연속 기록 (없으면 null) */
    currentStreak?: Streak
}

// 연승/연패 라벨 메타 (무는 라벨 미표기)
const STREAK_META: Record<'W' | 'L', { emoji: string; label: string; cls: string }> = {
    W: { emoji: '🔥', label: '연승', cls: 'text-win' },
    L: { emoji: '🧊', label: '연패', cls: 'text-loss' },
}

// 헤더용 컴팩트 W/L/D 폼 스트립 + 현재 연승/연패 라벨.
export function RecentFormStrip({ last10, currentStreak }: Props) {
    if (last10.length === 0) return null

    const streakMeta =
        currentStreak && currentStreak.type !== 'D' && currentStreak.length > 0
            ? STREAK_META[currentStreak.type]
            : null

    return (
        <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex gap-1.5 flex-wrap">
                {last10.map((outcome, i) => (
                    <span
                        key={i}
                        className={`w-6 h-6 rounded-sm text-caption font-bold flex items-center justify-center ${FORM_BADGE_STYLE[outcome]}`}
                    >
                        {outcome}
                    </span>
                ))}
            </div>
            {streakMeta && currentStreak && (
                <span className={`text-caption font-medium ${streakMeta.cls}`}>
                    {streakMeta.emoji} 현재 {currentStreak.length}{streakMeta.label}
                </span>
            )}
        </div>
    )
}
