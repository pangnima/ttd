'use client'

import { useActionState, useTransition, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button, buttonVariants } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { updateClubAction, deleteClubAction } from '@/lib/actions/clubs'
import type { Club } from '@/types'

type ClubSettingsFormProps = {
    club: Club
}

export function ClubSettingsForm({ club }: ClubSettingsFormProps) {
    const [state, formAction, isSaving] = useActionState(updateClubAction, null)
    const [isDeleting, startDelete] = useTransition()
    const [isPublic, setIsPublic] = useState(club.isPublic)

    const handleDelete = () => {
        if (!confirm(`"${club.name}" 클럽을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return
        startDelete(async () => { await deleteClubAction(club.id) })
    }

    return (
        <div className="space-y-4">
            <form action={formAction}>
                <input type="hidden" name="club_id" value={club.id} />
                <input type="hidden" name="is_public" value={isPublic ? 'true' : 'false'} />

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">기본 정보</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div className="space-y-1.5">
                            <Label htmlFor="club-name">클럽 이름</Label>
                            <Input
                                id="club-name"
                                name="name"
                                defaultValue={club.name}
                                placeholder="클럽 이름을 입력하세요"
                                maxLength={30}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="club-description">클럽 소개</Label>
                            <Textarea
                                id="club-description"
                                name="description"
                                defaultValue={club.description}
                                placeholder="클럽 소개를 입력해주세요."
                                rows={4}
                                maxLength={200}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label>공개 여부</Label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsPublic(true)}
                                    className={cn(
                                        buttonVariants({ variant: isPublic ? 'default' : 'outline', size: 'sm' }),
                                        'flex-1'
                                    )}
                                >
                                    공개
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsPublic(false)}
                                    className={cn(
                                        buttonVariants({ variant: !isPublic ? 'default' : 'outline', size: 'sm' }),
                                        'flex-1'
                                    )}
                                >
                                    비공개
                                </button>
                            </div>
                        </div>

                        {state?.error && (
                            <p className="text-sm text-destructive">{state.error}</p>
                        )}

                        <Button type="submit" className="w-full" disabled={isSaving}>
                            {isSaving ? '저장 중...' : '저장하기'}
                        </Button>
                    </CardContent>
                </Card>
            </form>

            <Separator />

            <Card className="border-destructive/20">
                <CardHeader>
                    <CardTitle className="text-base text-destructive">위험 구역</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                        클럽을 삭제하면 모든 데이터가 영구적으로 제거됩니다.
                    </p>
                    <Button
                        type="button"
                        variant="destructive"
                        className="w-full"
                        onClick={handleDelete}
                        disabled={isDeleting}
                    >
                        {isDeleting ? '삭제 중...' : '클럽 삭제'}
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
