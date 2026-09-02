import type { CourtSurface, PersonalMatchSetScore } from '@/types'
import { SURFACE_LABELS, SURFACE_TEXT_CLASS } from '@/lib/dashboard/surface'
import { PENDING_RESULT_BADGE, PENDING_RESULT_LABEL } from '@/lib/dashboard/outcome'
import { resolveMatchWinner } from '@/lib/personal-matches/winner'

type Props = {
    playedAt: string   // "2026-09-01"
    playedTime: string // "18:30"
    surface: CourtSurface
    sets: PersonalMatchSetScore[]  // 보는 사람 관점으로 반전 완료된 스코어. 빈 배열 = 결과 미확정
}

const RESULT_BADGE = {
    me: { label: 'WIN', className: 'bg-win text-win-foreground' },
    opponent: { label: 'LOSS', className: 'bg-loss text-loss-foreground' },
    draw: { label: '무', className: 'bg-muted text-muted-foreground' },
    pending: { label: PENDING_RESULT_LABEL, className: PENDING_RESULT_BADGE },
} as const

/** 요청 카드 공용: 일시·코트 표면 + 내 관점 세트 스코어 칩 + 결과 배지 (세트 없으면 '미확정') */
export function RequestMatchSummary({ playedAt, playedTime, surface, sets }: Props) {
    const result = RESULT_BADGE[sets.length > 0 ? resolveMatchWinner(sets) : 'pending']
    return (
        <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground tabular-nums">
                {playedAt.replaceAll('-', '.')} {playedTime} ·{' '}
                <span className={SURFACE_TEXT_CLASS[surface] ?? SURFACE_TEXT_CLASS.unknown}>
                    {SURFACE_LABELS[surface] ?? surface}
                </span>
            </p>
            <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`px-2 py-0.5 rounded-[4px] text-xs font-bold ${result.className}`}>
                    {result.label}
                </span>
                {sets.map((s, i) => (
                    <span
                        key={i}
                        className={`px-1.5 py-0.5 rounded-[4px] text-xs font-semibold tabular-nums ${
                            s.me > s.opp ? 'bg-win/15 text-win' : 'bg-muted text-muted-foreground'
                        }`}
                    >
                        {s.me}-{s.opp}
                    </span>
                ))}
            </div>
        </div>
    )
}
