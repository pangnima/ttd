'use client'

import { useState } from 'react'
import { TextField } from '@/components/common/text-field'
import { NAME_MAX_LEN, validateName } from '@/lib/profile/signup-fields'

type Props = {
    /** 소셜 가입자의 완성 화면에서 provider 표시명을 미리 채운다(고쳐 쓸 수 있게) */
    defaultValue?: string
}

/**
 * 실명 입력 — 가입 전용(가입 후 변경 불가).
 * 가입 폼과 소셜 가입자의 프로필 완성 화면이 함께 쓴다.
 *
 * controlled인 이유는 서버 에러로 돌아오면 React 19의 form action이 폼을 리셋하기 때문이다.
 * 숫자 금지 등 규칙은 `validateName`이 단일 출처이고, 서버 액션도 같은 함수를 본다.
 */
export function NameField({ defaultValue = '' }: Props = {}) {
    const [value, setValue] = useState(defaultValue)
    const [touched, setTouched] = useState(false)

    // 타이핑 도중에 "이름을 입력해 주세요"가 뜨면 거슬린다 — blur 이후, 값이 있을 때만 말한다.
    const message = touched && value.trim().length > 0 ? validateName(value) : null

    return (
        <TextField
            id="name" name="name" placeholder="실명" label="이름 *" required
            maxLength={NAME_MAX_LEN} autoComplete="name"
            value={value} onChange={(e) => setValue(e.target.value)}
            onBlur={() => setTouched(true)}
            aria-invalid={Boolean(message)}
            message={message}
            messageTone="destructive"
        />
    )
}
