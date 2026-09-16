import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

import { BrandLogo } from '@/components/common/brand-logo'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** 같은 페이지 앵커 둘 + 사용 가이드 — 랜딩은 body 스크롤이라 브라우저 해시 이동이 그대로 된다 */
const NAV_LINKS = [
    { href: '#flow', label: '흐름' },
    { href: '#features', label: '기능' },
    { href: '/guide', label: '사용 가이드' },
] as const

/**
 * 랜딩 상단 — 정적(Week 65). 옛 버전은 `getUser()`로 로그인 분기 UI를 그렸지만 미들웨어가 로그인 상태의
 * `/`를 프로필로 리다이렉트하므로 그 분기는 도달할 수 없었다 — 매 요청 DB를 두 번 치던 사문 코드.
 * 로그인은 히어로 아래 텍스트 링크가 맡고, 나브는 [회원가입] 하나로 유도한다.
 */
export function LandingNav() {
    return (
        <header className="w-full bg-background">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
                <Link href="/" aria-label="홈">
                    <BrandLogo />
                </Link>
                <nav className="flex items-center gap-6">
                    {NAV_LINKS.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="hidden text-body2 text-muted-foreground transition-colors hover:text-foreground sm:inline"
                        >
                            {link.label}
                        </Link>
                    ))}
                    {/* buttonVariants base가 text-sm이라 text-body2로 덮어쓴다 */}
                    <Link
                        href="/signup"
                        className={cn(buttonVariants({ variant: 'accent', size: 'lg' }), 'h-10 px-4 text-body2')}
                    >
                        회원가입
                        <ArrowUpRight className="size-4" />
                    </Link>
                </nav>
            </div>
        </header>
    )
}
