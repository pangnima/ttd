'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { signupAction } from '@/lib/actions/auth'

export function SignupForm() {
    const [state, formAction, isPending] = useActionState(signupAction, null)
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

    function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        const url = URL.createObjectURL(file)
        setAvatarPreview(url)
    }

    return (
        <form action={formAction} className="space-y-6">
            {/* 프로필 사진 */}
            <div className="flex flex-col items-center gap-2 pb-2">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden border border-border">
                    {avatarPreview ? (
                        <Image
                            src={avatarPreview}
                            alt="프로필 미리보기"
                            width={80}
                            height={80}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <span className="text-2xl text-muted-foreground">👤</span>
                    )}
                </div>
                <Label
                    htmlFor="avatar"
                    className="cursor-pointer text-xs text-muted-foreground underline hover:text-foreground"
                >
                    사진 선택 (선택)
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
                <div className="space-y-2">
                    <Label htmlFor="name">이름 *</Label>
                    <Input id="name" name="name" placeholder="실명" required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="nickname">닉네임 *</Label>
                    <Input id="nickname" name="nickname" placeholder="닉네임" required />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="email">이메일 *</Label>
                <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="example@email.com"
                    required
                    autoComplete="email"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="password">비밀번호 *</Label>
                <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="6자 이상"
                    required
                    minLength={6}
                    autoComplete="new-password"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="phone">연락처</Label>
                <Input id="phone" name="phone" placeholder="010-0000-0000" />
            </div>

            <div className="space-y-2">
                <Label>성별</Label>
                <RadioGroup name="gender" defaultValue="male" className="flex gap-4">
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

            <div className="space-y-2">
                <Label>주력손</Label>
                <RadioGroup name="dominant_hand" defaultValue="right" className="flex gap-4">
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

            <div className="space-y-2">
                <Label htmlFor="tennis_start_date">테니스 시작일</Label>
                <Input
                    id="tennis_start_date"
                    name="tennis_start_date"
                    type="date"
                    max="9999-12-31"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="ntrp">NTRP *</Label>
                <Input
                    id="ntrp"
                    name="ntrp"
                    type="number"
                    min={1.0}
                    max={7.0}
                    step={0.5}
                    defaultValue={3.0}
                    required
                />
                <p className="text-xs text-muted-foreground">1.0 ~ 7.0 (0.5 단위)</p>
            </div>

            {state?.error && (
                <p className="text-sm text-destructive">{state.error}</p>
            )}

            <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? '가입 중...' : '회원가입'}
            </Button>

            <p className="text-sm text-center text-muted-foreground">
                이미 계정이 있으신가요?{' '}
                <Link href="/login" className="underline text-foreground">
                    로그인
                </Link>
            </p>
        </form>
    )
}
