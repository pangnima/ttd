'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { requestPasswordResetAction } from '@/lib/actions/auth'
import { FORM_INPUT_BASE as inputCls, FORM_LABEL_BASE as labelCls } from '@/lib/dashboard/tokens'

export function ForgotPasswordForm() {
    const [state, formAction, isPending] = useActionState(requestPasswordResetAction, null)

    // 전송 성공 시 폼 대신 안내 문구만 노출 (계정 존재 여부는 노출하지 않음)
    if (state?.success) {
        return (
            <div className="rounded-md border border-border bg-muted/40 px-4 py-5 text-body text-foreground/80">
                입력한 정보가 가입되어 있다면 가입한 이메일로 비밀번호 재설정 링크를 보냈습니다.
                메일함을 확인해 주세요.
            </div>
        )
    }

    return (
        <form action={formAction} className="space-y-4">
            <div>
                <label htmlFor="identifier" className={labelCls}>아이디</label>
                {/* 로그인 칸과 같은 해석(Week 61) — 아이디면 서버가 가입 이메일로 풀어 그쪽으로 보낸다 */}
                <input
                    id="identifier" name="identifier" type="text" placeholder="아이디를 입력하세요"
                    required autoComplete="username" autoCapitalize="none" spellCheck={false}
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
