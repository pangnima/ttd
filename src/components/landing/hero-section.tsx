import Link from 'next/link'

import { Chip } from '@/components/common/chip'
import { MemberAvatarGroup } from '@/components/common/member-avatar-group'
import { HeroPreviewCard } from '@/components/landing/hero-preview-card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** 소셜 프루프용 더미 멤버 */
const SAMPLE_MEMBERS = [
    { id: '1', name: '강' },
    { id: '2', name: '윤' },
    { id: '3', name: '서' },
    { id: '4', name: '민' },
    { id: '5', name: '주' },
]

export function HeroSection() {
    return (
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:py-24">
            <div>
                <Chip variant="soft" tone="lime" className="type-mono-label">
                    TENNIS CLUB OS
                </Chip>
                <h1 className="mt-5 text-[2.75rem] font-extrabold leading-[1.05] tracking-tight text-foreground lg:text-[3.5rem]">
                    코트 위 모든 경기를
                    <br />
                    기록하고 분석하다
                </h1>
                <p className="mt-5 max-w-md text-base text-muted-foreground">
                    클럽 운영부터 대진표, 개인 경기 통계까지. 코트 밖의 모든 일을 한 곳에서
                    관리하세요.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                    <Link
                        href="/signup"
                        className={cn(buttonVariants({ size: 'lg' }), 'h-11 px-6 text-sm')}
                    >
                        무료로 시작하기
                    </Link>
                    <Link
                        href="#"
                        className={cn(
                            buttonVariants({ variant: 'outline', size: 'lg' }),
                            'h-11 px-6 text-sm',
                        )}
                    >
                        ▷ 데모 보기
                    </Link>
                </div>
                <div className="mt-8 flex items-center gap-3">
                    <MemberAvatarGroup members={SAMPLE_MEMBERS} max={4} size="sm" />
                    <span className="text-sm text-muted-foreground">
                        전국 <span className="font-semibold text-foreground">240개 클럽</span>이 함께
                        사용 중
                    </span>
                </div>
            </div>

            <div className="flex justify-center lg:justify-end">
                <HeroPreviewCard />
            </div>
        </section>
    )
}
