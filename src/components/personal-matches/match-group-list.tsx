import type { ReactNode } from 'react'
import type { PersonalMatch } from '@/types'
import type { MatchGroup } from '@/lib/personal-matches/match-groups'
import { CARD_BASE } from '@/lib/dashboard/tokens'
import { PersonalMatchCard } from '@/components/personal-matches/personal-match-card'
import { RotationGroupHeader } from '@/components/personal-matches/rotation-group-header'

type Props = {
    groups: MatchGroup[]
    renderActions?: (match: PersonalMatch) => ReactNode
}

// 박스 = 표시 그룹 1개. overflow-hidden이 로테이션 헤더 배경을 라운드에 맞춰 자른다.
const GROUP_BOX = `${CARD_BASE} overflow-hidden`

/**
 * 표시 그룹 → 카드 박스들. 로테이션 그룹은 헤더 행(일시가 앞) + 게임 카드 N장(메타 숨김)을 한 박스에,
 * 레코드는 카드 1장을 각자의 박스에 담는다 — 박스 사이 여백이 '다른 경기', 박스 안 얇은 선이 '같은 세션'이다.
 * 그룹마다 박스를 소유하므로 부모는 컨테이너를 주지 않는다(월 그룹·프로필 월 브라우저 공용).
 */
export function MatchGroupList({ groups, renderActions }: Props) {
    return (
        <div className="space-y-2">
            {groups.map((g) =>
                g.kind === 'rotation' ? (
                    <div key={g.key} className={`${GROUP_BOX} divide-y divide-border/60`}>
                        <RotationGroupHeader group={g} />
                        {g.matches.map((m) => (
                            <PersonalMatchCard key={m.id} match={m} hideMeta actions={renderActions?.(m)} />
                        ))}
                    </div>
                ) : (
                    <div key={g.key} className={GROUP_BOX}>
                        <PersonalMatchCard match={g.matches[0]} actions={renderActions?.(g.matches[0])} />
                    </div>
                ),
            )}
        </div>
    )
}
