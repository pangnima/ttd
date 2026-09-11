'use client'

import { useMemo } from 'react'

import { PER_PLAYER_OPTIONS } from '@/lib/match-rooms/lineup'
import { SLOT_MINUTES_OPTIONS } from '@/lib/match-rooms/schedule'
import { MATCH_FORM_LABEL, TYPO } from '@/lib/dashboard/tokens'
import { EnumSelect } from '@/components/match/enum-select'

type Props = {
    perPlayer: number
    onPerPlayerChange: (n: number) => void
    /** 경기당 시간(분) — 권장 경기 수의 분모 */
    slotMinutes: number
    onSlotMinutesChange: (n: number) => void
    /** 방의 시간·면 수가 권하는 1인당 경기 수 — 그 항목에만 「권장」이 붙는다. 모르는 방이면 없다 */
    recommendedPerPlayer?: number
}

// base-ui Select는 items 참조로 라벨을 찾으므로 모듈 상수로 고정한다(렌더마다 새 배열이면 매핑이 흔들린다)
const SLOT_ITEMS = SLOT_MINUTES_OPTIONS.map((n) => ({ value: String(n), label: `${n}분` }))

/**
 * 1인당 경기 수 · 경기 시간 — 대진의 크기를 정하는 두 셀렉트.
 *
 * 권장값 항목의 라벨에 「권장」을 붙인다(Week 47). 트리거에도 같은 라벨이 보이므로 접힌 상태에서도
 * "지금 권장값이다"가 읽힌다. items는 권장값에만 의존하는 메모다 — 렌더마다 새 배열을 만들면
 * base-ui Select가 라벨 매핑을 잃는다.
 */
export function LineupCountFields({
    perPlayer, onPerPlayerChange, slotMinutes, onSlotMinutesChange, recommendedPerPlayer,
}: Props) {
    const perPlayerItems = useMemo(
        () => PER_PLAYER_OPTIONS.map((n) => ({
            value: String(n),
            label: n === recommendedPerPlayer ? `${n}경기 · 권장` : `${n}경기`,
        })),
        [recommendedPerPlayer],
    )

    return (
        <div className="grid gap-4 sm:grid-cols-2">
            <div>
                <label className={MATCH_FORM_LABEL}>1인당 경기 수 *</label>
                <EnumSelect
                    value={String(perPlayer)}
                    onValueChange={(v) => onPerPlayerChange(Number(v))}
                    options={perPlayerItems}
                    ariaLabel="1인당 경기 수"
                />
                <p className={`mt-2 ${TYPO.caption} break-keep`}>
                    덜 뛴 사람이 먼저 들어갑니다. 출전 편차는 1 이내입니다.
                </p>
            </div>
            <div>
                <label className={MATCH_FORM_LABEL}>경기 시간 *</label>
                <EnumSelect
                    value={String(slotMinutes)}
                    onValueChange={(v) => onSlotMinutesChange(Number(v))}
                    options={SLOT_ITEMS}
                    ariaLabel="경기 시간"
                />
                <p className={`mt-2 ${TYPO.caption} break-keep`}>
                    한 경기에 걸리는 시간입니다. 몇 경기가 좋을지 여기서 갈립니다.
                </p>
            </div>
        </div>
    )
}
