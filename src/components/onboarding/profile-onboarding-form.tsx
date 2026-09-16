'use client'

import { useActionState, useState } from 'react'

import { Button } from '@/components/ui/button'
import { AvatarUploadField } from '@/components/auth/avatar-upload-field'
import { NameField } from '@/components/auth/name-field'
import { NicknameField } from '@/components/auth/nickname-field'
import { NICKNAME_TAKEN_MESSAGE } from '@/lib/profile/nickname'
import { PhoneField } from '@/components/auth/phone-field'
import { SignupTennisSection } from '@/components/auth/signup-tennis-section'
import { completeProfileAction } from '@/lib/actions/onboarding'

type Props = {
    /** 로그인 전 가려던 곳 — 완성 후 그리로 보낸다(초대 링크로 들어와 소셜로 가입한 경우) */
    next?: string
    /** 트리거가 provider 표시명에서 넣은 이름 — 여기서 한 번 고칠 수 있다 */
    defaultName: string
    /** 트리거가 만든 임시 닉네임 — 사용자가 고쳐 쓰도록 미리 채운다 */
    defaultNickname: string
    /** provider가 준 사진 — 손대지 않으면 그대로 유지된다 */
    defaultProfileImage: string | null
    /** 자기 행을 중복으로 세지 않기 위해 */
    userId: string
    /** 이미 있는 값은 미리 채운다(U-2) — 완성 액션이 무조건 update하므로 비워 두면 null로 덮어쓴다 */
    defaultPhone?: string
    defaultRacket?: { brand: string | null; model: string | null }
}

/**
 * 소셜 가입자의 프로필 완성 폼.
 *
 * 필드는 **가입 폼의 것을 그대로 쓴다**(`AvatarUploadField`·`NameField`·`NicknameField`·`PhoneField`·`SignupTennisSection`) —
 * 새로 만들면 두 경로의 검증이 갈린다. 특히 테니스 섹션은 상태와 hidden input을 자체 소유해
 * 부모가 값을 알 필요가 없다.
 *
 * 취소 버튼은 두지 않는다 — 여기는 되돌아갈 곳이 없는 한 방향 화면이다(`FormActions`가 아니라
 * 가입 폼과 같은 전폭 버튼을 쓰는 이유). 대신 다른 계정으로 들어온 사람을 위해 로그아웃을 남긴다.
 */
export function ProfileOnboardingForm({ next, defaultName, defaultNickname, defaultProfileImage, userId, defaultPhone = '', defaultRacket }: Props) {
    const [state, formAction, isPending] = useActionState(completeProfileAction, null)
    const [nicknameTaken, setNicknameTaken] = useState(false)
    // 초기값 true — effect가 돌기 전 한 프레임이라도 열려 있으면 안 된다
    const [tennisMissing, setTennisMissing] = useState(true)
    const [avatarError, setAvatarError] = useState(false)
    const [agreed, setAgreed] = useState(false)

    return (
        <form action={formAction} className="space-y-5">
            {next && <input type="hidden" name="next" value={next} />}

            {/* ── 프로필 사진 ── provider 사진을 지키되 바꿀 수도 있게 */}
            <AvatarUploadField initialImage={defaultProfileImage} onErrorChange={setAvatarError} />

            <div className="h-px bg-border" />

            {/* ── 프로필 ── 이름은 트리거가 provider 표시명에서 넣은 값이라 여기서 한 번 고칠 수 있다 */}
            <div className="grid grid-cols-2 gap-3 items-start">
                <NameField defaultValue={defaultName} />
                <NicknameField
                    defaultValue={defaultNickname}
                    excludeUserId={userId}
                    onTakenChange={setNicknameTaken}
                    serverError={state?.error === NICKNAME_TAKEN_MESSAGE ? state.error : null}
                />
            </div>

            <PhoneField defaultValue={defaultPhone} />

            <div className="h-px bg-border" />

            <SignupTennisSection onMissingChange={setTennisMissing} initialRacket={defaultRacket} />

            {/* 가입 폼과 같은 동의 — 소셜 경로만 건너뛰고 있었다(수집하는 정보는 같다) */}
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
                variant="accent"
                type="submit"
                disabled={isPending || nicknameTaken || tennisMissing || avatarError}
                className="w-full h-11 font-semibold mt-2"
            >
                {isPending ? '가입 중...' : '회원가입'}
            </Button>
        </form>
    )
}
