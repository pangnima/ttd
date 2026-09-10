import type { ReactNode } from 'react'
import { teamDiff, type LineupPlayer } from '@/lib/match-games/lineup-core'
import type { LineupGame } from '@/lib/match-rooms/lineup'
import { lineupBalance } from '@/lib/match-rooms/lineup-balance'
import { ATTENTION_PILL, TYPO } from '@/lib/dashboard/tokens'

type Props = {
    game: LineupGame
    /** 이 게임에서 쉬는 사람 이름 — 비면 줄 자체가 사라진다 */
    restingNames: string[]
    /** 머리줄 오른쪽 끝, 밸런스 배지 옆에 붙는 편집 액션 */
    actions?: ReactNode
}

/** 팀 색은 승패가 아니라 분류다 — cat 슬롯을 쓰고 win/loss는 쓰지 않는다(docs/color-system.md §5) */
const TEAM1_BAR = 'bg-cat-1'
const TEAM2_BAR = 'bg-cat-5'

const sumNtrp = (team: LineupPlayer[]) => team.reduce((sum, p) => sum + p.ntrp, 0)

/** 팀 한 줄 — 색 바로 팀을 가르고, 이름과 전력 합을 같은 줄에 둔다(따로 두면 좌우로 매칭해 읽어야 한다) */
function TeamLine({ team, barClass }: { team: LineupPlayer[]; barClass: string }) {
    return (
        <div className="flex items-stretch gap-2">
            <span className={`w-1 self-stretch rounded-full shrink-0 ${barClass}`} aria-hidden />
            <span className={`${TYPO.body2} font-medium break-keep flex-1 min-w-0`}>
                {team.map((p) => p.name).join(' · ')}
            </span>
            <span className={`${TYPO.caption} tabular-nums shrink-0 self-center`}>
                {sumNtrp(team).toFixed(1)}
            </span>
        </div>
    )
}

/**
 * 대진 미리보기의 게임 카드 1장.
 * 'A · B vs C · D' 한 줄이던 것을 팀마다 한 줄로 갈랐다 — 구분선과 색 바가 `vs` 한 글자보다
 * 팀 경계를 훨씬 잘 말한다. 그래서 `vs`는 없앴다.
 */
export function RoomLineupGameCard({ game, restingNames, actions }: Props) {
    const diff = teamDiff(game)
    const balance = lineupBalance(diff, game.team1.length)

    return (
        <li className="px-3 py-2.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
                <span className={TYPO.eyebrow}>게임 {game.seq}</span>
                <div className="flex items-center gap-2 shrink-0">
                    <span className={`${balance.pillClass} tabular-nums`}>
                        {balance.label} {diff.toFixed(1)}
                    </span>
                    {actions}
                </div>
            </div>

            <div className="space-y-1.5">
                <TeamLine team={game.team1} barClass={TEAM1_BAR} />
                <div className="border-t border-border/60" />
                <TeamLine team={game.team2} barClass={TEAM2_BAR} />
            </div>

            {restingNames.length > 0 && (
                <p className={`${TYPO.caption} break-keep`}>
                    <span className={`${ATTENTION_PILL} mr-1.5`}>쉼</span>
                    {restingNames.join(', ')}
                </p>
            )}
        </li>
    )
}
