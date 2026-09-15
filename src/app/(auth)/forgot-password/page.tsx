import Link from 'next/link'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'
import { PasswordResetContactNotice } from '@/components/auth/password-reset-contact-notice'
import { BrandLogo } from '@/components/common/brand-logo'
import { mapResetQueryError } from '@/lib/auth/auth-error-messages'
import { PASSWORD_RESET_MAIL_ENABLED } from '@/lib/auth/password-reset-mode'

const linkCls = 'text-foreground hover:text-foreground/80 underline underline-offset-2 transition-colors'

/**
 * 비밀번호 찾기. 메일 재설정이 켜져 있으면 「아이디」 폼, 꺼져 있으면(도메인·SMTP 준비 전)
 * 운영자 문의 안내 — 스위치는 `password-reset-mode.ts` 하나다. 어느 쪽이든 만료 링크 배너는 그린다
 * (운영자가 대시보드에서 보낸 재설정 링크가 이 화면으로 돌아온다).
 */
export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
    const { error } = await searchParams
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
                            {PASSWORD_RESET_MAIL_ENABLED
                                ? '아이디를 입력하면 가입한 이메일로 재설정 링크를 보내드립니다.'
                                : '비밀번호를 잊으셨나요? 아래 안내를 따라 주세요.'}
                        </p>
                    </div>
                    {notice && (
                        <p className="mb-4 text-body2 text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                            {notice}
                        </p>
                    )}
                    {PASSWORD_RESET_MAIL_ENABLED ? <ForgotPasswordForm /> : <PasswordResetContactNotice />}
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
