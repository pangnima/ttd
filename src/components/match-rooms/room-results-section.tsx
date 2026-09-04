import type { MatchRoomDetail, MatchRoomGame } from '@/types'
import { CARD_BASE, EMPTY_BLOCK, TYPO } from '@/lib/dashboard/tokens'
import { SetScoreChips } from '@/components/personal-matches/set-score-chips'

type Props = { detail: MatchRoomDetail }

function teamLine(game: MatchRoomGame, hostName: string): string {
    const by = (role: string) => game.participants.find((p) => p.role === role)?.name
    const mine = [hostName, by('partner')].filter(Boolean).join(' · ')
    const theirs = [by('opponent'), by('opponent2')].filter(Boolean).join(' · ')
    return `${mine} vs ${theirs}`
}

function emptyMessage(detail: MatchRoomDetail): string {
    const s = detail.source
    if (s.kind === 'rotation') return s.isFinalized ? '등록된 게임이 없습니다.' : '게임이 아직 입력되지 않았습니다. 방장이 결과를 입력하면 여기에 표시됩니다.'
    if (s.kind === 'confirmation' && s.requestStatus === 'pending') return '상대 대표가 확인 요청을 수락하면 결과를 등록할 수 있습니다.'
    return '결과가 아직 등록되지 않았습니다.'
}

/** 결과 섹션 — 방장 관점 게임별 스코어(로테이션은 게임 여러 건). 결과 없으면 출처별 안내 문구 */
export function RoomResultsSection({ detail }: Props) {
    const games = detail.games.filter((g) => g.setScores.length > 0)
    return (
        <section className="space-y-2">
            <h2 className={TYPO.h3}>결과 <span className="text-caption text-muted-foreground font-normal">방장 관점</span></h2>
            {games.length === 0 ? (
                <div className={EMPTY_BLOCK}>{emptyMessage(detail)}</div>
            ) : (
                <div className={`${CARD_BASE} divide-y divide-border`}>
                    {games.map((g, i) => (
                        <div key={g.id} className="px-4 py-3 space-y-1.5">
                            <p className="text-caption text-muted-foreground truncate">
                                {detail.source.kind === 'rotation' && <span className="tabular-nums mr-1.5">게임 {g.groupSeq ?? i + 1}</span>}
                                {teamLine(g, detail.host.name)}
                            </p>
                            <SetScoreChips sets={g.setScores} />
                        </div>
                    ))}
                </div>
            )}
        </section>
    )
}
