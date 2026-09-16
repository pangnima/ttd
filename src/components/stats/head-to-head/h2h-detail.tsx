import { summarizeHeadToHead, type UnifiedHeadToHeadDetail } from '@/lib/analytics/head-to-head'
import { calcWinRate } from '@/lib/dashboard/tokens'
import { H2H_OUTCOME_STYLE, H2H_OUTCOME_LABEL } from '@/lib/dashboard/outcome'
import { H2HOpponentHeader } from '@/components/stats/head-to-head/h2h-opponent-header'
import { H2HAnalysisComment, H2HBreakdownList } from '@/components/stats/head-to-head/h2h-breakdown'
import { H2HMatchRow } from '@/components/stats/head-to-head/h2h-match-row'

function StatBlock({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="text-center">
            <p className="text-h3 font-bold tabular-nums text-foreground">{value}</p>
            <p className="text-body2 text-muted-foreground mt-0.5">{label}</p>
        </div>
    )
}

type Props = {
    detail: UnifiedHeadToHeadDetail
    myName: string
    opponentDisplayName: string
}

/** 상대 한 명의 맞대결 상세 — 헤더 · 승/패 대비 · 세트 · 분석 · 분해 · 최근 5 · 전체 내역 */
export function H2HDetail({ detail, myName, opponentDisplayName }: Props) {
    const commentLines = summarizeHeadToHead(detail, opponentDisplayName)
    const setDiff = detail.mySetsWon - detail.mySetsLost

    return (
        <div className="space-y-4">
            <H2HOpponentHeader name={opponentDisplayName} hand={detail.opponentDominantHand} ntrp={detail.opponentNtrp} />

            <div className="grid grid-cols-3 gap-2 text-center border-b border-border pb-4">
                <div>
                    <p className="text-body2 font-medium text-muted-foreground mb-2 truncate">{myName}</p>
                    <p className="text-h2 font-bold tabular-nums text-foreground">{detail.myWins}</p>
                    <p className="text-body2 text-muted-foreground mt-1">승 ({detail.winRate}%)</p>
                </div>
                <div className="flex flex-col items-center justify-center">
                    <p className="text-caption text-muted-foreground mb-1">총 {detail.totalMatches}경기</p>
                    <p className="text-h4 font-bold text-muted-foreground">vs</p>
                    {detail.draws > 0 && <p className="text-caption text-muted-foreground mt-1">무 {detail.draws}</p>}
                </div>
                <div>
                    <p className="text-body2 font-medium text-muted-foreground mb-2 truncate">{opponentDisplayName}</p>
                    <p className="text-h2 font-bold tabular-nums text-foreground">{detail.myLosses}</p>
                    <p className="text-body2 text-muted-foreground mt-1">승 ({calcWinRate(detail.myLosses, detail.myWins) ?? 0}%)</p>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3 py-1">
                <StatBlock label="세트 획득" value={detail.mySetsWon} />
                <StatBlock label="세트 실점" value={detail.mySetsLost} />
                <StatBlock label="세트 차" value={setDiff > 0 ? `+${setDiff}` : setDiff} />
            </div>

            <H2HAnalysisComment lines={commentLines} />
            <H2HBreakdownList detail={detail} />

            {detail.last5.length > 0 && (
                <div className="border-t border-border pt-3 space-y-2">
                    <p className="text-caption text-muted-foreground">최근 {detail.last5.length}경기</p>
                    <div className="flex gap-1.5">
                        {detail.last5.map((o, i) => (
                            <span key={i} className={`inline-flex items-center justify-center w-8 h-8 rounded-[4px] text-caption font-bold border ${H2H_OUTCOME_STYLE[o]}`}>
                                {H2H_OUTCOME_LABEL[o]}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {detail.matches.length > 0 && (
                <div className="border-t border-border pt-3 space-y-1.5">
                    <p className="text-caption text-muted-foreground">전체 경기 내역</p>
                    <div className="space-y-1 max-h-56 overflow-y-auto">
                        {detail.matches.map((m) => (
                            <H2HMatchRow key={m.id} m={m} myName={myName} opponentDisplayName={opponentDisplayName} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
