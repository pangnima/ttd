import Link from 'next/link'

import { LoginForm } from '@/components/auth/login-form'
import { LoginHero } from '@/components/auth/login-hero'
import { TYPO } from '@/lib/dashboard/tokens'

export default function LoginPage() {
    return (
        <div className="grid h-screen w-full lg:grid-cols-2">
            <LoginHero />

            <div className="flex items-center justify-center overflow-y-auto bg-background px-6 py-10 lg:justify-start lg:pl-16 xl:pl-24">
                <div className="w-full max-w-sm">
                    <p className={TYPO.monoLabel}>WELCOME BACK</p>
                    <h1 className="type-headline mt-2 text-foreground">다시 만나서 반가워요</h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        계정이 없으신가요?{' '}
                        <Link
                            href="/signup"
                            className="font-semibold text-foreground underline underline-offset-2 hover:opacity-80"
                        >
                            회원가입
                        </Link>
                    </p>

                    <div className="mt-8">
                        <LoginForm />
                    </div>
                </div>
            </div>
        </div>
    )
}
