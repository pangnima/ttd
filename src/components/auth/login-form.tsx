'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { loginAction } from '@/lib/actions/auth'

export function LoginForm() {
    const [state, formAction, isPending] = useActionState(loginAction, null)

    return (
        <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
                <Label htmlFor="email">이메일</Label>
                <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="example@email.com"
                    required
                    autoComplete="email"
                />
            </div>

            <div className="space-y-1.5">
                <Label htmlFor="password">비밀번호</Label>
                <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="비밀번호를 입력하세요"
                    required
                    autoComplete="current-password"
                />
            </div>

            {state?.error && (
                <p className="text-sm text-destructive">{state.error}</p>
            )}

            <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? '로그인 중...' : '로그인'}
            </Button>

            <p className="text-sm text-center text-muted-foreground">
                계정이 없으신가요?{' '}
                <Link href="/signup" className="underline text-foreground">
                    회원가입
                </Link>
            </p>
        </form>
    )
}
