'use client'

import { useActionState, useTransition, useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
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
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [deletePassword, setDeletePassword] = useState('')
    const [deleteError, setDeleteError] = useState<string | null>(null)

    const handleDelete = () => {
        setDeleteError(null)
        startDelete(async () => {
            // 성공 시 액션이 redirect하므로 반환값은 실패(에러)일 때만 도달
            const result = await deleteClubAction(club.id, deletePassword)
            if (result?.error) setDeleteError(result.error)
        })
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
                        <CardTitle className="text-h4">기본 정보</CardTitle>
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
                                        className="inline-flex items-center gap-1.5 text-caption border border-foreground/20 rounded-full px-3 py-1.5 text-foreground/85 hover:bg-foreground/8 hover:border-foreground/35 transition-colors cursor-pointer"
                                    >
                                        <ImagePlus className="w-3.5 h-3.5" />
                                        이미지 변경
                                    </label>
                                    <p className="text-caption text-muted-foreground">JPG, PNG, WEBP · 최대 5MB</p>
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

                        {/* 고정코트 시간 */}
                        <div className="space-y-1.5">
                            <Label htmlFor="club-court-schedule">고정코트 시간</Label>
                            <Input
                                id="club-court-schedule"
                                name="court_schedule"
                                defaultValue={club.courtSchedule ?? ''}
                                placeholder="예: 매주 토·일 09:00~12:00, 강남테니스장"
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
                            <p className="text-body2 text-destructive">{state.error}</p>
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
                    <CardTitle className="text-h4 text-destructive">위험 구역</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-body2 text-muted-foreground mb-4">
                        클럽을 삭제하면 모든 데이터가 영구적으로 제거됩니다.
                    </p>
                    <Button
                        type="button"
                        variant="destructive"
                        className="w-full"
                        onClick={() => {
                            setDeletePassword('')
                            setDeleteError(null)
                            setDeleteOpen(true)
                        }}
                    >
                        클럽 삭제
                    </Button>
                </CardContent>
            </Card>

            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-destructive">클럽 삭제</DialogTitle>
                        <DialogDescription>
                            &quot;{club.name}&quot; 클럽과 모든 데이터가 영구적으로 제거됩니다. 이 작업은 되돌릴 수 없습니다.
                            계속하려면 삭제 비밀번호를 입력하세요.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-1.5">
                        <Label htmlFor="delete-password">삭제 비밀번호</Label>
                        <Input
                            id="delete-password"
                            type="password"
                            placeholder="비밀번호를 입력하세요"
                            value={deletePassword}
                            onChange={(e) => setDeletePassword(e.target.value)}
                            autoComplete="off"
                        />
                        {deleteError && (
                            <p className="text-caption text-destructive">{deleteError}</p>
                        )}
                    </div>

                    <DialogFooter showCloseButton>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isDeleting || deletePassword.length === 0}
                        >
                            {isDeleting ? '삭제 중...' : '영구 삭제'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
