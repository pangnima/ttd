'use client'

import { useState } from 'react'
import { FORM_INPUT_BASE as inputCls, FORM_LABEL_BASE as labelCls } from '@/lib/dashboard/tokens'
import { NAME_MAX_LEN, validateName } from '@/lib/profile/signup-fields'

/**
 * 실명 입력 — 가입 전용(가입 후 변경 불가).
 *
 * controlled인 이유는 서버 에러로 돌아오면 React 19의 form action이 폼을 리셋하기 때문이다.
 * 숫자 금지 등 규칙은 `validateName`이 단일 출처이고, 서버 액션도 같은 함수를 본다.
 */
export function NameField() {
    const [value, setValue] = useState('')
    const [touched, setTouched] = useState(false)

    // 타이핑 도중에 "이름을 입력해 주세요"가 뜨면 거슬린다 — blur 이후, 값이 있을 때만 말한다.
    const message = touched && value.trim().length > 0 ? validateName(value) : null

    return (
        <div>
            <label htmlFor="name" className={labelCls}>이름 *</label>
            <input
                id="name" name="name" placeholder="실명" required
                maxLength={NAME_MAX_LEN} autoComplete="name"
                value={value} onChange={(e) => setValue(e.target.value)}
                onBlur={() => setTouched(true)}
                aria-invalid={Boolean(message)}
                className={inputCls}
            />
            {message && <p className="mt-1 text-caption text-destructive">{message}</p>}
        </div>
    )
}
