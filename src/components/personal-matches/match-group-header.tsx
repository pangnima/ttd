import type { ReactNode } from 'react'
import type { MatchGroup } from '@/lib/personal-matches/match-groups'
import { formatGameSummary } from '@/lib/dashboard/outcome'
import { MATCH_TYPE_LABELS } from '@/lib/dashboard/match-type-style'
import { formatHourLabel } from '@/lib/format'

type Props = {
    group: MatchGroup
    // 원본 행 기준 액션(수정·삭제·정정). 멀티 게임 그룹은 카드가 가상이라 액션이 헤더에만 붙는다.
    actions?: ReactNode
}

/**
 * 그룹 헤더 행 — 박스(divide-y) 안에서 같은 묶음의 게임 카드들 위에 놓인다.
 * 1행: 'MM.DD N시 · 로테이션|경기타입 · 코트명' + 'N게임 · 전적' / 2행: 참여 멤버(나 제외) / 메모(있을 때).
 * 일시가 앞에 오는 날짜 줄 형태라 별도 여백 없이도 그룹 경계가 읽힌다(대진표 리스트 뷰의 라운드 헤더 관용구).
 */
export function MatchGroupHeader({ group: g, actions }: Props) {
    const [, mm, dd] = g.playedAt.split('-')
    const when = [`${mm}.${dd}`, g.playedTime && formatHourLabel(g.playedTime)].filter(Boolean).join(' ')
    const kindLabel = g.kind === 'rotation' ? '로테이션' : MATCH_TYPE_LABELS[g.matchType]
    const tail = [kindLabel, g.courtName].filter(Boolean).join(' · ')

    return (
        <div className="bg-muted/30 px-3 py-2.5 space-y-0.5">
            <div className="flex items-center justify-between gap-2">
                <p className="text-body2 font-semibold text-foreground truncate tabular-nums">
                    {when} <span className="font-normal text-muted-foreground">· {tail}</span>
                </p>
                <div className="flex items-center gap-2 shrink-0">
                    <span className="text-caption px-1.5 py-0.5 rounded-sm bg-muted text-muted-foreground tabular-nums">
                        {formatGameSummary(g.gameCount, g.wins, g.losses, g.draws)}
                    </span>
                    {actions}
                </div>
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
