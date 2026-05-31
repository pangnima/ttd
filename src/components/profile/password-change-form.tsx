'use client'

import { useActionState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { updatePasswordAction } from '@/lib/actions/profile'
import { CARD_BASE } from '@/lib/dashboard/tokens'

const inputCls = [
    'w-full rounded-md px-3 py-2.5 text-sm text-foreground',
    'bg-background border border-input',
    'placeholder:text-muted-foreground',
    'outline-none focus:border-ring transition-colors',
].join(' ')

const labelCls = 'block text-[11px] font-medium tracking-widest uppercase text-muted-foreground mb-1.5'

export function PasswordChangeForm() {
    const [state, formAction, isPending] = useActionState(updatePasswordAction, null)
    const formRef = useRef<HTMLFormElement>(null)

    useEffect(() => {
        if (state?.success) formRef.current?.reset()
    }, [state])

    return (
        <form ref={formRef} action={formAction} className={`${CARD_BASE} p-5 sm:p-6 space-y-4`}>
            <div>
                <p className="text-sm font-semibold text-foreground">비밀번호 변경</p>
                <p className="text-xs text-muted-foreground mt-0.5">현재 비밀번호를 확인 후 새 비밀번호로 변경합니다.</p>
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
                    placeholder="6자 이상"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className={inputCls}
                />
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
                <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                    {state.error}
                </p>
            )}
            {state?.success && (
                <p className="text-sm text-emerald-700 bg-emerald-500/10 border border-emerald-500/20 rounded-md px-3 py-2 dark:text-emerald-400">
                    비밀번호가 변경되었습니다.
                </p>
            )}

            <Button
                type="submit"
                disabled={isPending}
                className="w-full rounded-full font-semibold h-11"
            >
                {isPending ? '변경 중...' : '비밀번호 변경'}
            </Button>
        </form>
    )
}
