'use client'

import { useActionState, useState } from 'react'
import { Button } from '@/components/ui/button'
import { AvatarUploadField } from '@/components/auth/avatar-upload-field'
import { NameField } from '@/components/auth/name-field'
import { NicknameField } from '@/components/auth/nickname-field'
import { NICKNAME_TAKEN_MESSAGE } from '@/lib/profile/nickname'
import { PhoneField } from '@/components/auth/phone-field'
import { SignupAccountSection } from '@/components/auth/signup-account-section'
import { SignupTennisSection } from '@/components/auth/signup-tennis-section'
import { signupAction } from '@/lib/actions/auth'

export function SignupForm() {
    const [state, formAction, isPending] = useActionState(signupAction, null)
    // 제출을 잠그는 조건은 대개 **화면만 보고는 알 수 없는 것**이다(중복·불일치).
    // 형식 오류는 필드가 그 자리에서 말하고 서버가 최종 판정한다.
    // 예외는 테니스 정보 미선택 — 보이긴 하지만, 고르지 않으면 저장할 수 없는 값을 서버 왕복으로
    // 알릴 일은 아니다(섹션이 자기 자리에서 이유를 말한다).
    const [pwMismatch, setPwMismatch] = useState(false)
    // 초기값 true — 비밀번호 규칙(Week 60)은 빈 값부터 미충족이다(테니스 정보와 같은 이유)
    const [pwWeak, setPwWeak] = useState(true)
    const [emailTaken, setEmailTaken] = useState(false)
    const [loginIdTaken, setLoginIdTaken] = useState(false)
    const [nicknameTaken, setNicknameTaken] = useState(false)
    // 초기값 true — effect가 돌기 전 한 프레임이라도 열려 있으면 안 된다
    const [tennisMissing, setTennisMissing] = useState(true)
    // 사진이 한계를 넘어 거절된 동안(F-15) — 필드가 input을 비우고 사유를 말한다
    const [avatarError, setAvatarError] = useState(false)
    // 동의 체크도 state로 — 서버 거절 뒤 폼 리셋에 날아가지 않게(F-17)
    const [agreed, setAgreed] = useState(false)

    return (
        <form action={formAction} className="space-y-5">
            {/* ── 프로필 사진 ── */}
            <AvatarUploadField onErrorChange={setAvatarError} />

            <div className="h-px bg-border" />

            {/* ── 계정 (아이디 = 로그인 ID · 이메일 = 복구 채널) ── */}
            <SignupAccountSection
                onMismatchChange={setPwMismatch}
                onWeakChange={setPwWeak}
                onEmailTakenChange={setEmailTaken}
                onLoginIdTakenChange={setLoginIdTaken}
            />

            <div className="h-px bg-border" />

            {/* ── 프로필 ── */}
            <div className="grid grid-cols-2 gap-3 items-start">
                <NameField />
                <NicknameField onTakenChange={setNicknameTaken} serverError={state?.error === NICKNAME_TAKEN_MESSAGE ? state.error : null} />
            </div>

            <PhoneField />

            <div className="h-px bg-border" />

            {/* ── 테니스 정보 (성별·주력손·시작일·NTRP·라켓 — 가입 후 변경 불가) ── */}
            <SignupTennisSection onMissingChange={setTennisMissing} />

            {/* 휴대폰 번호를 받으므로 수집·이용 동의가 필요하다. required로 두어 브라우저가 제출을 막는다. */}
            <label className="flex items-start gap-2 text-caption text-muted-foreground">
                <input type="checkbox" name="agree_privacy" value="true" required className="mt-0.5" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                <span>개인정보 수집·이용에 동의합니다. 이름·닉네임·휴대폰 번호를 클럽 운영과 경기 기록에 사용합니다. *</span>
            </label>

            {/* 닉네임 충돌은 필드가 자기 자리에서 말한다(F-18) — 여기 공통 줄까지 그리면 「사용 가능」과 「이미 사용 중」이 동시에 보인다 */}
            {state?.error && state.error !== NICKNAME_TAKEN_MESSAGE && (
                <p className="text-body2 text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                    {state.error}
                </p>
            )}

            <Button
                type="submit"
                disabled={isPending || pwMismatch || pwWeak || emailTaken || loginIdTaken || nicknameTaken || tennisMissing || avatarError}
                className="w-full h-11 font-semibold mt-2"
            >
                {isPending ? '가입 중...' : '회원가입'}
            </Button>
        </form>
    )
}
