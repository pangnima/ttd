'use client'

import { useEffect, useState } from 'react'
import { EmailField } from '@/components/auth/email-field'
import { FORM_INPUT_BASE as inputCls, FORM_LABEL_BASE as labelCls } from '@/lib/dashboard/tokens'

type Props = {
    /** 제출 버튼을 잠글 때 쓴다. 참조가 고정된 함수를 넘길 것(effect 의존성) */
    onMismatchChange?: (mismatch: boolean) => void
    /** 이메일 중복 — EmailField가 판정해 그대로 올려 보낸다 */
    onEmailTakenChange?: (taken: boolean) => void
}

/**
 * 계정 섹션 — 이메일 + 비밀번호 한 쌍.
 *
 * 비밀번호 두 칸이 controlled인 이유는 서버 에러로 돌아왔을 때 React 19의 form action이
 * 폼을 리셋하기 때문이다(같은 이유가 `signup-tennis-section.tsx` 주석에도 적혀 있다).
 * 검증이 늘수록 실패가 잦아지므로 다시 적게 하는 대가가 커진다.
 */
export function SignupAccountSection({ onMismatchChange, onEmailTakenChange }: Props) {
    const [password, setPassword] = useState('')
    const [passwordConfirm, setPasswordConfirm] = useState('')

    const mismatch = passwordConfirm.length > 0 && password !== passwordConfirm
    useEffect(() => {
        onMismatchChange?.(mismatch)
    }, [mismatch, onMismatchChange])

    return (
        <>
            <EmailField onTakenChange={onEmailTakenChange} />

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label htmlFor="password" className={labelCls}>비밀번호 *</label>
                    <input
                        id="password" name="password" type="password"
                        placeholder="6자 이상" required minLength={6} autoComplete="new-password"
                        value={password} onChange={(e) => setPassword(e.target.value)}
                        className={inputCls}
                    />
                </div>
                <div>
                    <label htmlFor="password_confirm" className={labelCls}>비밀번호 확인 *</label>
                    <input
                        id="password_confirm" name="password_confirm" type="password"
                        placeholder="다시 입력" required autoComplete="new-password"
                        value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)}
                        aria-invalid={mismatch}
                        className={inputCls}
                    />
                </div>
            </div>
            {mismatch && (
                <p className="-mt-3 text-caption text-destructive">비밀번호가 일치하지 않습니다.</p>
            )}
        </>
    )
}
