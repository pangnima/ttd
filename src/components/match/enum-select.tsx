'use client'

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

type EnumSelectProps<T extends string> = {
    value: T | ''
    onValueChange: (value: T) => void
    options: { value: T; label: string }[]
    // 미선택 상태에 보일 안내 문구 (값이 비어있을 때만 노출)
    placeholder?: string
    triggerClassName?: string
    ariaLabel?: string
}

/**
 * enum 값(경기 타입·코트 표면 등)을 고르는 Select 래퍼.
 * base-ui Select는 `items`로 넘긴 {value,label} 매핑으로 SelectValue에 라벨을 표시하므로
 * 반드시 options를 `items`로 그대로 전달한다(전달 누락 시 코드값이 노출됨).
 */
export function EnumSelect<T extends string>({
    value,
    onValueChange,
    options,
    placeholder,
    triggerClassName = 'w-full data-[size=default]:h-11 bg-background dark:bg-input/30 border-input focus:border-ring',
    ariaLabel,
}: EnumSelectProps<T>) {
    return (
        <Select
            // 제네릭 T에서는 base-ui의 Value 추론이 좁아지므로 명시 캐스팅.
            // 런타임에 ''는 매칭 항목이 없어 placeholder가 노출된다(미선택 상태).
            value={value as T}
            onValueChange={(v) => { if (v) onValueChange(v as T) }}
            items={options}
        >
            <SelectTrigger className={triggerClassName} aria-label={ariaLabel}>
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                {options.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
