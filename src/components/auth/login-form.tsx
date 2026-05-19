'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { loginAction } from '@/lib/actions/auth'

const inputCls = [
    'w-full rounded-md px-3 py-2.5 text-sm text-foreground',
    'bg-foreground/[0.04] border border-foreground/10',
    'placeholder:text-foreground/40',
    'outline-none focus:border-foreground/30 focus:bg-foreground/[0.06]',
    'transition-colors',
].join(' ')

const labelCls = 'block text-[11px] font-medium tracking-widest uppercase text-foreground/65 mb-1.5'

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
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
                    {state.error}
                </p>
            )}

            <Button
                type="submit"
                disabled={isPending}
                className="w-full rounded-full bg-white text-black hover:bg-foreground/90 font-semibold h-11 mt-2"
            >
                {isPending ? '로그인 중...' : '로그인'}
            </Button>
        </form>
    )
}
