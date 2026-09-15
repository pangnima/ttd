'use client'

import { useState } from 'react'
import { parseYearMonth } from '@/lib/format/year-month'
import { FORM_INPUT_BASE as inputCls, FORM_LABEL_BASE as labelCls } from '@/lib/dashboard/tokens'

type Props = {
    label?: string
    /** 라벨 뒤에 ' *'를 붙인다 */
    required?: boolean
    name?: string
    defaultValue?: string
    /** 유효한 값을 적기 전 보이는 안내 */
    hint?: string
    /** 값이 바뀔 때 부모에 올린다 — 제출 버튼을 잠그는 쪽이 쓴다 */
    onValueChange?: (value: string) => void
}

/**
 * 년/월 입력 필드 (`2022/07`) — 가입 폼과 프로필 설정이 함께 쓴다.
 *
 * **controlled로 유지한다**: 서버 검증 에러가 돌아와도 입력이 남아야 한다
 * (React 19의 form action은 폼을 리셋한다).
 *
 * 값을 두 화면이 각자 파싱하면 규칙이 갈리므로 판정은 `parseYearMonth` 하나만 본다 —
 * `NicknameField`·`PhoneField`를 두 화면이 공유하는 것과 같은 이유(0079).
 */
export function YearMonthField({
    label = '테니스 시작일',
    required = false,
    name = 'tennis_start_date',
    defaultValue = '',
    hint = '년/월만 입력합니다',
    onValueChange,
}: Props) {
    const [value, setValue] = useState(defaultValue)
    const [touched, setTouched] = useState(false)

    const parsed = value.trim() ? parseYearMonth(value) : null
    const invalid = touched && value.trim().length > 0 && parsed === null

    function handleChange(next: string) {
        setValue(next)
        onValueChange?.(next)
    }

    return (
        <div>
            <label htmlFor={name} className={labelCls}>
                {label}
                {required ? ' *' : ''}
            </label>
            <input
                id={name} name={name}
                inputMode="numeric" placeholder="예: 2022/07" maxLength={12}
                value={value}
                onChange={(e) => handleChange(e.target.value)}
                onBlur={() => setTouched(true)}
                aria-invalid={invalid}
                className={inputCls}
            />
            {invalid ? (
                <p className="mt-1 text-caption text-destructive">
                    년/월 형식으로 입력해 주세요 (예: 2022/07). 미래 월은 입력할 수 없습니다.
                </p>
            ) : (
                <p className="mt-1 text-caption text-muted-foreground">
                    {parsed ? `${parsed.year}년 ${parsed.month}월부터` : hint}
                </p>
            )}
        </div>
    )
}
