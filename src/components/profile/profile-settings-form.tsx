'use client'

import { useState, useEffect, useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { ProfileAvatarField } from '@/components/profile/profile-avatar-field'
import { ProfileReadonlyFields } from '@/components/profile/profile-readonly-fields'
import { RacketField } from '@/components/common/racket-field'
import { NicknameField } from '@/components/auth/nickname-field'
import { PhoneField } from '@/components/auth/phone-field'
import { updateProfileAction } from '@/lib/actions/profile'
import { CARD_BASE, FORM_LABEL_BASE as labelCls } from '@/lib/dashboard/tokens'

// 변경 불가 필드 표시용 (입력 불가, 회색 톤)
const readonlyFieldCls = [
    'w-full rounded-lg px-3 py-3 text-body2 text-muted-foreground',
    'bg-muted/50 border border-input',
].join(' ')


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
}

type Props = {
    initialProfile: ProfileData
    /** 본인 행을 닉네임 중복으로 세지 않기 위해 NicknameField로 내려준다 */
    userId: string
}

export function ProfileSettingsForm({ initialProfile, userId }: Props) {
    const router = useRouter()
    const [statsHidden, setStatsHidden] = useState(initialProfile.stats_hidden ?? false)
    const [state, formAction, isPending] = useActionState(updateProfileAction, null)

    // 저장 성공 시 서버 컴포넌트(레이아웃 헤더 포함) 재렌더 → 닉네임·아바타 즉시 반영
    useEffect(() => {
        if (state?.success) router.refresh()
    }, [state, router])


    return (
        <form action={formAction} className={`${CARD_BASE} p-5 sm:p-6 space-y-5`}>
            <ProfileAvatarField currentImage={initialProfile.profile_image} nickname={initialProfile.nickname} />

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <p className={`${labelCls} flex items-center gap-1.5`}>
                        이름
                        <span className="normal-case tracking-normal font-normal text-muted-foreground">(변경 불가)</span>
                    </p>
                    {/* 이름은 변경 불가 — 표시만, 폼 전송 안 함 */}
                    <div className={readonlyFieldCls}>{initialProfile.name}</div>
                </div>
                <NicknameField defaultValue={initialProfile.nickname} excludeUserId={userId} />
            </div>

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
            <div>
                <p className={labelCls}>전적 통계 공개</p>
                <input type="hidden" name="stats_hidden" value={String(statsHidden)} />
                <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
                    <label htmlFor="stats_public" className="text-body2 text-foreground cursor-pointer">
                        {statsHidden ? '비공개' : '공개'}
                    </label>
                    <Switch
                        id="stats_public"
                        checked={!statsHidden}
                        onCheckedChange={(checked) => setStatsHidden(checked === false)}
                    />
                </div>
                <p className="text-caption text-muted-foreground mt-1.5">
                    비공개 시 다른 회원이 내 프로필에서 승률·승무패를 볼 수 없습니다
                </p>
            </div>

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
