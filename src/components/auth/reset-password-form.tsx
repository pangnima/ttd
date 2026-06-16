'use client'

import { useActionState, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { resetPasswordAction } from '@/lib/actions/auth'
import { FORM_INPUT_BASE as inputCls, FORM_LABEL_BASE as labelCls } from '@/lib/dashboard/tokens'
import { cn } from '@/lib/utils'

export function ResetPasswordForm() {
    const [state, formAction, isPending] = useActionState(resetPasswordAction, null)
    const [showPassword, setShowPassword] = useState(false)

    return (
        <form action={formAction} className="space-y-4">
            <div>
                <label htmlFor="new_password" className={labelCls}>새 비밀번호</label>
                <div className="relative">
                    <input
                        id="new_password" name="new_password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="6자 이상 입력하세요"
                        required minLength={6} autoComplete="new-password"
                        className={cn(inputCls, 'pr-10')}
                    />
                    <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
                        className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground"
                    >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                </div>
            </div>

            <div>
                <label htmlFor="confirm_password" className={labelCls}>새 비밀번호 확인</label>
                <input
                    id="confirm_password" name="confirm_password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="비밀번호를 다시 입력하세요"
                    required minLength={6} autoComplete="new-password"
                    className={inputCls}
                />
            </div>

            {state?.error && (
                <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                    {state.error}
                </p>
            )}

            <Button type="submit" disabled={isPending} className="w-full h-11 font-semibold">
                {isPending ? '변경 중...' : '비밀번호 변경'}
            </Button>
        </form>
    )
}
