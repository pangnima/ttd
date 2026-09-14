import Link from 'next/link'
import { SignupForm } from '@/components/auth/signup-form'
import { SocialLoginButtons } from '@/components/auth/social-login-buttons'
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
                        <h1 className="text-h2 font-bold text-foreground">계정 만들기</h1>
                        <p className="mt-1.5 text-body2 text-muted-foreground">
                            이미 계정이 있으신가요?{' '}
                            <Link href="/login" className="text-foreground hover:text-foreground/80 underline underline-offset-2 transition-colors">
                                로그인
                            </Link>
                        </p>
                    </div>

                    <SignupForm />

                    {/* 소셜 버튼은 폼 **밖**에 둔다 — Server Action에 제출하는 자체 form이라 중첩할 수 없다 */}
                    <div className="mt-5 space-y-5">
                        <div className="flex items-center gap-3 text-caption text-muted-foreground">
                            <span className="h-px flex-1 bg-border" />
                            OR
                            <span className="h-px flex-1 bg-border" />
                        </div>
                        <SocialLoginButtons />
                    </div>
                </div>
            </div>
        </div>
    )
}
