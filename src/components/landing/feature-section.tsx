import { CheckCheck, Shuffle, TrendingUp } from 'lucide-react'

import { TYPO } from '@/lib/dashboard/tokens'
import { cn } from '@/lib/utils'

/** 실제로 있는 기능 셋 — 어휘는 사용 가이드(sections.ts)와 같다. 클럽 운영은 동결(Week 54)이라 없다 */
const FEATURES = [
    {
        icon: Shuffle,
        title: '자동 대진표',
        description: '호스트가 참가자와 코트 수를 넣으면 출전이 고르게 배분된 대진이 한 번에 나옵니다.',
    },
    {
        icon: CheckCheck,
        title: '결과 상호 확인',
        description:
            '한 사람이 결과를 입력하면 나머지 참가자가 확인합니다. 전원이 확인해야 확정되고, 틀리면 이의 제기로 다시 입력을 요청합니다.',
    },
    {
        icon: TrendingUp,
        title: '개인 통계 · NTRP',
        description: '확정된 경기가 개인 경기 결과에 쌓이고, 승률·레이팅·티어로 정리됩니다.',
    },
] as const

/** 기능 소개 — 카드 테두리 없는 텍스트 열. 옛 3카드는 「자세히 보기 →」가 전부 죽은 링크였다 */
export function FeatureSection() {
    return (
        <section id="features" className="mx-auto max-w-6xl scroll-mt-4 border-t border-border px-6 py-16 lg:py-20">
            <h2 className={TYPO.h2}>매칭 안에서 다 됩니다</h2>
            <ul className="mt-10 grid gap-8 md:grid-cols-3">
                {FEATURES.map((feature) => (
                    <li key={feature.title}>
                        <span className="grid size-10 place-items-center rounded-md bg-secondary text-spot-solid">
                            <feature.icon className="size-5" />
                        </span>
                        <h3 className={cn(TYPO.h4, 'mt-4')}>{feature.title}</h3>
                        <p className={cn(TYPO.bodyMuted, 'mt-2 break-keep')}>{feature.description}</p>
                    </li>
                ))}
            </ul>
        </section>
    )
}
