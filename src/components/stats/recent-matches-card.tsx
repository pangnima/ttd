import Link from 'next/link'
import type { Match, User } from '@/types'
import type { MatchGameMeta } from '@/lib/queries/match-games'
import { toMatchView } from '@/lib/dashboard/match-display'
import { getMatchTypeStyle } from '@/lib/dashboard/match-type-style'
import { CARD_BASE, PILL_BASE, SECTION_LABEL, EMPTY_BLOCK } from '@/lib/dashboard/tokens'
import { OUTCOME_STYLE, OUTCOME_LABEL } from '@/lib/dashboard/outcome'

type Props = {
    matches: Match[]
    userId: string
    userMap: Map<string, User>
    gameMetaById: Record<string, MatchGameMeta>
}

const COURT_LABEL: Record<'ad' | 'deuce', string> = { ad: '애드', deuce: '듀스' }

function PlayerName({
    userId,
    isMe,
    court,
    userMap,
}: {
    userId: string
    isMe: boolean
    court?: 'ad' | 'deuce'
    userMap: Map<string, User>
}) {
    const user = userMap.get(userId)
    const nickname = isMe ? '나' : (user?.nickname ?? '?')
    const isGuest = !isMe && (user?.isGuest ?? false)
    const courtLabel = court ? `(${COURT_LABEL[court]})` : ''

    return (
        <>
            {isMe ? (
                <span className="text-primary font-medium">{nickname}</span>
            ) : isGuest || !user ? (
                <span className="text-foreground">{nickname}</span>
            ) : (
                <Link href={`/profile/${userId}`} className="text-foreground hover:text-foreground transition-colors">
                    {nickname}
                </Link>
            )}
            {courtLabel && (
                <span className="text-muted-foreground">{courtLabel}</span>
            )}
        </>
    )
}

export function RecentMatchesCard({ matches, userId, userMap, gameMetaById }: Props) {
    const recent = [...matches]
        .sort((a, b) => {
            const gA = gameMetaById[a.matchGameId]?.date ?? ''
            const gB = gameMetaById[b.matchGameId]?.date ?? ''
            return gB.localeCompare(gA)
        })
        .slice(0, 8)

    return (
        <section className="space-y-3">
            <p className={SECTION_LABEL}>최근 경기</p>
            {recent.length === 0 ? (
                <div className={EMPTY_BLOCK}>참여한 경기가 없습니다</div>
            ) : (
                <ul className="space-y-2">
                    {recent.map((match) => {
                        const view = toMatchView(match, userId)
                        const style = getMatchTypeStyle(match.matchType)
                        const meta = gameMetaById[match.matchGameId]
                        const isSingles = match.matchType === 'singles'

                        return (
                            <li key={match.id} className={`${CARD_BASE} p-3 flex items-center gap-3`}>
                                <span
                                    className={`${PILL_BASE} ${OUTCOME_STYLE[view.outcome]} w-6 h-6 justify-center !rounded-full border shrink-0`}
                                >
                                    {OUTCOME_LABEL[view.outcome]}
                                </span>
                                <div className="flex-1 min-w-0 space-y-0.5">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className={`${PILL_BASE} ${style.textClass} ${style.borderClass} ${style.bgClass}`}>
                                            {style.label}
                                        </span>
                                        {meta && (
                                            <Link
                                                href={`/clubs/${meta.clubId}/match-games/${match.matchGameId}`}
                                                className="text-sm text-foreground hover:text-foreground transition-colors truncate"
                                            >
                                                {meta.name}
                                            </Link>
                                        )}
                                        {meta && (
                                            <span className="text-xs text-muted-foreground">{meta.date}</span>
                                        )}
                                    </div>
                                    <div className="text-sm text-foreground flex flex-wrap items-center gap-x-0.5">
                                        {/* 본인(+ 파트너) */}
                                        <PlayerName userId={userId} isMe={true} court={isSingles ? undefined : view.myCourt} userMap={userMap} />
                                        {view.partner && (
                                            <>
                                                <span className="text-muted-foreground mx-0.5">,</span>
                                                <PlayerName userId={view.partner.id} isMe={false} court={view.partner.court} userMap={userMap} />
                                            </>
                                        )}
                                        {/* vs 구분자 */}
                                        <span className="text-muted-foreground mx-1">vs</span>
                                        {/* 상대 */}
                                        {view.opponents.length === 0 ? (
                                            <span className="text-muted-foreground">상대 없음</span>
                                        ) : (
                                            view.opponents.map((opp, i) => (
                                                <span key={opp.id} className="flex items-center gap-x-0.5">
                                                    {i > 0 && <span className="text-muted-foreground">,</span>}
                                                    <PlayerName userId={opp.id} isMe={false} court={isSingles ? undefined : opp.court} userMap={userMap} />
                                                </span>
                                            ))
                                        )}
                                    </div>
                                </div>
                                <div className="text-lg font-semibold text-foreground shrink-0 tabular-nums">
                                    {view.mySets} : {view.oppSets}
                                </div>
                            </li>
                        )
                    })}
                </ul>
            )}
        </section>
    )
}
