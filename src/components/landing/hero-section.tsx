import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

import { HeroCollage } from '@/components/landing/hero-collage'
import { buttonVariants } from '@/components/ui/button'
import { TYPO } from '@/lib/dashboard/tokens'
import { cn } from '@/lib/utils'

/**
 * 히어로 — 좌 카피 / 우 실제 카드 콜라주(Week 65). CTA는 [회원가입] 하나이고 [사용 가이드]가 보조, 로그인은 나브가 맡는다 —
 * 옛 「데모 보기」는 `href="#"` 죽은 링크였다. 소셜 프루프·수치는 전부 가짜라 뺐다.
 */
export function HeroSection() {
    return (
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-[5fr_7fr] lg:py-24">
            <div>
                <h1 className={cn(TYPO.display, 'break-keep')}>
                    오늘 친 테니스,
                    <br />
                    전적으로
                    <br />
                    남기세요
                </h1>
                <p className={cn(TYPO.bodyMuted, 'mt-6 max-w-md break-keep')}>
                    매칭을 열어 함께 칠 사람을 모으고, 게임을 올리고, 결과를 서로 확인하면 승률과 레이팅에
                    반영됩니다.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                    <Link
                        href="/signup"
                        className={cn(buttonVariants({ variant: 'accent', size: 'lg' }), 'h-11 px-6 text-body2')}
                    >
                        회원가입
                        <ArrowUpRight className="size-4" />
                    </Link>
                    <Link
                        href="/guide"
                        className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'h-11 px-6 text-body2')}
                    >
                        사용 가이드
                    </Link>
                </div>
            </div>

            <HeroCollage />
        </section>
    )
}
