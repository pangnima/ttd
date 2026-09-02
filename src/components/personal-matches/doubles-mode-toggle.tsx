'use client'

import { FieldToggle } from '@/components/common/field-toggle'

export type DoublesMode = 'fixed' | 'rotation'

type DoublesModeToggleProps = {
    value: DoublesMode
    onChange: (v: DoublesMode) => void
}

const OPTIONS: { value: DoublesMode; label: string }[] = [
    { value: 'fixed', label: '페어 고정' },
    { value: 'rotation', label: '로테이션(파트너 교체)' },
]

/**
 * 복식 입력 방식 토글. 페어 고정(기본) vs 로테이션(게임마다 파트너 교체).
 * 공용 FieldToggle 위에 도메인 라벨·옵션만 입힌 얇은 래퍼.
 */
export function DoublesModeToggle({ value, onChange }: DoublesModeToggleProps) {
    return <FieldToggle label="복식 방식" options={OPTIONS} value={value} onChange={onChange} />
}
