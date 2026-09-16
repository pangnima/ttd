'use client'

import { useEffect, useState } from 'react'
import { TextField } from '@/components/common/text-field'
import { useAvailabilityCheck } from '@/components/auth/use-availability-check'
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
    /**
     * 서버가 이 닉네임을 거절한 문구(F-18). 화면 검사는 debounce 시점의 답이라 서버 판정과 어긋날 수 있다 —
     * 서버 문구가 오면 손대기 전까지 **그것만** 보이고, 고치기 시작하면 다시 화면 검사가 말한다.
     */
    serverError?: string | null
}

/** 닉네임 입력 — 타이핑이 멈추면 중복을 물어 필드 아래에서 말한다(판정은 `useAvailabilityCheck`). */
export function NicknameField({ defaultValue = '', excludeUserId, onTakenChange, serverError }: Props) {
    const [value, setValue] = useState(defaultValue)
    // 손대기 시작한 시점의 서버 문구를 기억한다 — 같은 문구가 남아 있는 동안은 "이미 고치는 중"이다(effect 없이 파생)
    const [dismissedServerError, setDismissedServerError] = useState<string | null | undefined>(undefined)
    const showServerError = Boolean(serverError) && dismissedServerError !== serverError
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

    const bad = taken || Boolean(invalidMessage) || showServerError
    // 처음 값 그대로면 아무 말도 하지 않는다 — 묻지 않았으니 답할 것도 없다.
    const untouched = nickname === initialNickname
    const result = showServerError
        ? serverError
        : invalidMessage ??
          (settled && !untouched ? (taken ? NICKNAME_TAKEN_MESSAGE : '사용 가능한 닉네임입니다.') : null)
    const message = checking ? '확인 중...' : result

    return (
        <TextField
            id="nickname" name="nickname" placeholder="닉네임" label="닉네임 *" required
            maxLength={NICKNAME_MAX_LEN} autoComplete="nickname"
            value={value} onChange={(e) => { setValue(e.target.value); setDismissedServerError(serverError) }}
            aria-invalid={bad}
            message={message}
            messageTone={bad && !checking ? 'destructive' : 'muted'}
        />
    )
}
