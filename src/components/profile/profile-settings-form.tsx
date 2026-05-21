'use client'

import { useState, useEffect, useActionState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ImagePlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { updateProfileAction } from '@/lib/actions/profile'
import { CARD_BASE } from '@/lib/dashboard/tokens'

const NTRP_OPTIONS = [
    '1.0', '1.5', '2.0', '2.5', '3.0', '3.5',
    '4.0', '4.5', '5.0', '5.5', '6.0', '6.5', '7.0',
]

const inputCls = [
    'w-full rounded-md px-3 py-2.5 text-sm text-foreground',
    'bg-foreground/[0.04] border border-foreground/10',
    'placeholder:text-foreground/40',
    'outline-none focus:border-foreground/30 focus:bg-foreground/[0.06]',
    'transition-colors',
].join(' ')

const labelCls = 'block text-[11px] font-medium tracking-widest uppercase text-foreground/65 mb-1.5'

const toggleBase = 'py-2 text-xs rounded-md border transition-all'
const toggleActive = 'border-cyan-400/70 bg-cyan-400/15 text-cyan-300 font-semibold'
const toggleInactive = 'border-foreground/15 text-foreground/65 hover:border-foreground/30 hover:text-foreground/85'
const toggleReadonlyActive = 'border-cyan-400/40 bg-cyan-400/10 text-cyan-300/60 font-semibold cursor-default pointer-events-none'
const toggleReadonlyInactive = 'border-foreground/10 text-foreground/30 cursor-default pointer-events-none'

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

export function ProfileSettingsForm() {
    const [profile, setProfile] = useState<ProfileData | null>(null)
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
    const [ntrp, setNtrp] = useState('3.0')
    const [dominantHand, setDominantHand] = useState('right')
    const [statsHidden, setStatsHidden] = useState(false)
    const [state, formAction, isPending] = useActionState(updateProfileAction, null)

    useEffect(() => {
        const supabase = createClient()
        supabase.auth.getUser().then(async ({ data: { user } }) => {
            if (!user) return
            const { data } = await supabase
                .from('users')
                .select('name, nickname, phone, gender, dominant_hand, tennis_start_date, ntrp, profile_image, stats_hidden')
                .eq('id', user.id)
                .single()
            if (data) {
                setProfile(data)
                if (data.ntrp) setNtrp(data.ntrp.toFixed(1))
                if (data.dominant_hand) setDominantHand(data.dominant_hand)
                setStatsHidden(data.stats_hidden ?? false)
            }
        })
    }, [])

    function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        setAvatarPreview(URL.createObjectURL(file))
    }

    if (!profile) {
        return (
            <div className="py-10 text-center text-sm text-foreground/50">
                불러오는 중...
            </div>
        )
    }

    const avatarSrc = avatarPreview ?? profile.profile_image
    const currentGender = profile.gender ?? 'male'

    return (
        <form action={formAction} className={`${CARD_BASE} p-5 sm:p-6 space-y-5`}>
            {/* 프로필 사진 */}
            <div className="space-y-1.5">
                <label className={labelCls}>프로필 사진</label>
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full border border-foreground/10 bg-foreground/5 flex items-center justify-center overflow-hidden shrink-0">
                        {avatarSrc ? (
                            <Image
                                src={avatarSrc}
                                alt="프로필 사진"
                                width={64}
                                height={64}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <span className="text-xl text-foreground/40 font-medium">
                                {profile.nickname?.[0] ?? '?'}
                            </span>
                        )}
                    </div>
                    <div className="space-y-1.5">
                        <label
                            htmlFor="avatar"
                            className="inline-flex items-center gap-1.5 text-xs border border-foreground/20 rounded-full px-3 py-1.5 text-foreground/85 hover:bg-foreground/8 hover:border-foreground/35 transition-colors cursor-pointer"
                        >
                            <ImagePlus className="w-3.5 h-3.5" />
                            이미지 변경
                        </label>
                        <p className="text-xs text-foreground/50">JPG, PNG, WEBP · 최대 5MB</p>
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
                        <span className="normal-case tracking-normal font-normal text-foreground/40">(변경 불가)</span>
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
                    className={`${inputCls} [color-scheme:dark]`}
                />
            </div>

            <div className="space-y-1.5">
                <label className={labelCls}>NTRP 레이팅</label>
                <input type="hidden" name="ntrp" value={ntrp} />
                <Select value={ntrp} onValueChange={(v) => v && setNtrp(v)}>
                    <SelectTrigger className="bg-foreground/[0.04] border-foreground/10 focus:border-foreground/30">
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
                <div className="grid grid-cols-2 gap-1.5">
                    {[
                        { value: false, label: '공개' },
                        { value: true, label: '비공개' },
                    ].map(({ value, label }) => (
                        <button
                            key={label}
                            type="button"
                            onClick={() => setStatsHidden(value)}
                            className={`${toggleBase} ${statsHidden === value ? toggleActive : toggleInactive}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <p className="text-[11px] text-foreground/40 mt-1.5">
                    비공개 시 다른 회원이 내 프로필에서 승률·승무패를 볼 수 없습니다
                </p>
            </div>

            {state?.error && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
                    {state.error}
                </p>
            )}

            <Button
                type="submit"
                disabled={isPending}
                className="w-full rounded-full bg-white text-black hover:bg-foreground/90 font-semibold h-11"
            >
                {isPending ? '저장 중...' : '저장하기'}
            </Button>
        </form>
    )
}
