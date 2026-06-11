import Link from 'next/link'

import { BrandLogo } from '@/components/common/brand-logo'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function LandingNav() {
    return (
        <header className="w-full border-b border-border bg-background">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
                <Link href="/" aria-label="홈">
                    <BrandLogo />
                </Link>

                <div className="flex items-center gap-2">
                    <Link
                        href="/login"
                        className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
                    >
                        로그인
                    </Link>
                    <Link href="/signup" className={cn(buttonVariants({ size: 'lg' }))}>
                        무료로 시작
                    </Link>
                </div>
            </div>
        </header>
    )
}
