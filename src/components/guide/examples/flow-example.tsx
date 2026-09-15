import { GuideExample } from '@/components/guide/guide-example'
import { FlowStepper } from '@/components/guide/examples/flow-stepper'
import { GameStatusExample } from '@/components/guide/examples/game-status-example'

/** 흐름 섹션 = 스테퍼(실제 링크) + 게임 카드 세 상태(예시) — 가장 이해가 어려운 곳이라 둘 다 둔다 */
export function FlowExample() {
    return (
        <>
            <FlowStepper />
            <GuideExample caption="같은 게임이 지나는 세 상태입니다. 한 사람이 **결과 입력**을 하면 나머지가 **결과 확인**을 누르고, 전원이 확인하면 확정됩니다.">
                <GameStatusExample />
            </GuideExample>
        </>
    )
}
