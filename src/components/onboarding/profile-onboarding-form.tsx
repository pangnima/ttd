'use client'

import { useActionState, useState } from 'react'

import { Button } from '@/components/ui/button'
import { NicknameField } from '@/components/auth/nickname-field'
import { PhoneField } from '@/components/auth/phone-field'
import { SignupTennisSection } from '@/components/auth/signup-tennis-section'
import { completeProfileAction } from '@/lib/actions/onboarding'

type Props = {
    /** 로그인 전 가려던 곳 — 완성 후 그리로 보낸다(초대 링크로 들어와 소셜로 가입한 경우) */
    next?: string
    /** 트리거가 만든 임시 닉네임 — 사용자가 고쳐 쓰도록 미리 채운다 */
    defaultNickname: string
    /** 자기 행을 중복으로 세지 않기 위해 */
    userId: string
}

/**
 * 소셜 가입자의 프로필 완성 폼.
 *
 * 필드는 **가입 폼의 것을 그대로 쓴다**(`SignupTennisSection`·`NicknameField`·`PhoneField`) —
 * 새로 만들면 두 경로의 검증이 갈린다. 특히 테니스 섹션은 상태와 hidden input을 자체 소유해
 * 부모가 값을 알 필요가 없다.
 *
 * 취소 버튼은 두지 않는다 — 여기는 되돌아갈 곳이 없는 한 방향 화면이다(`FormActions`가 아니라
 * 가입 폼과 같은 전폭 버튼을 쓰는 이유). 대신 다른 계정으로 들어온 사람을 위해 로그아웃을 남긴다.
 */
export function ProfileOnboardingForm({ next, defaultNickname, userId }: Props) {
    const [state, formAction, isPending] = useActionState(completeProfileAction, null)
    const [nicknameTaken, setNicknameTaken] = useState(false)

    return (
        <form action={formAction} className="space-y-5">
            {next && <input type="hidden" name="next" value={next} />}

            <NicknameField
                defaultValue={defaultNickname}
                excludeUserId={userId}
                onTakenChange={setNicknameTaken}
            />
            <PhoneField />

            <SignupTennisSection />

            {state?.error && (
                <p className="text-body2 text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                    {state.error}
                </p>
            )}

            <Button
                type="submit"
                disabled={isPending || nicknameTaken}
                className="w-full h-11 font-semibold mt-2"
            >
                {isPending ? '저장 중...' : '시작하기'}
            </Button>
        </form>
    )
}
