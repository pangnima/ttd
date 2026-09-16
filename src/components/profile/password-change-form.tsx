'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { PasswordRulesHint } from '@/components/auth/password-rules-hint'
import { Button } from '@/components/ui/button'
import { updatePasswordAction } from '@/lib/actions/profile'
import { PASSWORD_MIN_LEN } from '@/lib/auth/password-policy'
import { CARD_BASE, FORM_INPUT_BASE as inputCls, FORM_LABEL_BASE as labelCls } from '@/lib/dashboard/tokens'

export function PasswordChangeForm() {
    const [state, formAction, isPending] = useActionState(updatePasswordAction, null)
    const formRef = useRef<HTMLFormElement>(null)
    // 체크리스트가 입력값을 읽어야 하므로 새 비밀번호만 controlled
    const [newPassword, setNewPassword] = useState('')

    useEffect(() => {
        if (state?.success) formRef.current?.reset()
    }, [state])

    return (
        <form
            ref={formRef}
            action={formAction}
            // reset()이 reset 이벤트를 쏘므로 controlled 값도 여기서 비운다
            onReset={() => setNewPassword('')}
            className={`${CARD_BASE} p-5 sm:p-6 space-y-4`}
        >
            <div>
                <p className="text-body2 font-semibold text-foreground">비밀번호 변경</p>
                <p className="text-body2 text-muted-foreground mt-0.5">현재 비밀번호를 확인 후 새 비밀번호로 변경합니다.</p>
            </div>

            <div className="h-px bg-border" />

            <div>
                <label htmlFor="current_password" className={labelCls}>현재 비밀번호</label>
                <input
                    id="current_password"
                    name="current_password"
                    type="password"
                    placeholder="현재 비밀번호 입력"
                    required
                    autoComplete="current-password"
                    className={inputCls}
                />
            </div>

            <div>
                <label htmlFor="new_password" className={labelCls}>새 비밀번호</label>
                <input
                    id="new_password"
                    name="new_password"
                    type="password"
                    placeholder="영문·숫자·특수문자"
                    required
                    minLength={PASSWORD_MIN_LEN}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={inputCls}
                />
                <PasswordRulesHint value={newPassword} className="mt-1.5" />
            </div>

            <div>
                <label htmlFor="confirm_password" className={labelCls}>새 비밀번호 확인</label>
                <input
                    id="confirm_password"
                    name="confirm_password"
                    type="password"
                    placeholder="새 비밀번호 재입력"
                    required
                    autoComplete="new-password"
                    className={inputCls}
                />
            </div>

            {state?.error && (
                <p className="text-body2 text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                    {state.error}
                </p>
            )}
            {state?.success && (
                <p className="text-body2 text-win bg-win/10 border border-win/20 rounded-md px-3 py-2">
                    비밀번호가 변경되었습니다.
                </p>
            )}

            <Button
                variant="accent"
                type="submit"
                disabled={isPending}
                className="w-full rounded-full font-semibold h-11"
            >
                {isPending ? '변경 중...' : '비밀번호 변경'}
            </Button>
        </form>
    )
}
