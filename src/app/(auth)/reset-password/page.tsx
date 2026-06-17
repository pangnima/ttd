import Link from 'next/link'
import { redirect } from 'next/navigation'

import { ResetPasswordForm } from '@/components/auth/reset-password-form'
import { BrandLogo } from '@/components/common/brand-logo'
import { createClient } from '@/lib/supabase/server'

export default async function ResetPasswordPage() {
    // /auth/confirm 에서 verifyOtp로 임시 세션이 설정된 상태로만 접근 가능.
    // 세션이 없으면(직접 접근/만료) 비밀번호 찾기로 회귀.
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/forgot-password')

    return (
        <div className="h-full overflow-y-auto">
            <div className="min-h-full flex items-center justify-center px-6 py-10">
                <div className="w-full max-w-sm">
                    <Link href="/" className="inline-flex mb-10 text-foreground">
                        <BrandLogo size="md" />
                    </Link>

                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-foreground">새 비밀번호 설정</h1>
                        <p className="mt-1.5 text-sm text-muted-foreground">
                            새로 사용할 비밀번호를 입력해 주세요.
                        </p>
                    </div>

                    <ResetPasswordForm />
                </div>
            </div>
        </div>
    )
}
