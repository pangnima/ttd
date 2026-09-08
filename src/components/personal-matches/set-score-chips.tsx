import type { PersonalMatchSetScore } from '@/types'
import { gameChipClass, resolveResultBadge } from '@/lib/personal-matches/result-badge'

type Props = {
    sets: PersonalMatchSetScore[]  // 보는 사람 관점. 빈 배열 = 결과 미확정
    // 결과 배지(WIN/LOSS/무/전적/미확정) 표시 여부 (기본 true)
    showResult?: boolean
}

/** 게임(세트) 스코어 칩 목록 — 게임마다 승/패/무 색이 갈린다. 경기 카드·요약 패널 공용. */
export function GameScoreChips({ sets, className = '' }: { sets: PersonalMatchSetScore[]; className?: string }) {
    return (
        <div className={`flex items-center gap-1.5 flex-wrap min-w-0 ${className}`}>
            {sets.map((s, i) => (
                <span
                    key={i}
                    className={`px-1.5 py-1 rounded-[4px] text-caption font-semibold tabular-nums ${gameChipClass(s)}`}
                >
                    {s.me}-{s.opp}
                </span>
            ))}
        </div>
    )
}

/** 내 관점 게임(세트) 스코어 칩 + 결과 배지 — 확인 요청 요약·결과 검토/제안 패널이 공유 */
export function SetScoreChips({ sets, showResult = true }: Props) {
    const valid = sets.filter((s) => !Number.isNaN(s.me) && !Number.isNaN(s.opp))
    const result = resolveResultBadge(valid)
    return (
        <div className="flex items-center gap-1.5 flex-wrap">
            {showResult && (
                <span className={`px-2 py-0.5 rounded-[4px] text-caption font-bold ${result.badgeClass}`}>
                    {result.label}
                </span>
            )}
            <GameScoreChips sets={valid} />
        </div>
    )
}
