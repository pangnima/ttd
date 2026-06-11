import Link from 'next/link'

import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function CtaBanner() {
    return (
        <section className="mx-auto max-w-6xl px-6 pb-16 lg:pb-20">
            <div className="dark flex flex-col items-start justify-between gap-6 rounded-lg border border-border bg-card px-8 py-10 text-foreground sm:flex-row sm:items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">
                        오늘 첫 경기를 기록해 보세요
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        신용카드 없이 무료로 시작 · 1분이면 충분합니다.
                    </p>
                </div>
                <Link
                    href="/signup"
                    className={cn(buttonVariants({ variant: 'accent', size: 'lg' }), 'h-11 px-6 text-sm')}
                >
                    무료로 시작하기
                </Link>
            </div>
        </section>
    )
}
