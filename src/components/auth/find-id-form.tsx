'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { FindIdResultCard } from '@/components/auth/find-id-result'
import { findLoginIdAction } from '@/lib/actions/auth'
import { FORM_INPUT_BASE as inputCls, FORM_LABEL_BASE as labelCls } from '@/lib/dashboard/tokens'

/**
 * 아이디 찾기 폼(0086) — 이름 + 이메일. 맞으면 폼 대신 결과 카드를 보인다.
 *
 * 이름 칸은 `NameField`를 쓰지 않는다 — 그 필드의 숫자 금지(0081)는 **가입** 규칙이고, 이름에
 * 숫자가 있는 기존 계정도 찾을 수 있어야 한다. 불일치는 "어느 쪽이 틀렸는지" 말하지 않는다.
 */
export function FindIdForm() {
    const [state, formAction, isPending] = useActionState(findLoginIdAction, null)

    if (state?.result && state.result.kind !== 'none') {
        return <FindIdResultCard result={state.result} />
    }

    const notFound = state?.result?.kind === 'none'

    return (
        <form action={formAction} className="space-y-4">
            <div>
                <label htmlFor="name" className={labelCls}>이름</label>
                <input
                    id="name" name="name" type="text" placeholder="가입할 때 적은 이름"
                    required autoComplete="name" maxLength={20}
                    className={inputCls}
                />
            </div>
            <div>
                <label htmlFor="email" className={labelCls}>이메일</label>
                <input
                    id="email" name="email" type="email" placeholder="name@email.com"
                    required autoComplete="email"
                    className={inputCls}
                />
            </div>

            {(state?.error || notFound) && (
                <p className="text-body2 text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                    {state?.error ?? '입력한 이름과 이메일이 일치하는 회원이 없습니다.'}
                </p>
            )}

            <Button variant="accent" type="submit" disabled={isPending} className="w-full h-11 font-semibold">
                {isPending ? '확인 중...' : '아이디 찾기'}
            </Button>
        </form>
    )
}
