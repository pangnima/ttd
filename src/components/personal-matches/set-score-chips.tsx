import type { PersonalMatchSetScore } from '@/types'
import { PENDING_RESULT_BADGE, PENDING_RESULT_LABEL } from '@/lib/dashboard/outcome'
import { resolveMatchWinner } from '@/lib/personal-matches/winner'

type Props = {
    sets: PersonalMatchSetScore[]  // 보는 사람 관점. 빈 배열 = 결과 미확정
    // 결과 배지(WIN/LOSS/무/미확정) 표시 여부 (기본 true)
    showResult?: boolean
}

export const RESULT_BADGE = {
    me: { label: 'WIN', className: 'bg-win text-win-foreground' },
    opponent: { label: 'LOSS', className: 'bg-loss text-loss-foreground' },
    draw: { label: '무', className: 'bg-muted text-muted-foreground' },
    pending: { label: PENDING_RESULT_LABEL, className: PENDING_RESULT_BADGE },
} as const

/** 내 관점 세트 스코어 칩 + 결과 배지 — 확인 요청 요약·결과 검토 패널이 공유 */
export function SetScoreChips({ sets, showResult = true }: Props) {
    const valid = sets.filter((s) => !Number.isNaN(s.me) && !Number.isNaN(s.opp))
    const result = RESULT_BADGE[valid.length > 0 ? resolveMatchWinner(valid) : 'pending']
    return (
        <div className="flex items-center gap-1.5 flex-wrap">
            {showResult && (
                <span className={`px-2 py-0.5 rounded-[4px] text-caption font-bold ${result.className}`}>
                    {result.label}
                </span>
            )}
            {valid.map((s, i) => (
                <span
                    key={i}
                    className={`px-1.5 py-0.5 rounded-[4px] text-caption font-semibold tabular-nums ${
                        s.me > s.opp ? 'bg-win/15 text-win' : 'bg-muted text-muted-foreground'
                    }`}
                >
                    {s.me}-{s.opp}
                </span>
            ))}
        </div>
    )
}
