'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getUserById } from '@/lib/dummy/users'
import { getStoredProfile, saveProfile } from '@/lib/store/user-store'
import { getCurrentUserId } from '@/lib/store/auth-store'
import type { User } from '@/types'

const NTRP_OPTIONS = [
    '1.0', '1.5', '2.0', '2.5', '3.0', '3.5',
    '4.0', '4.5', '5.0', '5.5', '6.0', '6.5', '7.0',
]

export function ProfileSettingsForm() {
    const [currentUser, setCurrentUser] = useState<User | null>(null)
    const [nickname, setNickname] = useState('')
    const [ntrp, setNtrp] = useState('3.0')
    const [phone, setPhone] = useState('')
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        const id = getCurrentUserId()
        if (!id) return

        const user = getUserById(id)
        if (!user) return

        setCurrentUser(user)
        setNickname(user.nickname)
        setNtrp(user.ntrp.toFixed(1))
        setPhone(user.phone)

        const stored = getStoredProfile()
        if (!stored) return
        if (stored.nickname) setNickname(stored.nickname)
        if (stored.ntrp) setNtrp(stored.ntrp.toFixed(1))
        if (stored.phone) setPhone(stored.phone)
    }, [])

    const handleSave = () => {
        if (!currentUser) return
        const updates: Partial<User> = {
            nickname: nickname.trim() || currentUser.nickname,
            ntrp: parseFloat(ntrp),
            phone: phone.trim(),
        }
        saveProfile(updates)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
    }

    if (!currentUser) {
        return (
            <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    로그인이 필요합니다.
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">프로필 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
                <div className="space-y-1.5">
                    <Label>이름</Label>
                    <Input value={currentUser.name} disabled className="bg-muted/40" />
                    <p className="text-xs text-muted-foreground">
                        이름은 Week 6 인증 연결 후 수정 가능합니다.
                    </p>
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="nickname">닉네임</Label>
                    <Input
                        id="nickname"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        placeholder="닉네임을 입력하세요"
                        maxLength={20}
                    />
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="phone">연락처</Label>
                    <Input
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="010-0000-0000"
                    />
                </div>

                <div className="space-y-1.5">
                    <Label>NTRP 레이팅</Label>
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

                <Button type="button" onClick={handleSave} className="w-full">
                    {saved ? '저장되었습니다 ✓' : '저장하기'}
                </Button>
            </CardContent>
        </Card>
    )
}
