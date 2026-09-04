'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { createClubAction } from '@/lib/actions/clubs'
import { ClubLogoField } from '@/components/clubs/club-logo-field'
import { FormSectionCard } from '@/components/common/form-section-card'

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
            <FormSectionCard title="기본 정보" step="01 / 03" contentClassName="space-y-5">
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
                            <span className="text-caption text-muted-foreground">선택</span>
                        </div>
                        <Textarea
                            id="description"
                            name="description"
                            placeholder="클럽 분위기, 정기 모임 요일, 실력대 등을 적어주세요."
                            rows={4}
                            maxLength={200}
                            onChange={(e) => setDescLen(e.target.value.length)}
                        />
                        <p className="text-right text-caption text-muted-foreground tabular-nums">
                            {descLen} / 200
                        </p>
                    </div>
            </FormSectionCard>

            {/* ── 공개 설정 ── */}
            <FormSectionCard title="공개 설정" step="02 / 03">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <button
                            type="button"
                            onClick={() => setIsPublic(true)}
                            aria-pressed={isPublic}
                            className={cn(
                                'rounded-lg border p-4 text-left transition-colors',
                                isPublic
                                    ? 'border-spot-solid bg-spot-solid'
                                    : 'border-border bg-background hover:border-input'
                            )}
                        >
                            <p className={cn('text-body2 font-semibold', isPublic ? 'text-spot-foreground' : 'text-foreground')}>공개</p>
                            <p className={cn('mt-1 text-caption', isPublic ? 'text-spot-foreground/70' : 'text-muted-foreground')}>
                                누구나 검색하고 둘러볼 수 있어요
                            </p>
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsPublic(false)}
                            aria-pressed={!isPublic}
                            className={cn(
                                'rounded-lg border p-4 text-left transition-colors',
                                !isPublic
                                    ? 'border-spot-solid bg-spot-solid'
                                    : 'border-border bg-background hover:border-input'
                            )}
                        >
                            <p className={cn('text-body2 font-semibold', !isPublic ? 'text-spot-foreground' : 'text-foreground')}>비공개</p>
                            <p className={cn('mt-1 text-caption', !isPublic ? 'text-spot-foreground/70' : 'text-muted-foreground')}>
                                초대 링크로만 가입할 수 있어요
                            </p>
                        </button>
                    </div>
            </FormSectionCard>

            {/* ── 삭제 비밀번호 ── */}
            <FormSectionCard
                title={<>삭제 비밀번호 <span className="text-destructive">*</span></>}
                step="03 / 03"
                tone="destructive"
                contentClassName="space-y-4"
            >
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
                        <p className="text-body2 text-destructive">비밀번호가 일치하지 않습니다.</p>
                    )}

                    <p className="text-caption text-muted-foreground">
                        클럽을 해체할 때 사용되며, 안전하게 보관됩니다.
                    </p>
            </FormSectionCard>

            {state?.error && (
                <p className="text-body2 text-destructive">{state.error}</p>
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
