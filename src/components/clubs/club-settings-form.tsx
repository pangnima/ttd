'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { getStoredClubs, saveClub } from '@/lib/store/club-store'
import type { Club } from '@/types'

type ClubSettingsFormProps = {
    club: Club
}

export function ClubSettingsForm({ club }: ClubSettingsFormProps) {
    const [name, setName] = useState(club.name)
    const [description, setDescription] = useState(club.description)
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        const stored = getStoredClubs().find((c) => c.id === club.id)
        if (!stored) return
        setName(stored.name)
        setDescription(stored.description)
    }, [club.id])

    const handleSave = () => {
        saveClub({
            ...club,
            name: name.trim() || club.name,
            description: description.trim(),
        })
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
                <div className="space-y-1.5">
                    <Label htmlFor="club-name">클럽 이름</Label>
                    <Input
                        id="club-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="클럽 이름을 입력하세요"
                        maxLength={30}
                    />
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="club-description">클럽 소개</Label>
                    <Textarea
                        id="club-description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="클럽 소개를 입력해주세요."
                        rows={4}
                        maxLength={200}
                    />
                </div>

                <Button type="button" onClick={handleSave} className="w-full">
                    {saved ? '저장되었습니다 ✓' : '저장하기'}
                </Button>
            </CardContent>
        </Card>
    )
}
