'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { createClubAction } from '@/lib/actions/clubs'
import { ClubLogoField } from '@/components/clubs/club-logo-field'

/** 카드 헤더 우측 단계 라벨 (01 / 03 형태) */
function StepBadge({ step }: { step: number }) {
    return (
        <span className="text-xs font-medium tracking-widest text-muted-foreground tabular-nums">
            {String(step).padStart(2, '0')} / 03
        </span>
    )
}

export function ClubCreateForm() {
    const [state, formAction, isPending] = useActionState(createClubAction, null)
    const [isPublic, setIsPublic] = useState(true)
    const [password, setPassword] = useState('')
    const [passwordConfirm, setPasswordConfirm] = useState('')
    const [descLen, setDescLen] = useState(0)

    // 비밀번호 확인 불일치 여부 (확인란에 입력이 있을 때만 노출)
    const passwordMismatch = passwordConfirm.length > 0 && password !== passwordConfirm
    const canSubmit = password.length > 0 && password === passwordConfirm

    return (
        <form className="w-full space-y-4" action={formAction}>
            <input type="hidden" name="is_public" value={isPublic ? 'true' : 'false'} />

            {/* ── 기본 정보 ── */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                    <CardTitle className="text-base">기본 정보</CardTitle>
                    <StepBadge step={1} />
                </CardHeader>
                <CardContent className="space-y-5">
                    <ClubLogoField />

                    {/* 클럽 이름 */}
                    <div className="space-y-2.5">
                        <Label htmlFor="name">
                            클럽 이름 <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="name"
                            name="name"
                            placeholder="예: 강남 테니스 클럽"
                            maxLength={30}
                            required
                        />
                    </div>

                    {/* 활동 지역 */}
                    <div className="space-y-2.5">
                        <Label htmlFor="region">
                            활동 지역 <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="region"
                            name="region"
                            placeholder="예: 서울 강남구"
                            required
                        />
                    </div>

                    {/* 클럽 소개 */}
                    <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="description">클럽 소개</Label>
                            <span className="text-xs text-muted-foreground">선택</span>
                        </div>
                        <Textarea
                            id="description"
                            name="description"
                            placeholder="클럽 분위기, 정기 모임 요일, 실력대 등을 적어주세요."
                            rows={4}
                            maxLength={200}
                            onChange={(e) => setDescLen(e.target.value.length)}
                        />
                        <p className="text-right text-xs text-muted-foreground tabular-nums">
                            {descLen} / 200
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* ── 공개 설정 ── */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                    <CardTitle className="text-base">공개 설정</CardTitle>
                    <StepBadge step={2} />
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <button
                            type="button"
                            onClick={() => setIsPublic(true)}
                            aria-pressed={isPublic}
                            className={cn(
                                'rounded-lg border bg-background p-4 text-left transition-colors',
                                isPublic
                                    ? 'border-accent-lime bg-accent-lime/5'
                                    : 'border-border hover:border-input'
                            )}
                        >
                            <p className="text-sm font-semibold text-foreground">공개</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                누구나 검색하고 둘러볼 수 있어요
                            </p>
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsPublic(false)}
                            aria-pressed={!isPublic}
                            className={cn(
                                'rounded-lg border bg-background p-4 text-left transition-colors',
                                !isPublic
                                    ? 'border-accent-lime bg-accent-lime/5'
                                    : 'border-border hover:border-input'
                            )}
                        >
                            <p className="text-sm font-semibold text-foreground">비공개</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                초대 링크로만 가입할 수 있어요
                            </p>
                        </button>
                    </div>
                </CardContent>
            </Card>

            {/* ── 삭제 비밀번호 ── */}
            <Card className="border-destructive/40">
                <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                    <CardTitle className="text-base">
                        삭제 비밀번호 <span className="text-destructive">*</span>
                    </CardTitle>
                    <StepBadge step={3} />
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-2.5">
                            <Label htmlFor="delete_password">
                                비밀번호 <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="delete_password"
                                name="delete_password"
                                type="password"
                                placeholder="4자 이상"
                                minLength={4}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2.5">
                            <Label htmlFor="delete_password_confirm">
                                비밀번호 확인 <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="delete_password_confirm"
                                name="delete_password_confirm"
                                type="password"
                                placeholder="다시 입력"
                                value={passwordConfirm}
                                onChange={(e) => setPasswordConfirm(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {passwordMismatch && (
                        <p className="text-xs text-destructive">비밀번호가 일치하지 않습니다.</p>
                    )}

                    <p className="text-xs text-muted-foreground">
                        클럽을 해체할 때 사용되며, 안전하게 보관됩니다.
                    </p>
                </CardContent>
            </Card>

            {state?.error && (
                <p className="text-sm text-destructive">{state.error}</p>
            )}

            <div className="flex gap-2 pt-1">
                <Link
                    href="/clubs"
                    className={cn(buttonVariants({ variant: 'outline' }), 'h-11 flex-1 justify-center')}
                >
                    취소
                </Link>
                <Button
                    type="submit"
                    variant="accent"
                    disabled={isPending || !canSubmit}
                    className="h-11 flex-1"
                >
                    {isPending ? '저장 중...' : '클럽 만들기'}
                </Button>
            </div>
        </form>
    )
}
