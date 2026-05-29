'use client'

import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function ClubDashboardError({ reset }: { reset: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center">
            <p className="text-foreground/70">대시보드를 불러오는 중 오류가 발생했습니다.</p>
            <div className="flex gap-3">
                <button
                    onClick={reset}
                    className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                >
                    다시 시도
                </button>
                <Link href="/clubs" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
                    클럽 목록으로
                </Link>
            </div>
        </div>
    )
}
