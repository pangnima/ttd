'use client'

import { useState, useEffect, useActionState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { ImagePlus, Shuffle } from 'lucide-react'
import { ProfileReadonlyFields } from '@/components/profile/profile-readonly-fields'
import { RacketField } from '@/components/common/racket-field'
import { updateProfileAction } from '@/lib/actions/profile'
import { DEFAULT_AVATAR_PATHS } from '@/lib/default-images'
import { CARD_BASE, FORM_INPUT_BASE as inputCls, FORM_LABEL_BASE as labelCls } from '@/lib/dashboard/tokens'

// 변경 불가 필드 표시용 (입력 불가, 회색 톤)
const readonlyFieldCls = [
    'w-full rounded-lg px-3 py-3 text-sm text-muted-foreground',
    'bg-muted/50 border border-input',
].join(' ')

const pillBtnCls = 'inline-flex items-center gap-1.5 text-xs border border-border rounded-full px-3 py-1.5 text-foreground hover:bg-muted hover:border-input transition-colors cursor-pointer'

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
}

export function ProfileSettingsForm({ initialProfile }: Props) {
    const router = useRouter()
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
    // "기본 이미지로 변경"으로 선택한 기본 아바타 경로 (null이면 미선택)
    const [defaultAvatar, setDefaultAvatar] = useState<string | null>(null)
    const [statsHidden, setStatsHidden] = useState(initialProfile.stats_hidden ?? false)
    const [state, formAction, isPending] = useActionState(updateProfileAction, null)

    // 저장 성공 시 서버 컴포넌트(레이아웃 헤더 포함) 재렌더 → 닉네임·아바타 즉시 반영
    useEffect(() => {
        if (state?.success) router.refresh()
    }, [state, router])

    function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        // 파일 업로드는 기본 이미지 선택보다 우선
        setDefaultAvatar(null)
        setAvatarPreview(URL.createObjectURL(file))
    }

    // 클릭마다 직전과 다른 기본 아바타로 셔플
    function handleShuffleDefault() {
        const candidates = DEFAULT_AVATAR_PATHS.filter((p) => p !== defaultAvatar)
        const next = candidates[Math.floor(Math.random() * candidates.length)]
        setDefaultAvatar(next)
        setAvatarPreview(next)
    }

    const avatarSrc = avatarPreview ?? initialProfile.profile_image

    return (
        <form action={formAction} className={`${CARD_BASE} p-5 sm:p-6 space-y-5`}>
            {/* 프로필 사진 */}
            <div className="space-y-1.5">
                <label className={labelCls}>프로필 사진</label>
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full border border-border bg-muted/50 flex items-center justify-center overflow-hidden shrink-0">
                        {avatarSrc ? (
                            <Image src={avatarSrc} alt="프로필 사진" width={64} height={64} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-xl text-muted-foreground font-medium">
                                {initialProfile.nickname?.[0] ?? '?'}
                            </span>
                        )}
                    </div>
                    <div className="space-y-1.5">
                        {/* 업로드 없이 기본 이미지로 변경한 경우 그 경로를 서버로 전달 */}
                        <input type="hidden" name="default_avatar" value={defaultAvatar ?? ''} />
                        <div className="flex flex-wrap items-center gap-1.5">
                            <label htmlFor="avatar" className={pillBtnCls}>
                                <ImagePlus className="w-3.5 h-3.5" />
                                이미지 변경
                            </label>
                            <button type="button" onClick={handleShuffleDefault} className={pillBtnCls}>
                                <Shuffle className="w-3.5 h-3.5" />
                                기본 이미지로 변경
                            </button>
                        </div>
                        <p className="text-xs text-muted-foreground">JPG, PNG, WEBP · 최대 5MB</p>
                        <input
                            id="avatar" name="avatar" type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={handleAvatarChange}
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <p className={`${labelCls} flex items-center gap-1.5`}>
                        이름
                        <span className="normal-case tracking-normal font-normal text-muted-foreground">(변경 불가)</span>
                    </p>
                    {/* 이름은 변경 불가 — 표시만, 폼 전송 안 함 */}
                    <div className={readonlyFieldCls}>{initialProfile.name}</div>
                </div>
                <div>
                    <label htmlFor="nickname" className={labelCls}>닉네임</label>
                    <input id="nickname" name="nickname" defaultValue={initialProfile.nickname} required className={inputCls} />
                </div>
            </div>

            <div>
                <label htmlFor="phone" className={labelCls}>연락처</label>
                <input id="phone" name="phone" defaultValue={initialProfile.phone ?? ''} placeholder="010-0000-0000" className={inputCls} />
            </div>

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
                    <label htmlFor="stats_public" className="text-sm text-foreground cursor-pointer">
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
                <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                    {state.error}
                </p>
            )}

            <Button type="submit" disabled={isPending} className="w-full rounded-full font-semibold h-11">
                {isPending ? '저장 중...' : '저장하기'}
            </Button>
        </form>
    )
}
