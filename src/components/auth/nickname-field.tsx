'use client'

import { useEffect, useState } from 'react'
import { useAvailabilityCheck } from '@/components/auth/use-availability-check'
import { FORM_INPUT_BASE as inputCls, FORM_LABEL_BASE as labelCls } from '@/lib/dashboard/tokens'
import {
    NICKNAME_MAX_LEN,
    NICKNAME_TAKEN_MESSAGE,
    normalizeNickname,
    validateNickname,
} from '@/lib/profile/nickname'

type Props = {
    defaultValue?: string
    /** 프로필 설정에서 본인 행을 중복으로 세지 않기 위해 */
    excludeUserId?: string
    /** 제출 버튼을 잠글 때 쓴다. useState의 setter처럼 **참조가 고정된** 함수를 넘길 것(effect 의존성) */
    onTakenChange?: (taken: boolean) => void
}

/** 닉네임 입력 — 타이핑이 멈추면 중복을 물어 필드 아래에서 말한다(판정은 `useAvailabilityCheck`). */
export function NicknameField({ defaultValue = '', excludeUserId, onTakenChange }: Props) {
    const [value, setValue] = useState(defaultValue)
    // 처음 들고 있던 값은 물을 것이 없다 — 프로필 설정에서 자기 닉네임은 이미 자기 것이다.
    const [initialNickname] = useState(() => normalizeNickname(defaultValue))

    const nickname = normalizeNickname(value)
    const invalidMessage = nickname.length > 0 ? validateNickname(nickname) : null
    const { checking, taken, settled } = useAvailabilityCheck({
        rpc: 'is_nickname_taken',
        value: nickname,
        skip: Boolean(invalidMessage),
        initialValue: initialNickname,
        excludeUserId,
    })

    useEffect(() => {
        onTakenChange?.(taken)
    }, [taken, onTakenChange])

    const bad = taken || Boolean(invalidMessage)
    // 처음 값 그대로면 아무 말도 하지 않는다 — 묻지 않았으니 답할 것도 없다.
    const untouched = nickname === initialNickname
    const message =
        invalidMessage ??
        (settled && !untouched ? (taken ? NICKNAME_TAKEN_MESSAGE : '사용 가능한 닉네임입니다.') : null)

    return (
        <div>
            <label htmlFor="nickname" className={labelCls}>닉네임 *</label>
            <input
                id="nickname" name="nickname" placeholder="닉네임" required
                maxLength={NICKNAME_MAX_LEN} autoComplete="nickname"
                value={value} onChange={(e) => setValue(e.target.value)}
                aria-invalid={bad}
                className={inputCls}
            />
            {checking && <p className="mt-1 text-caption text-muted-foreground">확인 중...</p>}
            {message && (
                <p className={`mt-1 text-caption ${bad ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {message}
                </p>
            )}
        </div>
    )
}
