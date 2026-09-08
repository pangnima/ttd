import type { ReactNode } from 'react'
import type { PersonalMatch } from '@/types'
import { PENDING_BADGE, resolveResultBadge } from '@/lib/personal-matches/result-badge'
import { formatOpponents } from '@/lib/personal-matches/labels'
import { isRecruiting } from '@/lib/personal-matches/lineup'
import { MatchDateColumn } from '@/components/personal-matches/match-date-column'
import { MatchMetaLine } from '@/components/personal-matches/match-meta-line'
import { GameScoreChips } from '@/components/personal-matches/set-score-chips'
import { RoomLink } from '@/components/match-rooms/room-link'

type Props = {
    match: PersonalMatch
    actions?: ReactNode
    // 그룹(로테이션·멀티 게임) 안의 카드 — 시각·코트명·메모는 그룹 헤더가 보여주므로 숨긴다
    hideMeta?: boolean
    // 멀티 게임 그룹에서 카드끼리 구분되도록 붙이는 순번('1게임'). 같은 상대와 반복되는 게임이라 순번이 없으면 구별되지 않는다.
    gameLabel?: string
}

// 매칭 리스트에 노출했지만 참가자가 아직 미정 — 방에서 모으는 중
const RECRUITING_BADGE = { ...PENDING_BADGE, label: '모집 중' }

// 개인 경기 카드. 동호인 경기: 세트 1개 = 게임 1개.
// 배지·색 바 규칙은 resolveResultBadge 단일 출처(게임 1개 WIN/LOSS·2개 이상 전적·없으면 미확정).
export function PersonalMatchCard({ match: m, actions, hideMeta = false, gameLabel }: Props) {
    const isDoubles = m.matchType !== 'singles'
    const opponentLabel = formatOpponents(m)

    const result = isRecruiting(m) ? RECRUITING_BADGE : resolveResultBadge(m.setScores)

    return (
        <div className="flex items-stretch gap-3 px-3 py-3">
            <span className={`w-1 self-stretch rounded-full ${result.barClass}`} aria-hidden />
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
                    <span className={`px-2 py-1 rounded-[4px] text-caption font-bold shrink-0 whitespace-nowrap tabular-nums ${result.badgeClass}`}>
                        {result.label}
                    </span>
                </div>

                {!hideMeta && (
                    <>
                        <MatchMetaLine
                            playedTime={m.playedTime}
                            courtName={m.courtName}
                            notes={m.notes}
                            className="mt-1 space-y-0.5"
                            emphasizeTime
                        />
                        {m.roomId && <RoomLink roomId={m.roomId} className="mt-1 inline-block" />}
                    </>
                )}

                {/* 게임 스코어(왼쪽) ↔ 수정/삭제 액션(오른쪽) */}
                {(m.setScores.length > 0 || actions) && (
                    <div className="flex items-end justify-between gap-2 mt-2">
                        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                            {gameLabel && <span className="text-caption text-muted-foreground shrink-0">{gameLabel}</span>}
                            <GameScoreChips sets={m.setScores} />
                        </div>
                        {actions && <div className="shrink-0 self-center">{actions}</div>}
                    </div>
                )}
            </div>
        </div>
    )
}
