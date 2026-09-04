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
 * 표시 그룹 → 카드 행들. 로테이션 그룹은 헤더 행(일시가 앞) + 게임 카드 N장(메타 숨김)을 래퍼로 묶고,
 * 레코드는 카드 1장. 그룹 경계는 빈 여백이 아니라 헤더 행의 배경으로 구분한다.
 * 부모가 `${CARD_BASE} divide-y` 컨테이너를 제공한다(월 그룹·프로필 월 브라우저 공용).
 */
export function MatchGroupList({ groups, renderActions }: Props) {
    return (
        <>
            {groups.map((g) =>
                g.kind === 'rotation' ? (
                    <div key={g.key} className="divide-y divide-border/60">
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
