import Link from 'next/link'
import type { MatchRoomDetail, MatchRoomGame } from '@/types'
import { PILL_BASE } from '@/lib/dashboard/tokens'
import { canEditRoomGame, isRoomGameParty, roomGameStatusLabel } from '@/lib/match-rooms/game-status'
import { SetScoreChips } from '@/components/personal-matches/set-score-chips'

type Props = { game: MatchRoomGame; index: number; detail: MatchRoomDetail; viewerId: string }

function teamLine(game: MatchRoomGame): string {
    const by = (role: string) => game.participants.find((p) => p.role === role)?.name
    const mine = [game.ownerName, by('partner')].filter(Boolean).join(' · ')
    const theirs = [by('opponent'), by('opponent2')].filter(Boolean).join(' · ')
    return theirs ? `${mine} vs ${theirs}` : `${mine} vs (참가자 미정)`
}

/**
 * 게임 1행 — 작성자 관점 팀 구성 + 스코어(있으면) 또는 상태 칩.
 * 자유 기록은 작성자에게 라인업 채우기/결과 입력 링크를, 상호 확인 게임은 당사자에게 결과 입력·확인 링크를 준다(0049).
 */
export function RoomGameRow({ game, index, detail, viewerId }: Props) {
    const status = roomGameStatusLabel(game)
    const editable = canEditRoomGame(game, viewerId)
    const isParty = isRoomGameParty(game, viewerId)
    const lineupPending = status === '모집 중'

    return (
        <div className="px-4 py-3 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
                <p className="text-caption text-muted-foreground truncate">
                    {detail.source.kind === 'rotation' && <span className="tabular-nums mr-1.5">게임 {game.groupSeq ?? index + 1}</span>}
                    {teamLine(game)}
                </p>
                {status && (
                    <span className={`${PILL_BASE} shrink-0 border-spot/50 text-spot`}>
                        {status}
                    </span>
                )}
            </div>
            {game.setScores.length > 0 && <SetScoreChips sets={game.setScores} />}
            {status && (editable || (isParty && game.sourceType === 'confirmation')) && (
                <div className="flex justify-end">
                    {editable && lineupPending ? (
                        <Link href={`/me/personal-matches/${game.id}/edit`} className="text-caption text-primary hover:underline">참가자 채우기</Link>
                    ) : (
                        <Link href="/me/personal-matches" className="text-caption text-primary hover:underline">
                            {game.sourceType === 'confirmation' ? '결과 입력·확인' : '결과 입력'}
                        </Link>
                    )}
                </div>
            )}
        </div>
    )
}
