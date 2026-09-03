import type { MatchGroup } from '@/lib/personal-matches/match-groups'
import { formatRecord } from '@/lib/dashboard/outcome'
import { formatHourLabel } from '@/lib/format'

type Props = { group: MatchGroup }

/**
 * 로테이션 그룹 헤더 행 — 월 카드 컨테이너(divide-y) 안에서 같은 세션의 게임 카드들 위에 놓인다.
 * 1행: '로테이션 · MM.DD N시 · 코트명' + 'N게임 · 전적' / 2행: 참여 멤버(나 제외) / 메모(있을 때).
 * 대진표 리스트 뷰의 라운드 헤더와 같은 연한 배경 관용구.
 */
export function RotationGroupHeader({ group: g }: Props) {
    const [, mm, dd] = g.playedAt.split('-')
    const when = [`${mm}.${dd}`, g.playedTime && formatHourLabel(g.playedTime), g.courtName].filter(Boolean).join(' ')
    const hasRecord = g.wins + g.losses + g.draws > 0

    return (
        <div className="bg-muted/30 px-3 py-2 space-y-0.5">
            <div className="flex items-center justify-between gap-2">
                <p className="text-body2 font-semibold text-foreground truncate">
                    로테이션 <span className="font-normal text-muted-foreground">· {when}</span>
                </p>
                <span className="text-caption px-1.5 py-0.5 rounded-sm bg-muted text-muted-foreground shrink-0 tabular-nums">
                    {g.gameCount}게임{hasRecord && ` · ${formatRecord(g.wins, g.losses, g.draws)}`}
                </span>
            </div>
            {g.participantNames.length > 0 && (
                <p className="text-caption text-muted-foreground truncate">
                    참여 <span className="text-foreground">{g.participantNames.join(' · ')}</span>
                </p>
            )}
            {g.notes && <p className="text-caption text-muted-foreground line-clamp-2 break-keep whitespace-pre-line">{g.notes}</p>}
        </div>
    )
}
