import type { ReactNode } from 'react'
import type { PersonalMatch } from '@/types'
import { MATCH_TYPE_LABELS, getMatchTypeBadgeClass } from '@/lib/dashboard/match-type-style'
import { SURFACE_LABELS } from '@/lib/dashboard/surface'
import { PILL_BASE } from '@/lib/dashboard/tokens'
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
        ? `${tally.wins}승 ${tally.losses}패${tally.draws > 0 ? ` ${tally.draws}무` : ''}`
        : result.label

    return (
        <div className="flex items-stretch gap-3 px-3 py-3">
            <span className={`w-1 self-stretch rounded-full ${result.bar}`} aria-hidden />
            <div className="w-9 text-center shrink-0 self-center">
                <div className="text-lg font-bold leading-none tabular-nums text-foreground">{Number(dd)}</div>
                <div className="text-[10px] mt-0.5 text-muted-foreground">{MONTHS_EN[Number(mm) - 1]}</div>
            </div>

            <div className="flex-1 min-w-0">
                {/* 1행: 상대 이름 ↔ 결과 배지(+액션). 세트는 이름 폭을 침범하지 않도록 아래 줄로 분리. */}
                <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-foreground truncate min-w-0">
                        <span className="text-muted-foreground">vs </span>{opponentLabel}
                    </p>
                    <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`px-2 py-1 rounded-[4px] text-xs font-bold ${result.badge}`}>{resultLabel}</span>
                        {actions}
                    </div>
                </div>

                {/* 2행: 종류·표면·파트너 */}
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className={`${PILL_BASE} ${getMatchTypeBadgeClass(m.matchType)}`}>
                        {MATCH_TYPE_LABELS[m.matchType]}
                    </span>
                    {m.surface && (
                        <span className="text-[11px] text-muted-foreground">{SURFACE_LABELS[m.surface] ?? m.surface}</span>
                    )}
                    {m.partnerName && (
                        <span className="text-[11px] text-muted-foreground truncate">· 파트너 {m.partnerName}</span>
                    )}
                </div>

                {/* 3행: 세트 스코어 (전체 폭 사용, 많으면 wrap) */}
                {m.setScores.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
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
                )}
            </div>
        </div>
    )
}
