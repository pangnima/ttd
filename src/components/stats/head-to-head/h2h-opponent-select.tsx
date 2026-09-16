'use client'

import type { UnifiedHeadToHead } from '@/lib/queries/stats'
import type { User } from '@/types'
import {
    Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from '@/components/ui/select'

type Props = {
    h2hList: UnifiedHeadToHead[]
    userMap: Map<string, User>
    value: string
    onChange: (key: string) => void
}

/** 회원 상대는 userId, 외부 상대는 `name:<이름>`이 키다 */
export function h2hOpponentKey(h: UnifiedHeadToHead): string {
    return h.opponentUserId ?? `name:${h.opponentName}`
}

/**
 * 상대 선택 드롭다운 — 클럽 회원 / 외부 상대 두 그룹.
 * @base-ui Select.Value는 raw value를 표시하므로 value→label 매핑을 items로 넘긴다(드롭다운 표시와 동일한 라벨).
 */
export function H2HOpponentSelect({ h2hList, userMap, value, onChange }: Props) {
    const members = h2hList.filter((h) => h.opponentUserId !== null)
    const externals = h2hList.filter((h) => h.opponentUserId === null)
    const memberLabel = (h: UnifiedHeadToHead) => {
        const key = h.opponentUserId!
        return `${h.opponentName ?? userMap.get(key)?.name ?? key.slice(0, 8)} (${h.matches}경기)`
    }
    const externalLabel = (h: UnifiedHeadToHead) => `${h.opponentName} (외부 · ${h.matches}경기)`
    const items = [
        ...members.map((h) => ({ value: h2hOpponentKey(h), label: memberLabel(h) })),
        ...externals.map((h) => ({ value: h2hOpponentKey(h), label: externalLabel(h) })),
    ]

    return (
        <Select value={value} onValueChange={(v) => v && onChange(v)} items={items}>
            <SelectTrigger className="w-full sm:w-[200px] h-8 text-body2 bg-card">
                <SelectValue placeholder="상대 선택" />
            </SelectTrigger>
            <SelectContent>
                {members.length > 0 && (
                    <SelectGroup>
                        <SelectLabel className="text-caption text-muted-foreground">클럽 회원</SelectLabel>
                        {members.map((h) => (
                            <SelectItem key={h2hOpponentKey(h)} value={h2hOpponentKey(h)}>{memberLabel(h)}</SelectItem>
                        ))}
                    </SelectGroup>
                )}
                {externals.length > 0 && (
                    <SelectGroup>
                        <SelectLabel className="text-caption text-muted-foreground">외부 상대</SelectLabel>
                        {externals.map((h) => (
                            <SelectItem key={h2hOpponentKey(h)} value={h2hOpponentKey(h)}>{externalLabel(h)}</SelectItem>
                        ))}
                    </SelectGroup>
                )}
            </SelectContent>
        </Select>
    )
}
