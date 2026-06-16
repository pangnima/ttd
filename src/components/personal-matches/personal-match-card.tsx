import type { ReactNode } from 'react'
import type { PersonalMatch } from '@/types'
import { MATCH_TYPE_LABELS, getMatchTypeBadgeClass } from '@/lib/dashboard/match-type-style'
import { SURFACE_LABELS, SURFACE_TEXT_CLASS } from '@/lib/dashboard/surface'
import { PILL_BASE } from '@/lib/dashboard/tokens'
import { formatRecord } from '@/lib/dashboard/outcome'
import { resolveSetWinner } from '@/lib/personal-matches/winner'

type Props = {
    match: PersonalMatch
    actions?: ReactNode
}

const MONTHS_EN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

const RESULT = {
    me: { bar: 'bg-win', badge: 'bg-win text-win-foreground', label: 'WIN' },
    opponent: { bar: 'bg-loss', badge: 'bg-loss text-loss-foreground', label: 'LOSS' },
    draw: { bar: 'bg-muted-foreground/40', badge: 'bg-muted text-muted-foreground', label: '무' },
} as const

// 개인 경기 1건 카드. 코트·경기시간은 데이터가 없어 미표기.
// 동호인 경기: 세트 1개 = 게임 1개. 단일 세트는 WIN/LOSS, 멀티 세트는 'N승 M패' 전적으로 표시.
export function PersonalMatchCard({ match: m, actions }: Props) {
    const [, mm, dd] = m.playedAt.split('-')
    const result = RESULT[m.winner]
    const isDoubles = m.matchType !== 'singles'
    const opponentLabel = m.opponent2Name ? `${m.opponentName} · ${m.opponent2Name}` : m.opponentName

    // 세트(게임) 전적 집계
    const tally = m.setScores.reduce(
        (acc, s) => {
            const w = resolveSetWinner(s)
            if (w === 'me') acc.wins++
            else if (w === 'opponent') acc.losses++
            else acc.draws++
            return acc
        },
        { wins: 0, losses: 0, draws: 0 },
    )
    const isMultiSet = m.setScores.length > 1
    // 멀티 세트는 전적 라벨, 단일/무세트는 기존 WIN/LOSS/무 배지 라벨. 색은 우세(m.winner) 기준 유지.
    const resultLabel = isMultiSet
        ? formatRecord(tally.wins, tally.losses, tally.draws)
        : result.label

    return (
        <div className="flex items-stretch gap-3 px-3 py-3">
            <span className={`w-1 self-stretch rounded-full ${result.bar}`} aria-hidden />
            {/* 날짜 영역: 경기타입 배지 + 일/월 + 표면(색 텍스트) */}
            <div className="w-12 shrink-0 self-center flex flex-col items-center gap-0.5">
                <span className={`${PILL_BASE} mb-1 ${getMatchTypeBadgeClass(m.matchType)}`}>
                    {MATCH_TYPE_LABELS[m.matchType]}
                </span>
                <div className="text-lg font-bold leading-none tabular-nums text-foreground">{Number(dd)}</div>
                <div className="text-[10px] text-muted-foreground">{MONTHS_EN[Number(mm) - 1]}</div>
                {m.surface && (
                    <div className={`text-[10px] font-medium ${SURFACE_TEXT_CLASS[m.surface] ?? SURFACE_TEXT_CLASS.unknown}`}>
                        {SURFACE_LABELS[m.surface] ?? m.surface}
                    </div>
                )}
            </div>

            <div className="flex-1 min-w-0">
                {/* 선수: 복식은 내 팀(나·파트너) / vs 상대팀 두 줄, 단식은 vs 상대 한 줄. 결과 배지는 우측. */}
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        {isDoubles && (
                            <p className="text-sm font-medium text-foreground truncate">
                                나{m.partnerName && <> · <span className="text-primary">{m.partnerName}</span></>}
                            </p>
                        )}
                        <p className="text-sm font-medium text-foreground truncate">
                            <span className="text-muted-foreground">vs </span>{opponentLabel}
                        </p>
                    </div>
                    <span className={`px-2 py-1 rounded-[4px] text-xs font-bold shrink-0 ${result.badge}`}>{resultLabel}</span>
                </div>

                {/* 세트 스코어(왼쪽) ↔ 수정/삭제 액션(오른쪽) */}
                {(m.setScores.length > 0 || actions) && (
                    <div className="flex items-end justify-between gap-2 mt-2">
                        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                            {m.setScores.map((s, i) => (
                                <span
                                    key={i}
                                    className={`px-1.5 py-1 rounded-[4px] text-xs font-semibold tabular-nums ${
                                        s.me > s.opp ? 'bg-win/15 text-win' : 'bg-muted text-muted-foreground'
                                    }`}
                                >
                                    {s.me}-{s.opp}
                                </span>
                            ))}
                        </div>
                        {actions && <div className="shrink-0 self-center">{actions}</div>}
                    </div>
                )}
            </div>
        </div>
    )
}
