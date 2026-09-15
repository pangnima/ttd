import { ChevronRight } from 'lucide-react'
import { Fragment } from 'react'

import { GUIDE_ROOM_TURN } from '@/lib/guide/fixtures'
import { STAGE_FLOW } from '@/lib/guide/sections'
import { GuideExample } from '@/components/guide/guide-example'
import { RoomStageBadge } from '@/components/match-rooms/room-stage-badge'
import { RoomTurnBanner } from '@/components/match-rooms/room-turn-banner'

/**
 * 다섯 단계 칩을 순서대로 이은 줄 + 매칭 상세 상단의 「지금 할 일」 배너 둘(내 차례 / 상대 차례).
 * 칩과 배너는 실제 컴포넌트라 단계·문구가 바뀌면 여기도 따라간다.
 */
export function StageStepper() {
    return (
        <GuideExample caption="위 배너는 내 차례, 아래는 상대 차례입니다 — 참여 중인 매칭 카드의 **결과 확인** 표시와 같은 판정에서 나옵니다.">
            <div className="space-y-4">
                <ol className="flex flex-wrap items-center gap-1.5">
                    {STAGE_FLOW.map((stage, i) => (
                        <Fragment key={stage}>
                            {i > 0 && (
                                <li aria-hidden className="text-muted-foreground">
                                    <ChevronRight className="size-4" />
                                </li>
                            )}
                            <li>
                                <RoomStageBadge stage={stage} />
                            </li>
                        </Fragment>
                    ))}
                </ol>
                <div className="space-y-2">
                    <RoomTurnBanner turn={GUIDE_ROOM_TURN} stage="playing" />
                    <RoomTurnBanner turn={{ turn: 'waiting', count: 1 }} stage="playing" />
                </div>
            </div>
        </GuideExample>
    )
}
