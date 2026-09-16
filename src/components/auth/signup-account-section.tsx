'use client'

import { useEffect, useState } from 'react'
import { EmailField } from '@/components/auth/email-field'
import { LoginIdField } from '@/components/auth/login-id-field'
import { PasswordRulesHint } from '@/components/auth/password-rules-hint'
import { PASSWORD_MIN_LEN, unmetPasswordRules } from '@/lib/auth/password-policy'
import { TextField } from '@/components/common/text-field'

type Props = {
    /** 제출 버튼을 잠글 때 쓴다. 참조가 고정된 함수를 넘길 것(effect 의존성) */
    onMismatchChange?: (mismatch: boolean) => void
    /** 비밀번호 규칙 미충족 — 체크리스트와 같은 함수로 판정해 제출을 잠근다 */
    onWeakChange?: (weak: boolean) => void
    /** 이메일 중복 — EmailField가 판정해 그대로 올려 보낸다 */
    onEmailTakenChange?: (taken: boolean) => void
    /** 아이디 중복 — LoginIdField가 판정해 그대로 올려 보낸다(0085) */
    onLoginIdTakenChange?: (taken: boolean) => void
}

/**
 * 계정 섹션 — 아이디·이메일·비밀번호(0085부터 로그인 ID는 아이디고 이메일은 복구 채널이다).
 *
 * 비밀번호 두 칸이 controlled인 이유는 서버 에러로 돌아왔을 때 React 19의 form action이
 * 폼을 리셋하기 때문이다(같은 이유가 `signup-tennis-section.tsx` 주석에도 적혀 있다).
 * 검증이 늘수록 실패가 잦아지므로 다시 적게 하는 대가가 커진다.
 */
export function SignupAccountSection({ onMismatchChange, onWeakChange, onEmailTakenChange, onLoginIdTakenChange }: Props) {
    const [password, setPassword] = useState('')
    const [passwordConfirm, setPasswordConfirm] = useState('')

    const mismatch = passwordConfirm.length > 0 && password !== passwordConfirm
    useEffect(() => {
        onMismatchChange?.(mismatch)
    }, [mismatch, onMismatchChange])

    // 빈 값도 '미충족'이다 — 서버가 어차피 거절하는 제출을 열어 둘 이유가 없다(테니스 정보 잠금과 같은 극성)
    const weak = unmetPasswordRules(password).length > 0
    useEffect(() => {
        onWeakChange?.(weak)
    }, [weak, onWeakChange])

    return (
        <>
            <LoginIdField onTakenChange={onLoginIdTakenChange} />
            <EmailField onTakenChange={onEmailTakenChange} />

            <div className="grid grid-cols-2 gap-3">
                <TextField
                    id="password" name="password" type="password" label="비밀번호 *"
                    placeholder="영문·숫자·특수문자" required minLength={PASSWORD_MIN_LEN} autoComplete="new-password"
                    value={password} onChange={(e) => setPassword(e.target.value)}
                />
                <TextField
                    id="password_confirm" name="password_confirm" type="password" label="비밀번호 확인 *"
                    placeholder="다시 입력" required autoComplete="new-password"
                    value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)}
                    aria-invalid={mismatch}
                />
            </div>
            <PasswordRulesHint value={password} className="-mt-3" />
            {mismatch && (
                <p className="-mt-3 text-caption text-destructive">비밀번호가 일치하지 않습니다.</p>
            )}
        </>
    )
}
