import { Badge } from '@/components/ui/badge'
import { getUserById } from '@/lib/dummy/users'
import { getTournamentById } from '@/lib/dummy/tournaments'
import type { Match } from '@/types'

type RecentMatchesProps = {
    matches: Match[]
    userId: string
}

export function RecentMatches({ matches, userId }: RecentMatchesProps) {
    const finished = matches
        .filter((m) => m.status === 'finished' && m.result)
        .slice(-5)
        .reverse()

    if (finished.length === 0) {
        return (
            <p className="text-sm text-muted-foreground text-center py-6 border rounded-lg">
                최근 경기 기록이 없습니다.
            </p>
        )
    }

    return (
        <div className="space-y-2">
            {finished.map((match) => {
                const opponentId = match.player1Id === userId ? match.player2Id : match.player1Id
                const opponent = getUserById(opponentId)
                const isWin = match.result!.winnerId === userId
                const tournament = getTournamentById(match.tournamentId)

                const sets = match.result!.sets
                const myScore  = sets.map((s) => match.player1Id === userId ? s.player1 : s.player2).join(' ')
                const oppScore = sets.map((s) => match.player1Id === userId ? s.player2 : s.player1).join(' ')

                return (
                    <div key={match.id} className="flex items-center gap-3 border rounded-lg px-4 py-3">
                        <Badge
                            variant={isWin ? 'default' : 'secondary'}
                            className="w-6 h-6 p-0 flex items-center justify-center text-xs shrink-0"
                        >
                            {isWin ? 'W' : 'L'}
                        </Badge>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                                vs {opponent?.nickname ?? opponentId}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                                {tournament?.name ?? match.tournamentId}
                            </p>
                        </div>
                        <div className="text-right shrink-0">
                            <p className="text-sm font-medium tabular-nums">{myScore}</p>
                            <p className="text-xs text-muted-foreground tabular-nums">{oppScore}</p>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
