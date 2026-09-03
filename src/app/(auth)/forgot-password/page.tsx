import Link from 'next/link'

import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'
import { BrandLogo } from '@/components/common/brand-logo'

export default function ForgotPasswordPage() {
    return (
        <div className="h-full overflow-y-auto">
            <div className="min-h-full flex items-center justify-center px-6 py-10">
                <div className="w-full max-w-sm">
                    <Link href="/" className="inline-flex mb-10 text-foreground">
                        <BrandLogo size="md" />
                    </Link>

                    <div className="mb-8">
                        <h1 className="text-h2 font-bold text-foreground">비밀번호 찾기</h1>
                        <p className="mt-1.5 text-sm text-muted-foreground">
                            가입한 이메일로 재설정 링크를 보내드립니다.
                        </p>
                    </div>

                    <ForgotPasswordForm />

                    <p className="mt-6 text-center text-sm text-muted-foreground">
                        비밀번호가 기억나셨나요?{' '}
                        <Link
                            href="/login"
                            className="text-foreground hover:text-foreground/80 underline underline-offset-2 transition-colors"
                        >
                            로그인
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
