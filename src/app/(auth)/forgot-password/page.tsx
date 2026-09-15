import Link from 'next/link'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'
import { BrandLogo } from '@/components/common/brand-logo'
import { mapResetQueryError } from '@/lib/auth/auth-error-messages'

const linkCls = 'text-foreground hover:text-foreground/80 underline underline-offset-2 transition-colors'

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
    const { error } = await searchParams
    // /auth/confirm이 만료·재사용 링크를 여기로 돌려보낸다(Week 61) — 그전엔 말없이 로그인 화면이었다
    const notice = mapResetQueryError(error)

    return (
        <div className="h-full overflow-y-auto">
            <div className="min-h-full flex items-center justify-center px-6 py-10">
                <div className="w-full max-w-sm">
                    <Link href="/" className="inline-flex mb-10 text-foreground">
                        <BrandLogo size="md" />
                    </Link>
                    <div className="mb-8">
                        <h1 className="text-h2 font-bold text-foreground">비밀번호 찾기</h1>
                        <p className="mt-1.5 text-body2 text-muted-foreground">
                            아이디 또는 이메일을 입력하면 가입한 이메일로 재설정 링크를 보내드립니다.
                        </p>
                    </div>
                    {notice && (
                        <p className="mb-4 text-body2 text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                            {notice}
                        </p>
                    )}
                    <ForgotPasswordForm />
                    <p className="mt-6 text-center text-body2 text-muted-foreground">
                        <Link href="/find-id" className={linkCls}>아이디 찾기</Link>
                        {' · '}
                        <Link href="/login" className={linkCls}>로그인</Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
