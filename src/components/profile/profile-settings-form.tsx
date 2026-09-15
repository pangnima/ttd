'use client'

import { useEffect, useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ProfileAvatarField } from '@/components/profile/profile-avatar-field'
import { ProfileReadonlyFields } from '@/components/profile/profile-readonly-fields'
import { RacketField } from '@/components/common/racket-field'
import { ProfileIdentityFields } from '@/components/profile/profile-identity-fields'
import { PhoneField } from '@/components/auth/phone-field'
import { updateProfileAction } from '@/lib/actions/profile'
import { StatsVisibilityField } from '@/components/profile/stats-visibility-field'
import { CARD_BASE } from '@/lib/dashboard/tokens'

type ProfileData = {
    name: string
    nickname: string
    phone: string | null
    gender: string | null
    dominant_hand: string | null
    tennis_start_date: string | null
    ntrp: number | null
    racket_brand: string | null
    racket_model: string | null
    profile_image: string | null
    stats_hidden: boolean
    /** 0085 — null이면 아직 없다 */
    login_id: string | null
}

type Props = {
    initialProfile: ProfileData
    /** 본인 행을 닉네임 중복으로 세지 않기 위해 NicknameField로 내려준다 */
    userId: string
    /** 비밀번호 identity가 있는 계정만 아이디를 1회 설정할 수 있다(페이지가 판정해 내려준다) */
    canSetLoginId: boolean
}

export function ProfileSettingsForm({ initialProfile, userId, canSetLoginId }: Props) {
    const router = useRouter()
    const [state, formAction, isPending] = useActionState(updateProfileAction, null)

    // 저장 성공 시 서버 컴포넌트(레이아웃 헤더 포함) 재렌더 → 닉네임·아바타 즉시 반영
    useEffect(() => {
        if (state?.success) router.refresh()
    }, [state, router])

    return (
        <form action={formAction} className={`${CARD_BASE} p-5 sm:p-6 space-y-5`}>
            <ProfileAvatarField currentImage={initialProfile.profile_image} nickname={initialProfile.nickname} />

            <ProfileIdentityFields
                name={initialProfile.name}
                nickname={initialProfile.nickname}
                loginId={initialProfile.login_id}
                canSetLoginId={canSetLoginId}
                userId={userId}
            />

            <PhoneField defaultValue={initialProfile.phone ?? ''} />

            {/* 가입 시 1회 입력한 테니스 정보 — 표시만, 폼 전송 안 함 */}
            <ProfileReadonlyFields
                gender={initialProfile.gender}
                dominantHand={initialProfile.dominant_hand}
                tennisStartDate={initialProfile.tennis_start_date}
                ntrp={initialProfile.ntrp}
            />

            {/* 주력 라켓 — 수정 가능 */}
            <RacketField initialBrand={initialProfile.racket_brand} initialModel={initialProfile.racket_model} />

            {/* 전적 통계 공개 여부 */}
            <StatsVisibilityField initialHidden={initialProfile.stats_hidden ?? false} />

            {state?.error && (
                <p className="text-body2 text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                    {state.error}
                </p>
            )}

            <Button type="submit" disabled={isPending} className="w-full rounded-full font-semibold h-11">
                {isPending ? '저장 중...' : '저장하기'}
            </Button>
        </form>
    )
}
