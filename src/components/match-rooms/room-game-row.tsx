import Link from 'next/link'
import type { MatchRoomDetail, MatchRoomGame } from '@/types'
import { PILL_BASE } from '@/lib/dashboard/tokens'
import { isLineupCompleteByRoles } from '@/lib/personal-matches/lineup'
import { SetScoreChips } from '@/components/personal-matches/set-score-chips'

type Props = { game: MatchRoomGame; index: number; detail: MatchRoomDetail; isHost: boolean }

function teamLine(game: MatchRoomGame, hostName: string): string {
    const by = (role: string) => game.participants.find((p) => p.role === role)?.name
    const mine = [hostName, by('partner')].filter(Boolean).join(' · ')
    const theirs = [by('opponent'), by('opponent2')].filter(Boolean).join(' · ')
    return theirs ? `${mine} vs ${theirs}` : `${mine} vs (참가자 미정)`
}

/** 게임 1행 — 팀 구성 + 스코어(있으면) 또는 상태 칩. 방장에겐 라인업 채우기/결과 입력 링크(자유 기록 방만) */
export function RoomGameRow({ game, index, detail, isHost }: Props) {
    const lineupReady = isLineupCompleteByRoles(game.matchType, game.participants.map((p) => p.role))
    const hasResult = game.setScores.length > 0
    // 상호 확인 경기는 잠겨 있어 방장도 수정 폼으로 못 간다(제안/확인 플로우는 개인 경기 카드에서)
    const editable = isHost && detail.source.kind !== 'confirmation'

    return (
        <div className="px-4 py-3 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
                <p className="text-caption text-muted-foreground truncate">
                    {detail.source.kind === 'rotation' && <span className="tabular-nums mr-1.5">게임 {game.groupSeq ?? index + 1}</span>}
                    {teamLine(game, detail.host.name)}
                </p>
                {!hasResult && (
                    <span className={`${PILL_BASE} shrink-0 border-orange-400/50 text-orange-600 dark:text-orange-400`}>
                        {lineupReady ? '결과 미입력' : '모집 중'}
                    </span>
                )}
            </div>
            {hasResult && <SetScoreChips sets={game.setScores} />}
            {editable && !hasResult && (
                <div className="flex justify-end">
                    {lineupReady ? (
                        <Link href="/me/personal-matches" className="text-caption text-primary hover:underline">결과 입력</Link>
                    ) : (
                        <Link href={`/me/personal-matches/${game.id}/edit`} className="text-caption text-primary hover:underline">참가자 채우기</Link>
                    )}
                </div>
            )}
        </div>
    )
}
