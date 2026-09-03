import type { CourtSurface, PersonalMatchSetScore } from '@/types'
import { SURFACE_LABELS, SURFACE_TEXT_CLASS } from '@/lib/dashboard/surface'
import { formatHourLabel } from '@/lib/format'
import { SetScoreChips } from '@/components/personal-matches/set-score-chips'

type Props = {
    playedAt: string   // "2026-09-01"
    playedTime: string // "18:00"
    surface: CourtSurface
    courtName?: string // 선택 — 있으면 표면 뒤에 표시
    sets: PersonalMatchSetScore[]  // 보는 사람 관점으로 반전 완료된 스코어. 빈 배열 = 결과 미확정
}

/** 요청 카드 공용: 일시·코트 표면(·코트명) + 내 관점 세트 스코어 칩 + 결과 배지 (세트 없으면 '미확정') */
export function RequestMatchSummary({ playedAt, playedTime, surface, courtName, sets }: Props) {
    return (
        <div className="space-y-1.5">
            <p className="text-caption text-muted-foreground tabular-nums">
                {playedAt.replaceAll('-', '.')} {formatHourLabel(playedTime)} ·{' '}
                <span className={SURFACE_TEXT_CLASS[surface] ?? SURFACE_TEXT_CLASS.unknown}>
                    {SURFACE_LABELS[surface] ?? surface}
                </span>
                {courtName && <> · {courtName}</>}
            </p>
            <SetScoreChips sets={sets} />
        </div>
    )
}
