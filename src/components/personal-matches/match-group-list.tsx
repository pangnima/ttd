import type { ReactNode } from 'react'
import type { PersonalMatch } from '@/types'
import type { MatchGroup } from '@/lib/personal-matches/match-groups'
import { CARD_BASE } from '@/lib/dashboard/tokens'
import { PersonalMatchCard } from '@/components/personal-matches/personal-match-card'
import { MatchGroupHeader } from '@/components/personal-matches/match-group-header'

type Props = {
    groups: MatchGroup[]
    renderActions?: (match: PersonalMatch) => ReactNode
}

// 박스 = 표시 그룹 1개. overflow-hidden이 로테이션 헤더 배경을 라운드에 맞춰 자른다.
const GROUP_BOX = `${CARD_BASE} overflow-hidden`

/**
 * 표시 그룹 → 카드 박스들. 묶음 그룹(로테이션 세션·멀티 게임 경기)은 헤더 행(일시가 앞) + 게임 카드 N장(메타 숨김)을
 * 한 박스에, 게임 1개짜리 레코드는 카드 1장을 각자의 박스에 담는다 —
 * 박스 사이 여백이 '다른 경기', 박스 안 얇은 선이 '같은 묶음의 다음 게임'이다.
 * 그룹마다 박스를 소유하므로 부모는 컨테이너를 주지 않는다(월 그룹·프로필 월 브라우저 공용).
 *
 * 액션의 기준이 종류마다 다르다: 로테이션은 카드가 곧 실제 행이라 카드마다 붙고,
 * 멀티 게임은 카드가 표시용 가상 분해본이라 원본 행(sourceMatch) 기준으로 헤더에 한 번만 붙는다.
 */
export function MatchGroupList({ groups, renderActions }: Props) {
    return (
        <div className="space-y-2">
            {groups.map((g) => {
                if (g.kind === 'record') {
                    return (
                        <div key={g.key} className={GROUP_BOX}>
                            <PersonalMatchCard match={g.matches[0]} actions={renderActions?.(g.matches[0])} />
                        </div>
                    )
                }
                const isRotation = g.kind === 'rotation'
                return (
                    <div key={g.key} className={`${GROUP_BOX} divide-y divide-border/60`}>
                        <MatchGroupHeader group={g} actions={isRotation ? undefined : renderActions?.(g.sourceMatch)} />
                        {g.matches.map((m, i) => (
                            <PersonalMatchCard
                                key={m.id}
                                match={m}
                                hideMeta
                                gameLabel={isRotation ? undefined : `${i + 1}게임`}
                                actions={isRotation ? renderActions?.(m) : undefined}
                            />
                        ))}
                    </div>
                )
            })}
        </div>
    )
}
