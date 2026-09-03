'use client'

import { FieldToggle } from '@/components/common/field-toggle'

export type DoublesMode = 'fixed' | 'rotation'

type DoublesModeToggleProps = {
    value: DoublesMode
    onChange: (v: DoublesMode) => void
}

// 기본값(로테이션)을 첫 옵션으로 — 동호인 복식은 파트너 교체가 일반적이라 로테이션이 기본이다.
const OPTIONS: { value: DoublesMode; label: string }[] = [
    { value: 'rotation', label: '로테이션(파트너 교체)' },
    { value: 'fixed', label: '페어 고정' },
]

/**
 * 복식 입력 방식 토글. 로테이션(기본, 게임마다 파트너 교체) vs 페어 고정.
 * 공용 FieldToggle 위에 도메인 라벨·옵션만 입힌 얇은 래퍼.
 */
export function DoublesModeToggle({ value, onChange }: DoublesModeToggleProps) {
    return <FieldToggle label="복식 방식" options={OPTIONS} value={value} onChange={onChange} />
}
