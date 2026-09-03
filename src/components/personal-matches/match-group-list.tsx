import type { ReactNode } from 'react'
import type { PersonalMatch } from '@/types'
import type { MatchGroup } from '@/lib/personal-matches/match-groups'
import { PersonalMatchCard } from '@/components/personal-matches/personal-match-card'
import { RotationGroupHeader } from '@/components/personal-matches/rotation-group-header'

type Props = {
    groups: MatchGroup[]
    renderActions?: (match: PersonalMatch) => ReactNode
}

/**
 * 표시 그룹 → 카드 행들. 로테이션 그룹은 헤더 행 + 게임 카드 N장(메타 숨김)을 래퍼로 묶고
 * 앞뒤에 여백(my-4)을 두어 이웃 카드·그룹과 분리한다. 레코드는 카드 1장.
 * 부모가 `${CARD_BASE} divide-y` 컨테이너를 제공한다(월 그룹·프로필 월 브라우저 공용) — 부모의 구분선이
 * 래퍼 상단에 그어지고 그 위에 여백이 생긴다.
 */
export function MatchGroupList({ groups, renderActions }: Props) {
    return (
        <>
            {groups.map((g) =>
                g.kind === 'rotation' ? (
                    <div key={g.key} className="my-4 first:mt-0 last:mb-0 divide-y divide-border/60">
                        <RotationGroupHeader group={g} />
                        {g.matches.map((m) => (
                            <PersonalMatchCard key={m.id} match={m} hideMeta actions={renderActions?.(m)} />
                        ))}
                    </div>
                ) : (
                    <PersonalMatchCard key={g.key} match={g.matches[0]} actions={renderActions?.(g.matches[0])} />
                ),
            )}
        </>
    )
}
