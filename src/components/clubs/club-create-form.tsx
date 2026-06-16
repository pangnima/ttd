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

export function ClubCreateForm() {
    const [state, formAction, isPending] = useActionState(createClubAction, null)
    const [isPublic, setIsPublic] = useState(true)
    const [password, setPassword] = useState('')
    const [passwordConfirm, setPasswordConfirm] = useState('')

    // 비밀번호 확인 불일치 여부 (확인란에 입력이 있을 때만 노출)
    const passwordMismatch = passwordConfirm.length > 0 && password !== passwordConfirm
    const canSubmit = password.length > 0 && password === passwordConfirm

    return (
        <form className="w-full max-w-lg space-y-4" action={formAction}>
            <input type="hidden" name="is_public" value={isPublic ? 'true' : 'false'} />

            {/* ── 기본 정보 ── */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">기본 정보</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    <ClubLogoField />

                    {/* 클럽 이름 */}
                    <div className="space-y-1.5">
                        <Label htmlFor="name">클럽 이름 *</Label>
                        <Input
                            id="name"
                            name="name"
                            placeholder="예: 강남 테니스 클럽"
                            maxLength={30}
                            required
                        />
                    </div>

                    {/* 활동 지역 */}
                    <div className="space-y-1.5">
                        <Label htmlFor="region">활동 지역 *</Label>
                        <Input
                            id="region"
                            name="region"
                            placeholder="예: 서울 강남구"
                            required
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
                </CardContent>
            </Card>

            {/* ── 공개 설정 ── */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">공개 설정</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
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
                    <p className="text-xs text-muted-foreground">
                        {isPublic
                            ? '누구나 클럽을 검색하고 둘러볼 수 있어요.'
                            : '가입 승인된 회원만 클럽을 볼 수 있어요.'}
                    </p>
                </CardContent>
            </Card>

            {/* ── 삭제 비밀번호 ── */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">삭제 비밀번호 *</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-xs text-muted-foreground">
                        클럽을 해체(삭제)할 때 입력해야 하는 비밀번호입니다. 실수로 인한 삭제를 막아줍니다.
                    </p>

                    <div className="space-y-1.5">
                        <Label htmlFor="delete_password">비밀번호 *</Label>
                        <Input
                            id="delete_password"
                            name="delete_password"
                            type="password"
                            placeholder="4자 이상 입력하세요"
                            minLength={4}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="delete_password_confirm">비밀번호 확인 *</Label>
                        <Input
                            id="delete_password_confirm"
                            name="delete_password_confirm"
                            type="password"
                            placeholder="비밀번호를 다시 입력하세요"
                            value={passwordConfirm}
                            onChange={(e) => setPasswordConfirm(e.target.value)}
                            required
                        />
                        {passwordMismatch && (
                            <p className="text-xs text-destructive">비밀번호가 일치하지 않습니다.</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            {state?.error && (
                <p className="text-sm text-destructive">{state.error}</p>
            )}

            <div className="flex gap-2 pt-1">
                <Button type="submit" disabled={isPending || !canSubmit} className="flex-1">
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
