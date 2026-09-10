'use client'

import { Button } from '@/components/ui/button'
import { TYPO } from '@/lib/dashboard/tokens'
import {
    formatDurationLabel,
    formatRoomWhen,
    type LineupRecommendation as Recommendation,
} from '@/lib/match-rooms/schedule'

type Props = {
    recommendation: Recommendation | null
    playedTime?: string
    durationMinutes?: number
    slotMinutes: number
    /** 지금 고른 1인당 경기 수 — 권장값과 **다를 때만** 권한다 */
    perPlayer: number
    gameCount: number
    estimatedMinutes: number
    /** 사람이 대진을 손으로 고쳤는가 — [권장값으로 맞추기]가 그 편집을 버리므로 미리 말한다 */
    isEdited: boolean
    onApply: (perPlayer: number) => void
}

/**
 * 방의 시간·코트 면 수가 권하는 경기 수 (Week 43 → Week 44).
 *
 * 처음에는 회색 caption 한 줄에 두 글자짜리 [적용] 링크였는데, **권장값과 현재 값이 같아도 똑같이 그려져**
 * "지금 설정을 바꿔야 한다"는 신호가 되지 못했다. 그래서 분기를 만든다 — 다르면 spot 톤 블록과 버튼으로
 * 말을 걸고(대기·주의 = spot), 같으면 caption 한 줄로 조용히 접는다.
 */
export function LineupRecommendation({
    recommendation, playedTime, durationMinutes, slotMinutes,
    perPlayer, gameCount, estimatedMinutes, isEdited, onApply,
}: Props) {
    if (!recommendation) return null

    const when = formatRoomWhen(playedTime, durationMinutes)
    // 방이 3면이어도 인원이 닿지 않으면 실제로 도는 면은 그보다 적다 — 계산에 쓴 값을 그대로 말한다
    const basis = [when, recommendation.courts > 1 ? `코트 ${recommendation.courts}면` : null, `${slotMinutes}분 경기`]
        .filter(Boolean)
        .join(' · ')
    const overtime = !!durationMinutes && estimatedMinutes > durationMinutes
    const now = gameCount > 0
        ? `지금 1인당 ${perPlayer}경기 · 총 ${gameCount}경기 = 약 ${formatDurationLabel(estimatedMinutes)}`
        : null
    const notes = recommendation.notes.map((n) => (
        <p key={n} className={`${TYPO.caption} text-spot break-keep`}>{n}</p>
    ))

    if (recommendation.perPlayer === perPlayer) {
        return (
            <div className="space-y-1">
                <p className={`${TYPO.caption} break-keep`}>
                    {basis} → 권장 설정과 같습니다{now ? ` · ${now.replace('지금 ', '')}` : ''}
                </p>
                {notes}
            </div>
        )
    }

    return (
        <div className="rounded-lg border border-spot/40 px-3 py-2.5 space-y-1.5">
            <p className={`${TYPO.caption} break-keep`}>
                {basis} → <span className="font-semibold text-spot">1인당 {recommendation.perPlayer}경기</span>
                <span className="text-muted-foreground">
                    {` (총 ${recommendation.games}경기 · ${recommendation.rounds}라운드)`}
                </span>
            </p>
            <div className="flex items-center justify-between gap-2">
                <p className={`${TYPO.caption} break-keep ${overtime ? 'text-spot' : ''}`}>
                    {now}{overtime && ' — 예정 시간보다 깁니다.'}
                </p>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-caption shrink-0"
                    onClick={() => onApply(recommendation.perPlayer)}
                >
                    권장값으로 맞추기
                </Button>
            </div>
            {isEdited && (
                <p className={`${TYPO.caption} break-keep`}>맞추면 직접 고친 대진은 사라집니다.</p>
            )}
            {notes}
        </div>
    )
}
