import type { ReactNode } from 'react'
import type { PersonalMatch } from '@/types'
import {
    formatRecord, PENDING_RESULT_BADGE, PENDING_RESULT_BAR, PENDING_RESULT_LABEL,
} from '@/lib/dashboard/outcome'
import { hasResult, resolveSetWinner, tallySets } from '@/lib/personal-matches/winner'
import { formatOpponents } from '@/lib/personal-matches/labels'
import { isRecruiting } from '@/lib/personal-matches/lineup'
import { MatchDateColumn } from '@/components/personal-matches/match-date-column'
import { MatchMetaLine } from '@/components/personal-matches/match-meta-line'
import { RoomLink } from '@/components/match-rooms/room-link'

type Props = {
    match: PersonalMatch
    actions?: ReactNode
    // 로테이션 그룹 안의 카드 — 시각·코트명·메모는 그룹 헤더가 보여주므로 숨긴다
    hideMeta?: boolean
}

const RESULT = {
    me: { bar: 'bg-win-solid', badge: 'bg-win text-win-foreground', label: 'WIN' },
    opponent: { bar: 'bg-loss-solid', badge: 'bg-loss text-loss-foreground', label: 'LOSS' },
    draw: { bar: 'bg-muted-foreground/40', badge: 'bg-muted text-muted-foreground', label: '무' },
    // 결과 미확정 — 게임 스코어 미등록. 통계에는 반영되지 않는다.
    pending: { bar: PENDING_RESULT_BAR, badge: PENDING_RESULT_BADGE, label: PENDING_RESULT_LABEL },
    // 경기 리스트에 노출했지만 참가자가 아직 미정 — 방에서 모으는 중
    recruiting: { bar: PENDING_RESULT_BAR, badge: PENDING_RESULT_BADGE, label: '모집 중' },
} as const
// 게임(세트) 2개 이상 — 게임마다 승패가 다르므로 다수결 색을 쓰지 않고 중립 바 + 'N승 M패' 전적
const MULTI = { bar: 'bg-border', badge: 'bg-muted text-muted-foreground' } as const

// 개인 경기 1건 카드. 동호인 경기: 세트 1개 = 게임 1개.
// 게임 1개는 WIN/LOSS, 2개 이상은 'N승 M패' 전적, 세트가 없는 미확정 경기는 '미확정' 배지.
export function PersonalMatchCard({ match: m, actions, hideMeta = false }: Props) {
    const isDoubles = m.matchType !== 'singles'
    const opponentLabel = formatOpponents(m)
    const isMulti = m.setScores.length > 1

    const result = isRecruiting(m)
        ? RESULT.recruiting
        : !hasResult(m)
        ? RESULT.pending
        : isMulti
            ? (() => { const t = tallySets(m.setScores); return { ...MULTI, label: formatRecord(t.wins, t.losses, t.draws) } })()
            : RESULT[resolveSetWinner(m.setScores[0])]

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
                    <span className={`px-2 py-1 rounded-[4px] text-caption font-bold shrink-0 ${result.badge}`}>{result.label}</span>
                </div>

                {!hideMeta && (
                    <>
                        <MatchMetaLine playedTime={m.playedTime} courtName={m.courtName} notes={m.notes} className="mt-1 space-y-0.5" />
                        {m.roomId && <RoomLink roomId={m.roomId} className="mt-1 inline-block" />}
                    </>
                )}

                {/* 게임 스코어(왼쪽) ↔ 수정/삭제 액션(오른쪽) */}
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
