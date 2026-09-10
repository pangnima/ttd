'use client'

import { TYPO } from '@/lib/dashboard/tokens'
import { formatDurationLabel, formatRoomWhen, type LineupRecommendation } from '@/lib/match-rooms/schedule'

type Props = {
    recommendation: LineupRecommendation | null
    playedTime?: string
    durationMinutes?: number
    courtCount: number
    slotMinutes: number
    /** 지금 대진의 경기 수와 소화에 걸리는 시간 */
    gameCount: number
    estimatedMinutes: number
    onApply: (perPlayer: number) => void
}

/**
 * 「몇 경기가 좋은가」 — 방의 시간과 코트 면 수가 답을 알고 있으므로 화면이 먼저 말한다.
 *
 * 권장값을 **1인당 경기 수**로 말하는 이유는 자동 대진표가 그 축으로 조작되기 때문이다.
 * 총 경기 수로 말하면 [적용] 뒤에 "권장 8경기인데 지금 9경기" 같은 어긋남이 남는다.
 *
 * 시간을 넘겨도 저장을 막지 않는다 — 코트를 더 잡거나 짧게 칠 수 있다. 사실만 말한다.
 */
export function LineupRecommendation({
    recommendation, playedTime, durationMinutes, courtCount, slotMinutes,
    gameCount, estimatedMinutes, onApply,
}: Props) {
    if (!recommendation) return null

    const when = formatRoomWhen(playedTime, durationMinutes)
    const basis = [when, courtCount > 1 ? `코트 ${courtCount}면` : null, `${slotMinutes}분 경기`]
        .filter(Boolean)
        .join(' · ')
    const overtime = !!durationMinutes && estimatedMinutes > durationMinutes

    return (
        <div className="space-y-1">
            <p className={`${TYPO.caption} break-keep`}>
                {basis} → <span className="font-semibold text-foreground">1인당 {recommendation.perPlayer}경기</span>
                <span className="text-muted-foreground">{` (총 ${recommendation.games}경기)`}</span>
                <button
                    type="button"
                    onClick={() => onApply(recommendation.perPlayer)}
                    className={`${TYPO.caption} text-primary hover:underline ml-1.5`}
                >
                    적용
                </button>
            </p>
            {gameCount > 0 && (
                <p className={`${TYPO.caption} break-keep ${overtime ? 'text-spot' : ''}`}>
                    지금 {gameCount}경기 = 약 {formatDurationLabel(estimatedMinutes)}
                    {overtime && ' — 예정 시간보다 깁니다.'}
                </p>
            )}
            {recommendation.notes.map((n) => (
                <p key={n} className={`${TYPO.caption} text-spot break-keep`}>{n}</p>
            ))}
        </div>
    )
}
