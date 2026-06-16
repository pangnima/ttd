'use client'

import { EnumSelect } from '@/components/match/enum-select'
import type { PoolPlayer } from '@/lib/personal-matches/rotation'

type PoolSelectProps = {
    label: string
    pool: PoolPlayer[]
    value: string | null // pool[].tempId
    // 같은 게임에서 이미 선택된 다른 슬롯의 tempId — 중복 선택 방지
    exclude?: string[]
    onChange: (tempId: string) => void
}

function poolLabel(p: PoolPlayer): string {
    const name = p.player.name.trim() || '이름 미입력'
    return p.ntrp.trim() ? `${name} (${p.ntrp})` : name
}

/**
 * 선수 풀에서 한 명을 고르는 드롭다운(게임 빌더의 파트너/상대 선택).
 * 현재 선택값은 항상 옵션에 포함하고, exclude된 다른 슬롯 선수는 옵션에서 제외한다.
 */
export function PoolSelect({ label, pool, value, exclude = [], onChange }: PoolSelectProps) {
    const options = pool
        .filter((p) => p.tempId === value || !exclude.includes(p.tempId))
        .map((p) => ({ value: p.tempId, label: poolLabel(p) }))
    return (
        <div>
            <label className="text-xs text-muted-foreground block mb-1">{label}</label>
            <EnumSelect
                value={value ?? ''}
                onValueChange={onChange}
                options={options}
                placeholder="선택"
                ariaLabel={label}
            />
        </div>
    )
}
