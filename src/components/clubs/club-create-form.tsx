'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { createClubAction } from '@/lib/actions/clubs'
import { ImagePlus } from 'lucide-react'

export function ClubCreateForm() {
    const [state, formAction, isPending] = useActionState(createClubAction, null)
    const [isPublic, setIsPublic] = useState(true)

    return (
        <form
            className="flex flex-col lg:flex-row gap-6 items-start"
            action={formAction}
        >
            <input type="hidden" name="is_public" value={isPublic ? 'true' : 'false'} />

            {/* 썸네일 */}
            <div className="w-full lg:w-72 shrink-0">
                <Card className="overflow-hidden">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">썸네일</CardTitle>
                        <CardDescription className="text-xs">
                            클럽 대표 이미지를 업로드하세요.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <label
                            htmlFor="thumbnail"
                            className="flex flex-col items-center justify-center w-full aspect-square rounded-lg border-2 border-dashed border-border cursor-pointer hover:border-primary/50 hover:bg-muted/40 transition-colors group"
                        >
                            <ImagePlus className="w-10 h-10 text-muted-foreground group-hover:text-primary/60 transition-colors mb-3" />
                            <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                                이미지 업로드
                            </span>
                            <span className="text-xs text-muted-foreground mt-1">
                                JPG, PNG, WEBP · 최대 5MB
                            </span>
                            <input
                                id="thumbnail"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled
                            />
                        </label>
                        <p className="text-xs text-muted-foreground text-center mt-2">
                            권장 크기: 512 × 512px
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* 기본 정보 */}
            <Card className="flex-1 w-full">
                <CardHeader>
                    <CardTitle className="text-base">기본 정보</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div className="space-y-1.5">
                        <Label htmlFor="name">클럽 이름 *</Label>
                        <Input
                            id="name"
                            name="name"
                            placeholder="예: 강남 테니스 클럽"
                            maxLength={30}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="region">활동 지역 *</Label>
                        <Input
                            id="region"
                            name="region"
                            placeholder="예: 서울 강남구"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="description">클럽 소개</Label>
                        <Textarea
                            id="description"
                            name="description"
                            placeholder="클럽을 소개해주세요."
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

                    <div className="flex gap-2 pt-1">
                        <Button
                            type="submit"
                            disabled={isPending}
                            className="flex-1"
                        >
                            {isPending ? '저장 중...' : '클럽 만들기'}
                        </Button>
                        <Link
                            href="/clubs"
                            className={cn(buttonVariants({ variant: 'outline' }), 'flex-1 justify-center')}
                        >
                            취소
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </form>
    )
}
