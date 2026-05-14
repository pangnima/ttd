'use client'

import { useState, useEffect, useActionState } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { updateProfileAction } from '@/lib/actions/profile'

const NTRP_OPTIONS = [
    '1.0', '1.5', '2.0', '2.5', '3.0', '3.5',
    '4.0', '4.5', '5.0', '5.5', '6.0', '6.5', '7.0',
]

type ProfileData = {
    name: string
    nickname: string
    phone: string | null
    gender: string | null
    dominant_hand: string | null
    tennis_start_date: string | null
    ntrp: number | null
    profile_image: string | null
}

export function ProfileSettingsForm() {
    const [profile, setProfile] = useState<ProfileData | null>(null)
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
    const [ntrp, setNtrp] = useState('3.0')
    const [gender, setGender] = useState('male')
    const [dominantHand, setDominantHand] = useState('right')
    const [state, formAction, isPending] = useActionState(updateProfileAction, null)

    useEffect(() => {
        const supabase = createClient()
        supabase.auth.getUser().then(async ({ data: { user } }) => {
            if (!user) return
            const { data } = await supabase
                .from('users')
                .select('name, nickname, phone, gender, dominant_hand, tennis_start_date, ntrp, profile_image')
                .eq('id', user.id)
                .single()
            if (data) {
                setProfile(data)
                if (data.ntrp) setNtrp(data.ntrp.toFixed(1))
                if (data.gender) setGender(data.gender)
                if (data.dominant_hand) setDominantHand(data.dominant_hand)
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
            <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    불러오는 중...
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">프로필 정보</CardTitle>
            </CardHeader>
            <CardContent>
                <form action={formAction} className="space-y-5">
                    {/* 프로필 사진 */}
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-20 h-20 rounded-full overflow-hidden border border-border bg-muted flex items-center justify-center">
                            {(avatarPreview ?? profile.profile_image) ? (
                                <Image
                                    src={avatarPreview ?? profile.profile_image!}
                                    alt="프로필 사진"
                                    width={80}
                                    height={80}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <span className="text-2xl text-muted-foreground">
                                    {profile.nickname?.[0] ?? '?'}
                                </span>
                            )}
                        </div>
                        <Label
                            htmlFor="avatar"
                            className="cursor-pointer text-xs text-muted-foreground underline hover:text-foreground"
                        >
                            사진 변경
                        </Label>
                        <Input
                            id="avatar"
                            name="avatar"
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={handleAvatarChange}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="name">이름</Label>
                            <Input
                                id="name"
                                name="name"
                                defaultValue={profile.name}
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="nickname">닉네임</Label>
                            <Input
                                id="nickname"
                                name="nickname"
                                defaultValue={profile.nickname}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="phone">연락처</Label>
                        <Input
                            id="phone"
                            name="phone"
                            defaultValue={profile.phone ?? ''}
                            placeholder="010-0000-0000"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label>성별</Label>
                        <input type="hidden" name="gender" value={gender} />
                        <RadioGroup value={gender} onValueChange={setGender} className="flex gap-4">
                            <div className="flex items-center gap-1.5">
                                <RadioGroupItem value="male" id="gender-male" />
                                <Label htmlFor="gender-male" className="font-normal cursor-pointer">남성</Label>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <RadioGroupItem value="female" id="gender-female" />
                                <Label htmlFor="gender-female" className="font-normal cursor-pointer">여성</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    <div className="space-y-1.5">
                        <Label>주력손</Label>
                        <input type="hidden" name="dominant_hand" value={dominantHand} />
                        <RadioGroup value={dominantHand} onValueChange={setDominantHand} className="flex gap-4">
                            <div className="flex items-center gap-1.5">
                                <RadioGroupItem value="right" id="hand-right" />
                                <Label htmlFor="hand-right" className="font-normal cursor-pointer">오른손</Label>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <RadioGroupItem value="left" id="hand-left" />
                                <Label htmlFor="hand-left" className="font-normal cursor-pointer">왼손</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="tennis_start_date">테니스 시작일</Label>
                        <Input
                            id="tennis_start_date"
                            name="tennis_start_date"
                            type="date"
                            defaultValue={profile.tennis_start_date ?? ''}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label>NTRP 레이팅</Label>
                        <input type="hidden" name="ntrp" value={ntrp} />
                        <Select value={ntrp} onValueChange={(v) => v && setNtrp(v)}>
                            <SelectTrigger>
                                <SelectValue placeholder="NTRP 선택" />
                            </SelectTrigger>
                            <SelectContent>
                                {NTRP_OPTIONS.map((v) => (
                                    <SelectItem key={v} value={v}>NTRP {v}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {state?.error && (
                        <p className="text-sm text-destructive">{state.error}</p>
                    )}

                    {state === null && !isPending && (
                        <></>
                    )}

                    <Button type="submit" className="w-full" disabled={isPending}>
                        {isPending ? '저장 중...' : '저장하기'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}
