import Link from 'next/link'
import { authButtonClass } from '@/components/auth/auth-button-class'
import { ADMIN_CONTACT_EMAIL } from '@/lib/auth/password-reset-mode'

/**
 * 메일 재설정이 꺼져 있는 동안(`PASSWORD_RESET_MAIL_ENABLED = false`) `/forgot-password`가 보이는 안내.
 * 운영자가 임시 비밀번호로 초기화해 주는 절차라, 사용자가 준비할 것(아이디·이름)을 말한다.
 */
export function PasswordResetContactNotice() {
    return (
        <div className="rounded-md border border-border bg-muted/40 px-4 py-5 space-y-4 text-body text-foreground/80">
            <p className="break-keep">
                지금은 이메일로 비밀번호를 재설정하는 기능을 준비 중입니다.
                <span className="font-semibold text-foreground"> 운영자에게 문의</span>하시면 임시 비밀번호로 초기화해 드립니다.
            </p>
            <ul className="list-disc pl-5 text-body2 text-muted-foreground space-y-1 break-keep">
                <li>가입한 <span className="text-foreground">아이디</span>와 <span className="text-foreground">이름</span>을 알려 주세요.</li>
                <li>임시 비밀번호로 로그인한 뒤 내 정보 수정에서 비밀번호를 바꿔 주세요.</li>
            </ul>
            {ADMIN_CONTACT_EMAIL && (
                <a
                    href={`mailto:${ADMIN_CONTACT_EMAIL}?subject=${encodeURIComponent('[BASELINE] 비밀번호 초기화 요청')}`}
                    className={authButtonClass('accent')}
                >
                    {ADMIN_CONTACT_EMAIL}로 문의하기
                </a>
            )}
            <Link href="/find-id" className={authButtonClass('outline')}>
                아이디가 기억나지 않으면 아이디 찾기
            </Link>
        </div>
    )
}
