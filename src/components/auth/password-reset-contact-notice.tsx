import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { ADMIN_CONTACT_HINT } from '@/lib/auth/password-reset-mode'
import { cn } from '@/lib/utils'

/**
 * 메일 재설정이 꺼져 있는 동안(`PASSWORD_RESET_MAIL_ENABLED = false`) `/forgot-password`가 보이는 안내.
 * 운영자가 임시 비밀번호로 초기화해 주는 절차라, 사용자가 준비할 것(아이디 또는 이메일·이름)을 말한다.
 */
export function PasswordResetContactNotice() {
    return (
        <div className="rounded-md border border-border bg-muted/40 px-4 py-5 space-y-4 text-body text-foreground/80">
            <p className="break-keep">
                지금은 이메일로 비밀번호를 재설정하는 기능을 준비 중입니다.
                <span className="font-semibold text-foreground"> 운영자에게 문의</span>하시면 임시 비밀번호로 초기화해 드립니다.
            </p>
            <ul className="list-disc pl-5 text-body2 text-muted-foreground space-y-1 break-keep">
                <li>가입한 <span className="text-foreground">아이디 또는 이메일</span>과 <span className="text-foreground">이름</span>을 알려 주세요.</li>
                <li>임시 비밀번호로 로그인한 뒤 내 정보 수정에서 비밀번호를 바꿔 주세요.</li>
                {ADMIN_CONTACT_HINT && <li>문의: <span className="text-foreground">{ADMIN_CONTACT_HINT}</span></li>}
            </ul>
            <Link href="/find-id" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'w-full h-11 font-semibold')}>
                아이디가 기억나지 않으면 아이디 찾기
            </Link>
        </div>
    )
}
