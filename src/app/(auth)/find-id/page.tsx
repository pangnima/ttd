import Link from 'next/link'
import { FindIdForm } from '@/components/auth/find-id-form'
import { BrandLogo } from '@/components/common/brand-logo'

const linkCls = 'text-foreground hover:text-foreground/80 underline underline-offset-2 transition-colors'

/**
 * 아이디 찾기(0086) — 이름 + 이메일이 맞으면 마스킹된 아이디를 보여준다. 메일을 보내지 않는다.
 * `/forgot-password`와 같은 셸(단일 컬럼). 보호 라우트도 auth-route도 아니라 로그인 여부와 무관하게 열린다.
 */
export default function FindIdPage() {
    return (
        <div className="h-full overflow-y-auto">
            <div className="min-h-full flex items-center justify-center px-6 py-10">
                <div className="w-full max-w-sm">
                    <Link href="/" className="inline-flex mb-10 text-foreground">
                        <BrandLogo size="md" />
                    </Link>
                    <div className="mb-8">
                        <h1 className="text-h2 font-bold text-foreground">아이디 찾기</h1>
                        <p className="mt-1.5 text-body2 text-muted-foreground">
                            가입할 때 적은 이름과 이메일을 입력해 주세요.
                        </p>
                    </div>
                    <FindIdForm />
                    <p className="mt-6 text-center text-body2 text-muted-foreground">
                        <Link href="/forgot-password" className={linkCls}>비밀번호 찾기</Link>
                        {' · '}
                        <Link href="/login" className={linkCls}>로그인</Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
