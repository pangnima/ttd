import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

import { buttonVariants } from '@/components/ui/button'
import { CARD_BASE, TYPO } from '@/lib/dashboard/tokens'
import { cn } from '@/lib/utils'

/** 마지막 유도 — 흐름·기능을 읽고 내려온 사람이 위로 돌아가지 않게. 다크 스코프는 page 루트가 든다 */
export function CtaBanner() {
    return (
        <section className="mx-auto max-w-6xl px-6 pb-16 lg:pb-20">
            <div className={cn(CARD_BASE, 'flex flex-col items-center gap-6 px-8 py-12 text-center')}>
                <h2 className={cn(TYPO.h2, 'break-keep')}>첫 매칭을 열어 보세요</h2>
                <Link
                    href="/signup"
                    className={cn(buttonVariants({ variant: 'accent', size: 'lg' }), 'h-11 px-6 text-body2')}
                >
                    회원가입
                    <ArrowUpRight className="size-4" />
                </Link>
            </div>
        </section>
    )
}
