import Link from 'next/link'
import { SocialLoginButtons } from '@/components/auth/social-login-buttons'
import { buttonVariants } from '@/components/ui/button'
import { providerLabel } from '@/lib/auth/account-providers'
import type { FindIdResult } from '@/lib/auth/find-id'
import { cn } from '@/lib/utils'

const cardCls = 'rounded-md border border-border bg-muted/40 px-4 py-5 text-body text-foreground/80 space-y-4'
const primaryCls = cn(buttonVariants({ size: 'lg' }), 'w-full h-11 font-semibold')
const outlineCls = cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'w-full h-11 font-semibold')

type Props = { result: Exclude<FindIdResult, { kind: 'none' }> }

/**
 * 아이디 찾기 결과 카드(0086). 셋 중 하나 — `none`은 폼이 자기 자리에서 말하므로 여기 오지 않는다.
 * 마스킹된 값을 그대로 보인다(원문은 서버에도 오지 않는다). 다음 손을 함께 준다 — 로그인·비밀번호 찾기.
 */
export function FindIdResultCard({ result }: Props) {
    if (result.kind === 'login_id') {
        return (
            <div className={cardCls}>
                <p className="break-keep">
                    회원님의 아이디는{' '}
                    <span className="font-semibold tracking-wider text-foreground">{result.masked}</span> 입니다.
                </p>
                <p className="text-body2 text-muted-foreground break-keep">
                    가운데는 가려져 있습니다. 아이디가 떠오르지 않으면 운영자에게 문의해 주세요.
                </p>
                <div className="grid gap-2">
                    <Link href="/login" className={primaryCls}>로그인</Link>
                    <Link href="/forgot-password" className={outlineCls}>비밀번호 찾기</Link>
                </div>
            </div>
        )
    }

    if (result.kind === 'email_only') {
        return (
            <div className={cardCls}>
                <p className="break-keep">
                    이 계정은 아직 아이디가 없고 <span className="font-semibold text-foreground">이메일로 로그인</span>합니다.
                </p>
                <p className="text-body2 text-muted-foreground break-keep">
                    로그인한 뒤 내 정보 수정에서 아이디를 한 번 정할 수 있습니다.
                </p>
                <div className="grid gap-2">
                    <Link href="/login" className={primaryCls}>로그인</Link>
                    <Link href="/forgot-password" className={outlineCls}>비밀번호 찾기</Link>
                </div>
            </div>
        )
    }

    const label = providerLabel(result.provider) ?? '소셜'
    return (
        <div className={cardCls}>
            <p className="break-keep">
                이 계정은 <span className="font-semibold text-foreground">{label}</span> 계정으로 가입했습니다.
                아이디와 비밀번호 없이 아래 버튼으로 로그인합니다.
            </p>
            <SocialLoginButtons />
        </div>
    )
}
