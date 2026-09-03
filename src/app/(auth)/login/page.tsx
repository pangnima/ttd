import Link from 'next/link'

import { LoginForm } from '@/components/auth/login-form'
import { LoginHero } from '@/components/auth/login-hero'
import { TYPO } from '@/lib/dashboard/tokens'

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ next?: string }>
}) {
    const { next } = await searchParams
    // 오픈 리다이렉트 방지: 내부 경로만 폼으로 전달
    const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : undefined
    return (
        <div className="grid h-screen w-full lg:grid-cols-2">
            <LoginHero />

            <div className="flex items-center justify-center overflow-y-auto bg-background px-6 py-10 lg:justify-start lg:pl-16 xl:pl-24">
                <div className="w-full max-w-sm">
                    <p className={TYPO.eyebrow}>WELCOME BACK</p>
                    <h1 className={`${TYPO.h2} mt-2`}>다시 만나서 반가워요</h1>
                    <p className="mt-2 text-body2 text-muted-foreground">
                        계정이 없으신가요?{' '}
                        <Link
                            href="/signup"
                            className="font-semibold text-foreground underline underline-offset-2 hover:opacity-80"
                        >
                            회원가입
                        </Link>
                    </p>

                    <div className="mt-8">
                        <LoginForm next={safeNext} />
                    </div>
                </div>
            </div>
        </div>
    )
}
