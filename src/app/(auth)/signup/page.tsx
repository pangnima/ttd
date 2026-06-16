import Link from 'next/link'
import { SignupForm } from '@/components/auth/signup-form'
import { BrandLogo } from '@/components/common/brand-logo'

export default function SignupPage() {
    return (
        <div className="h-full overflow-y-auto">
            <div className="min-h-full flex items-center justify-center px-6 py-10">
                <div className="w-full max-w-md">
                    <Link href="/" className="inline-flex mb-10 text-foreground">
                        <BrandLogo size="md" />
                    </Link>

                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-foreground">계정 만들기</h1>
                        <p className="mt-1.5 text-sm text-foreground/55">
                            이미 계정이 있으신가요?{' '}
                            <Link href="/login" className="text-foreground hover:text-foreground/80 underline underline-offset-2 transition-colors">
                                로그인
                            </Link>
                        </p>
                    </div>

                    <SignupForm />
                </div>
            </div>
        </div>
    )
}
