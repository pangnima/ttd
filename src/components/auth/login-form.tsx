'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { loginAction } from '@/lib/actions/auth'
import { FORM_INPUT_BASE as inputCls, FORM_LABEL_BASE as labelCls } from '@/lib/dashboard/tokens'

export function LoginForm() {
    const [state, formAction, isPending] = useActionState(loginAction, null)

    return (
        <form action={formAction} className="space-y-4">
            <div>
                <label htmlFor="email" className={labelCls}>이메일</label>
                <input
                    id="email" name="email" type="email"
                    placeholder="example@email.com"
                    required autoComplete="email"
                    className={inputCls}
                />
            </div>

            <div>
                <label htmlFor="password" className={labelCls}>비밀번호</label>
                <input
                    id="password" name="password" type="password"
                    placeholder="비밀번호를 입력하세요"
                    required autoComplete="current-password"
                    className={inputCls}
                />
            </div>

            {state?.error && (
                <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                    {state.error}
                </p>
            )}

            <Button
                type="submit"
                disabled={isPending}
                className="w-full rounded-full font-semibold h-11 mt-2"
            >
                {isPending ? '로그인 중...' : '로그인'}
            </Button>
        </form>
    )
}
