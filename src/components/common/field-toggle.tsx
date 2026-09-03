'use client'

import { MATCH_FORM_LABEL } from '@/lib/dashboard/tokens'

type Option<T extends string> = { value: T; label: string }

type FieldToggleColumns = 2 | 3 | 4 | 5 | 7

type FieldToggleProps<T extends string> = {
    label?: string
    // label 에 ' *' 부착
    required?: boolean
    options: Option<T>[]
    value: T | undefined
    onChange: (v: T) => void
    // 열 수 강제 (미지정 시 옵션 개수 기준). 5·7은 좁은 화면에서 줄바꿈해 터치 타깃을 확보한다.
    columns?: FieldToggleColumns
    // 라벨 스타일 덮어쓰기 (auth 폼은 FORM_LABEL_BASE 위계 사용)
    labelClassName?: string
}

// 옵션 개수별 정적 grid 클래스 (Tailwind purge 대응 — 동적 문자열 금지)
const GRID_COLS: Record<number, string> = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-3 sm:grid-cols-5',
    7: 'grid-cols-4 sm:grid-cols-7',
}

/**
 * 폼 필드용 라디오형 선택 토글 — 손잡이·복식 방식·성별·NTRP·라켓 등에서 공유한다.
 * 활성은 info 강조색, 비활성도 text-foreground라 클릭 가능함이 분명하다(disabled처럼 보이지 않음).
 * 카드 헤더의 pill 형 common/SegmentedToggle과는 용도가 다른 풀폭 그리드 토글이다.
 */
export function FieldToggle<T extends string>({
    label,
    required = false,
    options,
    value,
    onChange,
    columns,
    labelClassName = MATCH_FORM_LABEL,
}: FieldToggleProps<T>) {
    const gridCls = GRID_COLS[columns ?? options.length] ?? 'grid-cols-2'
    return (
        <div>
            {label && (
                <label className={labelClassName}>
                    {label}
                    {required ? ' *' : ''}
                </label>
            )}
            <div role="radiogroup" aria-label={label} className={`grid gap-1.5 ${gridCls}`}>
                {options.map((o) => {
                    const active = value === o.value
                    return (
                        <button
                            key={o.value}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => onChange(o.value)}
                            className={`px-2.5 py-2 text-body2 rounded-md border transition-colors ${
                                active
                                    ? 'border-accent-lime bg-accent-lime text-accent-lime-foreground font-semibold'
                                    : 'border-input text-foreground hover:bg-muted/40'
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
