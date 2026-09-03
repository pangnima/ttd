import type { CourtSurface, MatchType } from '@/types'
import { MATCH_TYPE_LABELS, getMatchTypeBadgeClass } from '@/lib/dashboard/match-type-style'
import { SURFACE_LABELS, SURFACE_TEXT_CLASS } from '@/lib/dashboard/surface'
import { PILL_BASE } from '@/lib/dashboard/tokens'

type Props = {
    playedAt: string       // "2026-09-01"
    matchType: MatchType
    surface?: CourtSurface
}

const MONTHS_EN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

/** 개인 경기·로테이션 세션 카드 공용 좌측 날짜 컬럼 — 경기타입 배지 + 일/월 + 표면(색 텍스트). */
export function MatchDateColumn({ playedAt, matchType, surface }: Props) {
    const [, mm, dd] = playedAt.split('-')
    return (
        <div className="w-12 shrink-0 self-center flex flex-col items-center gap-0.5">
            <span className={`${PILL_BASE} mb-1 ${getMatchTypeBadgeClass(matchType)}`}>
                {MATCH_TYPE_LABELS[matchType]}
            </span>
            <div className="text-h4 font-bold leading-none tabular-nums text-foreground">{Number(dd)}</div>
            <div className="text-caption text-muted-foreground">{MONTHS_EN[Number(mm) - 1]}</div>
            {surface && (
                <div className={`text-caption font-medium ${SURFACE_TEXT_CLASS[surface] ?? SURFACE_TEXT_CLASS.unknown}`}>
                    {SURFACE_LABELS[surface] ?? surface}
                </div>
            )}
        </div>
    )
}
