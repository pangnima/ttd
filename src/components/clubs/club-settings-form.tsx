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
import { ClubAvatar } from '@/components/clubs/club-avatar'
import { ImagePlus } from 'lucide-react'
import type { Club } from '@/types'

type ClubSettingsFormProps = {
    club: Club
}

export function ClubSettingsForm({ club }: ClubSettingsFormProps) {
    const [state, formAction, isSaving] = useActionState(updateClubAction, null)
    const [isDeleting, startDelete] = useTransition()
    const [isPublic, setIsPublic] = useState(club.isPublic)
    const [logoPreview, setLogoPreview] = useState<string | null>(null)

    const handleDelete = () => {
        if (!confirm(`"${club.name}" 클럽을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return
        startDelete(async () => { await deleteClubAction(club.id) })
    }

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setLogoPreview(URL.createObjectURL(file))
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
                        {/* 로고 */}
                        <div className="space-y-1.5">
                            <Label>클럽 로고</Label>
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-xl border border-foreground/10 bg-foreground/5 flex items-center justify-center overflow-hidden shrink-0">
                                    {logoPreview ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={logoPreview} alt="로고 미리보기" className="w-full h-full object-cover" />
                                    ) : (
                                        <ClubAvatar name={club.name} logoUrl={club.logoUrl} size="lg" className="w-full h-full rounded-none border-0" />
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    <label
                                        htmlFor="settings-logo"
                                        className="inline-flex items-center gap-1.5 text-xs border border-foreground/20 rounded-full px-3 py-1.5 text-foreground/85 hover:bg-foreground/8 hover:border-foreground/35 transition-colors cursor-pointer"
                                    >
                                        <ImagePlus className="w-3.5 h-3.5" />
                                        이미지 변경
                                    </label>
                                    <p className="text-xs text-foreground/50">JPG, PNG, WEBP · 최대 5MB</p>
                                    <input
                                        id="settings-logo"
                                        name="logo"
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                        className="hidden"
                                        onChange={handleLogoChange}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 클럽 이름 */}
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

                        {/* 활동 지역 */}
                        <div className="space-y-1.5">
                            <Label htmlFor="club-region">활동 지역</Label>
                            <Input
                                id="club-region"
                                name="region"
                                defaultValue={club.region}
                                placeholder="예: 서울 강남구"
                            />
                        </div>

                        {/* 클럽 소개 */}
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

                        {/* 공개 여부 */}
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
