'use client'

import { useActionState } from 'react'

import { Button } from '@/components/ui/button'
import { requestPasswordResetAction } from '@/lib/actions/auth'
import { FORM_INPUT_BASE as inputCls, FORM_LABEL_BASE as labelCls } from '@/lib/dashboard/tokens'

export function ForgotPasswordForm() {
    const [state, formAction, isPending] = useActionState(requestPasswordResetAction, null)

    // 전송 성공 시 폼 대신 안내 문구만 노출 (이메일 존재 여부는 노출하지 않음)
    if (state?.success) {
        return (
            <div className="rounded-md border border-border bg-muted/40 px-4 py-5 text-body text-foreground/80">
                입력하신 이메일이 가입되어 있다면 비밀번호 재설정 링크를 보냈습니다.
                메일함을 확인해 주세요.
            </div>
        )
    }

    return (
        <form action={formAction} className="space-y-4">
            <div>
                <label htmlFor="email" className={labelCls}>이메일</label>
                <input
                    id="email" name="email" type="email"
                    placeholder="name@email.com"
                    required autoComplete="email"
                    className={inputCls}
                />
            </div>

            {state?.error && (
                <p className="text-body2 text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                    {state.error}
                </p>
            )}

            <Button type="submit" disabled={isPending} className="w-full h-11 font-semibold">
                {isPending ? '전송 중...' : '재설정 링크 보내기'}
            </Button>
        </form>
    )
}
