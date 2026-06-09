'use client'

import { useState, useActionState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { ImagePlus } from 'lucide-react'
import { updateProfileAction } from '@/lib/actions/profile'
import { CARD_BASE } from '@/lib/dashboard/tokens'

const NTRP_OPTIONS = [
    '1.0', '1.5', '2.0', '2.5', '3.0', '3.5',
    '4.0', '4.5', '5.0', '5.5', '6.0', '6.5', '7.0',
]

const inputCls = [
    'w-full rounded-md px-3 py-2.5 text-sm text-foreground',
    'bg-background border border-input',
    'placeholder:text-muted-foreground',
    'outline-none focus:border-ring transition-colors',
].join(' ')

const labelCls = 'block text-[11px] font-medium tracking-widest uppercase text-muted-foreground mb-1.5'

const toggleBase = 'py-2 text-xs rounded-md border transition-all'
const toggleActive = 'border-primary bg-primary/10 text-primary font-semibold'
const toggleInactive = 'border-border text-muted-foreground hover:border-input hover:text-foreground'
const toggleReadonlyActive = 'border-primary/40 bg-primary/5 text-primary/60 font-semibold cursor-default pointer-events-none'
const toggleReadonlyInactive = 'border-border text-muted-foreground/50 cursor-default pointer-events-none'

type ProfileData = {
    name: string
    nickname: string
    phone: string | null
    gender: string | null
    dominant_hand: string | null
    tennis_start_date: string | null
    ntrp: number | null
    profile_image: string | null
    stats_hidden: boolean
}

type Props = {
    initialProfile: ProfileData
}

export function ProfileSettingsForm({ initialProfile }: Props) {
    const [profile] = useState<ProfileData>(initialProfile)
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
    const [ntrp, setNtrp] = useState(initialProfile.ntrp ? initialProfile.ntrp.toFixed(1) : '3.0')
    const [dominantHand, setDominantHand] = useState(initialProfile.dominant_hand ?? 'right')
    const [statsHidden, setStatsHidden] = useState(initialProfile.stats_hidden ?? false)
    const [state, formAction, isPending] = useActionState(updateProfileAction, null)

    function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        setAvatarPreview(URL.createObjectURL(file))
    }

    const avatarSrc = avatarPreview ?? profile.profile_image
    const currentGender = profile.gender ?? 'male'

    return (
        <form action={formAction} className={`${CARD_BASE} p-5 sm:p-6 space-y-5`}>
            {/* 프로필 사진 */}
            <div className="space-y-1.5">
                <label className={labelCls}>프로필 사진</label>
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full border border-border bg-muted/50 flex items-center justify-center overflow-hidden shrink-0">
                        {avatarSrc ? (
                            <Image
                                src={avatarSrc}
                                alt="프로필 사진"
                                width={64}
                                height={64}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <span className="text-xl text-muted-foreground font-medium">
                                {profile.nickname?.[0] ?? '?'}
                            </span>
                        )}
                    </div>
                    <div className="space-y-1.5">
                        <label
                            htmlFor="avatar"
                            className="inline-flex items-center gap-1.5 text-xs border border-border rounded-full px-3 py-1.5 text-foreground hover:bg-muted hover:border-input transition-colors cursor-pointer"
                        >
                            <ImagePlus className="w-3.5 h-3.5" />
                            이미지 변경
                        </label>
                        <p className="text-xs text-muted-foreground">JPG, PNG, WEBP · 최대 5MB</p>
                        <input
                            id="avatar"
                            name="avatar"
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={handleAvatarChange}
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label htmlFor="name" className={labelCls}>이름</label>
                    <input
                        id="name"
                        name="name"
                        defaultValue={profile.name}
                        required
                        className={inputCls}
                    />
                </div>
                <div>
                    <label htmlFor="nickname" className={labelCls}>닉네임</label>
                    <input
                        id="nickname"
                        name="nickname"
                        defaultValue={profile.nickname}
                        required
                        className={inputCls}
                    />
                </div>
            </div>

            <div>
                <label htmlFor="phone" className={labelCls}>연락처</label>
                <input
                    id="phone"
                    name="phone"
                    defaultValue={profile.phone ?? ''}
                    placeholder="010-0000-0000"
                    className={inputCls}
                />
            </div>

            {/* 성별(수정 불가) + 주력손 */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <p className={`${labelCls} flex items-center gap-1.5`}>
                        성별
                        <span className="normal-case tracking-normal font-normal text-muted-foreground">(변경 불가)</span>
                    </p>
                    {/* 성별은 서버에 저장된 값을 그대로 전달 */}
                    <input type="hidden" name="gender" value={currentGender} />
                    <div className="grid grid-cols-2 gap-1.5">
                        {[{ value: 'male', label: '남성' }, { value: 'female', label: '여성' }].map(({ value, label }) => (
                            <div
                                key={value}
                                className={`${toggleBase} text-center ${
                                    currentGender === value ? toggleReadonlyActive : toggleReadonlyInactive
                                }`}
                            >
                                {label}
                            </div>
                        ))}
                    </div>
                </div>
                <div>
                    <p className={labelCls}>주력손</p>
                    <input type="hidden" name="dominant_hand" value={dominantHand} />
                    <div className="grid grid-cols-2 gap-1.5">
                        {[{ value: 'right', label: '오른손' }, { value: 'left', label: '왼손' }].map(({ value, label }) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setDominantHand(value)}
                                className={`${toggleBase} ${dominantHand === value ? toggleActive : toggleInactive}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div>
                <label htmlFor="tennis_start_date" className={labelCls}>테니스 시작일</label>
                <input
                    id="tennis_start_date"
                    name="tennis_start_date"
                    type="date"
                    defaultValue={profile.tennis_start_date ?? ''}
                    className={inputCls}
                />
            </div>

            <div className="space-y-1.5">
                <label className={labelCls}>NTRP 레이팅</label>
                <input type="hidden" name="ntrp" value={ntrp} />
                <Select
                    value={ntrp}
                    onValueChange={(v) => v && setNtrp(v)}
                    items={NTRP_OPTIONS.map((v) => ({ value: v, label: `NTRP ${v}` }))}
                >
                    <SelectTrigger className="bg-background border-input focus:border-ring">
                        <SelectValue placeholder="NTRP 선택" />
                    </SelectTrigger>
                    <SelectContent>
                        {NTRP_OPTIONS.map((v) => (
                            <SelectItem key={v} value={v}>NTRP {v}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

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
                <p className="text-[11px] text-muted-foreground mt-1.5">
                    비공개 시 다른 회원이 내 프로필에서 승률·승무패를 볼 수 없습니다
                </p>
            </div>

            {state?.error && (
                <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                    {state.error}
                </p>
            )}

            <Button
                type="submit"
                disabled={isPending}
                className="w-full rounded-full font-semibold h-11"
            >
                {isPending ? '저장 중...' : '저장하기'}
            </Button>
        </form>
    )
}
