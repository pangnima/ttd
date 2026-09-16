'use client'

import { useEffect, useState } from 'react'
import { TextField } from '@/components/common/text-field'
import { useAvailabilityCheck } from '@/components/auth/use-availability-check'
import {
    LOGIN_ID_MAX_LEN,
    LOGIN_ID_TAKEN_MESSAGE,
    normalizeLoginId,
    validateLoginId,
} from '@/lib/auth/login-id'

type Props = {
    /** 가입은 필수, 프로필 설정의 1회 입력은 선택 */
    required?: boolean
    /** 제출 버튼을 잠글 때 쓴다. 참조가 고정된 함수를 넘길 것(effect 의존성) */
    onTakenChange?: (taken: boolean) => void
}

/**
 * 로그인 아이디 입력(0085) — `NicknameField`와 같은 관용구. 타이핑이 멈추면 중복을 물어 아래에서 말한다.
 *
 * 대문자는 오류가 아니라 정규화 대상이다 — 서버·트리거가 소문자로 저장하므로 **입력 중에 소문자로 보여준다**(U-1).
 * 화면은 대문자인데 저장은 소문자면 "입력한 값과 저장된 값이 다른" 칸이 된다. trim은 타이핑 중엔 하지 않는다.
 */
export function LoginIdField({ required = true, onTakenChange }: Props) {
    const [value, setValue] = useState('')

    const loginId = normalizeLoginId(value)
    const invalidMessage = loginId.length > 0 ? validateLoginId(loginId) : null
    const { checking, taken, settled } = useAvailabilityCheck({
        rpc: 'is_login_id_taken',
        value: loginId,
        skip: Boolean(invalidMessage),
        initialValue: '',
    })

    useEffect(() => {
        onTakenChange?.(taken)
    }, [taken, onTakenChange])

    const bad = taken || Boolean(invalidMessage)
    const result = invalidMessage ?? (settled ? (taken ? LOGIN_ID_TAKEN_MESSAGE : '사용 가능한 아이디입니다.') : null)
    // 확인 중 → 검사 결과 → 도움말 순. 셋 중 하나만 보인다
    const message = checking ? '확인 중...' : result ?? '로그인에 쓰는 아이디입니다. 가입 후에는 바꿀 수 없습니다.'

    return (
        <TextField
            id="login_id" name="login_id" placeholder="영문 소문자·숫자·_ 4~20자"
            label={`아이디${required ? ' *' : ''}`}
            required={required} maxLength={LOGIN_ID_MAX_LEN}
            autoComplete="username" autoCapitalize="none" spellCheck={false}
            value={value} onChange={(e) => setValue(e.target.value.toLowerCase())}
            aria-invalid={bad}
            message={message}
            messageTone={bad && !checking ? 'destructive' : 'muted'}
        />
    )
}
