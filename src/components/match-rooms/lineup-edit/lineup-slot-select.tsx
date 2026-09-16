'use client'

import type { LineupPlayer } from '@/lib/match-games/lineup-core'
import type { LineupSlot } from '@/lib/match-rooms/lineup'
import { isMissingPlayer } from '@/lib/match-rooms/lineup-draft'
import { EnumSelect } from '@/components/common/enum-select'

type Props = {
    label: string
    /** 대진에 넣기로 한 사람 전원 — 같은 게임에 이미 있어도 뺴지 않는다(고르면 두 자리가 맞바뀐다) */
    players: LineupPlayer[]
    value: LineupSlot
    onChange: (player: LineupSlot) => void
}

function optionLabel(p: LineupPlayer): string {
    if (isMissingPlayer(p)) return `${p.name} (명단에 없음)`
    return p.isMember ? `${p.name} ${p.ntrp.toFixed(1)}` : `${p.name} (비회원)`
}

/**
 * 대진 한 자리를 고르는 드롭다운.
 *
 * 후보에서 같은 게임의 다른 사람을 빼지 않는 이유는 `setSlot`이 **맞바꾸기**로 처리하기 때문이다 —
 * 파트너와 상대를 서로 바꾸는 것이 편집에서 가장 잦은 손짓인데, 후보에서 빼면 두 번 고쳐야 한다.
 * 현재 값은 명단에 없더라도 항상 옵션에 넣는다(빼면 빈 칸으로 보여 무엇이 잘못됐는지 알 수 없다).
 */
export function LineupSlotSelect({ label, players, value, onChange }: Props) {
    const options = players.map((p) => ({ value: p.key, label: optionLabel(p) }))
    if (value && !players.some((p) => p.key === value.key)) {
        options.unshift({ value: value.key, label: optionLabel(value) })
    }

    return (
        <EnumSelect
            value={value?.key ?? ''}
            onValueChange={(key) => onChange(players.find((p) => p.key === key) ?? value)}
            options={options}
            placeholder="선수 선택"
            ariaLabel={label}
        />
    )
}
