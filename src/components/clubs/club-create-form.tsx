'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
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
    const [logoPreview, setLogoPreview] = useState<string | null>(null)

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setLogoPreview(URL.createObjectURL(file))
    }

    return (
        <form className="w-full max-w-lg space-y-5" action={formAction}>
            <input type="hidden" name="is_public" value={isPublic ? 'true' : 'false'} />

            {/* 로고 업로드 */}
            <div className="space-y-1.5">
                <Label>클럽 로고</Label>
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl border border-foreground/10 bg-foreground/5 flex items-center justify-center overflow-hidden shrink-0">
                        {logoPreview ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={logoPreview} alt="로고 미리보기" className="w-full h-full object-cover" />
                        ) : (
                            <ImagePlus className="w-6 h-6 text-foreground/30" />
                        )}
                    </div>
                    <div className="space-y-1.5">
                        <label
                            htmlFor="logo"
                            className="inline-flex items-center text-xs border border-foreground/20 rounded-full px-3 py-1.5 text-foreground/85 hover:bg-foreground/8 hover:border-foreground/35 transition-colors cursor-pointer"
                        >
                            이미지 선택
                        </label>
                        <p className="text-xs text-foreground/50">JPG, PNG, WEBP · 최대 5MB · 권장 512×512px</p>
                        <input
                            id="logo"
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
                <Label htmlFor="name">클럽 이름 *</Label>
                <Input
                    id="name"
                    name="name"
                    placeholder="예: 강남 테니스 클럽"
                    maxLength={30}
                />
            </div>

            {/* 활동 지역 */}
            <div className="space-y-1.5">
                <Label htmlFor="region">활동 지역 *</Label>
                <Input
                    id="region"
                    name="region"
                    placeholder="예: 서울 강남구"
                />
            </div>

            {/* 클럽 소개 */}
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

            <div className="flex gap-2 pt-1">
                <Button type="submit" disabled={isPending} className="flex-1">
                    {isPending ? '저장 중...' : '클럽 만들기'}
                </Button>
                <Link
                    href="/clubs"
                    className={cn(buttonVariants({ variant: 'outline' }), 'flex-1 justify-center')}
                >
                    취소
                </Link>
            </div>
        </form>
    )
}
