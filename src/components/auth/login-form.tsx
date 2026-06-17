'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

import { SocialLoginButtons } from '@/components/auth/social-login-buttons'
import { Button, buttonVariants } from '@/components/ui/button'
import { loginAction } from '@/lib/actions/auth'
import { FORM_INPUT_BASE as inputCls, FORM_LABEL_BASE as labelCls } from '@/lib/dashboard/tokens'
import { cn } from '@/lib/utils'

export function LoginForm({ next }: { next?: string }) {
    const [state, formAction, isPending] = useActionState(loginAction, null)
    const [showPassword, setShowPassword] = useState(false)

    return (
        <div className="space-y-5">
            <form action={formAction} className="space-y-4">
                {next && <input type="hidden" name="next" value={next} />}
                <div>
                    <label htmlFor="email" className={labelCls}>이메일</label>
                    <input
                        id="email" name="email" type="email"
                        placeholder="name@email.com"
                        required autoComplete="email"
                        className={inputCls}
                    />
                </div>

                <div>
                    <div className="flex items-center justify-between">
                        <label htmlFor="password" className={labelCls}>비밀번호</label>
                        <Link
                            href="/forgot-password"
                            tabIndex={-1}
                            className="mb-1.5 text-[11px] text-muted-foreground hover:text-foreground"
                        >
                            비밀번호 찾기
                        </Link>
                    </div>
                    <div className="relative">
                        <input
                            id="password" name="password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="비밀번호를 입력하세요"
                            required autoComplete="current-password"
                            className={cn(inputCls, 'pr-10')}
                        />
                        <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => setShowPassword((v) => !v)}
                            aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
                            className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground"
                        >
                            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                    </div>
                </div>

                {/* UI만: 세션은 Supabase 기본 정책을 따름 */}
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input
                        type="checkbox" name="remember" defaultChecked
                        className="size-4 rounded-sm border-input accent-accent-lime"
                    />
                    로그인 상태 유지
                </label>

                {state?.error && (
                    <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                        {state.error}
                    </p>
                )}

                <Button type="submit" disabled={isPending} className="w-full h-11 font-semibold">
                    {isPending ? '로그인 중...' : '로그인'}
                </Button>
            </form>

            {/* 회원가입 유도 — 시인성을 위해 소셜 로그인 위로 배치 */}
            <div className="space-y-2 pt-1">
                <p className="text-center text-[11px] text-muted-foreground">계정이 없으신가요?</p>
                <Link
                    href="/signup"
                    className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'w-full h-11 font-semibold')}
                >
                    회원가입
                </Link>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                OR
                <span className="h-px flex-1 bg-border" />
            </div>

            <SocialLoginButtons />
        </div>
    )
}
