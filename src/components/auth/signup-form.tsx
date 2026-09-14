'use client'

import { useActionState, useState } from 'react'
import { Button } from '@/components/ui/button'
import { AvatarUploadField } from '@/components/auth/avatar-upload-field'
import { NicknameField } from '@/components/auth/nickname-field'
import { PhoneField } from '@/components/auth/phone-field'
import { SignupAccountSection } from '@/components/auth/signup-account-section'
import { SignupTennisSection } from '@/components/auth/signup-tennis-section'
import { signupAction } from '@/lib/actions/auth'
import { NAME_MAX_LEN } from '@/lib/profile/signup-fields'
import { FORM_INPUT_BASE as inputCls, FORM_LABEL_BASE as labelCls } from '@/lib/dashboard/tokens'

export function SignupForm() {
    const [state, formAction, isPending] = useActionState(signupAction, null)
    // 이름은 controlled — 서버 에러로 돌아오면 React 19의 form action이 폼을 리셋한다.
    const [name, setName] = useState('')
    const [pwMismatch, setPwMismatch] = useState(false)
    const [nicknameTaken, setNicknameTaken] = useState(false)

    return (
        <form action={formAction} className="space-y-5">
            {/* ── 프로필 사진 ── */}
            <AvatarUploadField />

            <div className="h-px bg-border" />

            {/* ── 계정 (이메일 = 로그인 아이디) ── */}
            <SignupAccountSection onMismatchChange={setPwMismatch} />

            <div className="h-px bg-border" />

            {/* ── 프로필 ── */}
            <div className="grid grid-cols-2 gap-3 items-start">
                <div>
                    <label htmlFor="name" className={labelCls}>이름 *</label>
                    <input
                        id="name" name="name" placeholder="실명" required
                        maxLength={NAME_MAX_LEN} autoComplete="name"
                        value={name} onChange={(e) => setName(e.target.value)}
                        className={inputCls}
                    />
                </div>
                <NicknameField onTakenChange={setNicknameTaken} />
            </div>

            <PhoneField />

            <div className="h-px bg-border" />

            {/* ── 테니스 정보 (성별·주력손·시작일·NTRP·라켓 — 가입 후 변경 불가) ── */}
            <SignupTennisSection />

            {/* 휴대폰 번호를 받으므로 수집·이용 동의가 필요하다. required로 두어 브라우저가 제출을 막는다. */}
            <label className="flex items-start gap-2 text-caption text-muted-foreground">
                <input type="checkbox" name="agree_privacy" value="true" required className="mt-0.5" />
                <span>개인정보 수집·이용에 동의합니다. 이름·닉네임·휴대폰 번호를 클럽 운영과 경기 기록에 사용합니다. *</span>
            </label>

            {state?.error && (
                <p className="text-body2 text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                    {state.error}
                </p>
            )}

            <Button
                type="submit"
                disabled={isPending || pwMismatch || nicknameTaken}
                className="w-full h-11 font-semibold mt-2"
            >
                {isPending ? '가입 중...' : '회원가입'}
            </Button>
        </form>
    )
}
