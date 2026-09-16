'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TextField } from '@/components/common/text-field'
import { useAvailabilityCheck } from '@/components/auth/use-availability-check'
import { EMAIL_TAKEN_MESSAGE, looksLikeEmail, normalizeEmail } from '@/lib/auth/email'

type Props = {
    /** 제출 버튼을 잠글 때 쓴다. 참조가 고정된 함수를 넘길 것(effect 의존성) */
    onTakenChange?: (taken: boolean) => void
}

/**
 * 가입용 이메일 입력 — 타이핑이 멈추면 이미 가입된 주소인지 물어 곧바로 말한다.
 *
 * 이미 가입된 주소라면 **[로그인]·[비밀번호 찾기] 탈출구를 함께 준다** — "이미 가입됨"만 말하고
 * 끝내면 비밀번호를 잊은 사람이 막다른 길에 선다.
 */
export function EmailField({ onTakenChange }: Props) {
    const [value, setValue] = useState('')

    const email = normalizeEmail(value)
    const wellFormed = looksLikeEmail(email)
    const { checking, taken } = useAvailabilityCheck({
        rpc: 'is_email_taken',
        value: email,
        skip: !wellFormed,
        initialValue: '',
    })

    useEffect(() => {
        onTakenChange?.(taken)
    }, [taken, onTakenChange])

    const message = taken ? (
        <>
            {EMAIL_TAKEN_MESSAGE}{' '}
            <Link href="/login" className="underline underline-offset-2">로그인</Link>
            {' · '}
            <Link href="/forgot-password" className="underline underline-offset-2">비밀번호 찾기</Link>
        </>
    ) : checking ? '확인 중...' : '비밀번호 찾기와 안내에 사용됩니다.'

    return (
        <TextField
            id="email" name="email" type="email" placeholder="example@email.com" label="이메일 *"
            required autoComplete="email"
            value={value} onChange={(e) => setValue(e.target.value)}
            aria-invalid={taken}
            message={message}
            messageTone={taken ? 'destructive' : 'muted'}
        />
    )
}
