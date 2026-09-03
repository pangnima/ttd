import type { ReactNode } from 'react'
import type { PersonalMatch } from '@/types'
import {
    formatRecord, PENDING_RESULT_BADGE, PENDING_RESULT_BAR, PENDING_RESULT_LABEL,
} from '@/lib/dashboard/outcome'
import { resolveSetWinner } from '@/lib/personal-matches/winner'
import { formatOpponents } from '@/lib/personal-matches/labels'
import { MatchDateColumn } from '@/components/personal-matches/match-date-column'
import { MatchMetaLine } from '@/components/personal-matches/match-meta-line'

type Props = {
    match: PersonalMatch
    actions?: ReactNode
}

const RESULT = {
    me: { bar: 'bg-win', badge: 'bg-win text-win-foreground', label: 'WIN' },
    opponent: { bar: 'bg-loss', badge: 'bg-loss text-loss-foreground', label: 'LOSS' },
    draw: { bar: 'bg-muted-foreground/40', badge: 'bg-muted text-muted-foreground', label: '무' },
    // 결과 미확정(winner NULL) — 세트 미등록. 통계에는 반영되지 않는다.
    pending: { bar: PENDING_RESULT_BAR, badge: PENDING_RESULT_BADGE, label: PENDING_RESULT_LABEL },
} as const

// 개인 경기 1건 카드. 선수 줄 아래에 시각·코트명·메모(있는 것만)를 표시한다.
// 동호인 경기: 세트 1개 = 게임 1개. 단일 세트는 WIN/LOSS, 멀티 세트는 'N승 M패' 전적으로 표시.
// 세트가 없는 미확정 경기는 '미확정' 배지만 표시한다.
export function PersonalMatchCard({ match: m, actions }: Props) {
    const result = RESULT[m.winner ?? 'pending']
    const isDoubles = m.matchType !== 'singles'
    const opponentLabel = formatOpponents(m)

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
            <MatchDateColumn playedAt={m.playedAt} matchType={m.matchType} surface={m.surface} />

            <div className="flex-1 min-w-0">
                {/* 선수: 복식은 내 팀(나·파트너) / vs 상대팀 두 줄, 단식은 vs 상대 한 줄. 결과 배지는 우측. */}
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        {isDoubles && (
                            <p className="text-body2 font-medium text-foreground truncate">
                                나{m.partnerName && <> · <span className="text-primary">{m.partnerName}</span></>}
                            </p>
                        )}
                        <p className="text-body2 font-medium text-foreground truncate">
                            <span className="text-muted-foreground">vs </span>{opponentLabel}
                        </p>
                    </div>
                    <span className={`px-2 py-1 rounded-[4px] text-caption font-bold shrink-0 ${result.badge}`}>{resultLabel}</span>
                </div>

                <MatchMetaLine playedTime={m.playedTime} courtName={m.courtName} notes={m.notes} className="mt-1 space-y-0.5" />

                {/* 세트 스코어(왼쪽) ↔ 수정/삭제 액션(오른쪽) */}
                {(m.setScores.length > 0 || actions) && (
                    <div className="flex items-end justify-between gap-2 mt-2">
                        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                            {m.setScores.map((s, i) => (
                                <span
                                    key={i}
                                    className={`px-1.5 py-1 rounded-[4px] text-caption font-semibold tabular-nums ${
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
