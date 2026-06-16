'use client'

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
 * AdDeuceToggle의 버튼 스타일을 차용.
 */
export function DoublesModeToggle({ value, onChange }: DoublesModeToggleProps) {
    return (
        <div>
            <label className="text-sm font-medium text-foreground block mb-1">복식 방식</label>
            <div className="grid grid-cols-2 gap-1.5">
                {OPTIONS.map((o) => {
                    const active = value === o.value
                    return (
                        <button
                            key={o.value}
                            type="button"
                            onClick={() => onChange(o.value)}
                            className={`px-2.5 py-2 text-xs rounded-md border transition-colors ${
                                active
                                    ? 'border-info/50 bg-info/10 text-info font-semibold'
                                    : 'border-border text-muted-foreground hover:border-input hover:text-foreground'
                            }`}
                        >
                            {o.label}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
