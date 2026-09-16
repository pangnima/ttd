import { GUIDE_ICONS } from '@/components/guide/guide-section-card'
import { GuideText } from '@/components/guide/guide-text'
import { TYPO } from '@/lib/dashboard/tokens'
import { GUIDE_FLOW, GUIDE_FLOW_STEPS } from '@/lib/guide/sections'
import { cn } from '@/lib/utils'

/**
 * 「매칭은 이렇게 흘러갑니다」(Week 65) — 문구는 전부 `sections.ts`에서 온다(제목·요약·네 단계·칸 이름).
 * 랜딩에 새 문구를 적으면 가이드와 갈리고 조용히 낡는다 — Week 57이 옛 /guide에서 겪은 일.
 * 칸은 링크가 아니다: 비로그인이 /guide#anchor로 가면 앱 셸로 착지해 랜딩 흐름이 끊긴다.
 */
export function FlowSection() {
    return (
        <section id="flow" className="mx-auto max-w-6xl scroll-mt-4 border-t border-border px-6 py-16 lg:py-20">
            <h2 className={TYPO.h2}>{GUIDE_FLOW.title}</h2>
            <p className={cn(TYPO.bodyMuted, 'mt-2 max-w-2xl break-keep')}>
                <GuideText text={GUIDE_FLOW.summary} />
            </p>
            <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                {GUIDE_FLOW_STEPS.map((step, i) => {
                    const Icon = GUIDE_ICONS[step.anchor]
                    return (
                        <li key={step.anchor}>
                            <div className="flex items-center gap-2">
                                <span className={cn(TYPO.caption, 'font-medium tabular-nums')}>{i + 1}</span>
                                <Icon className="size-5 text-spot-solid" />
                            </div>
                            <h3 className={cn(TYPO.h4, 'mt-3 break-keep')}>{step.label}</h3>
                            <p className={cn(TYPO.body2Muted, 'mt-2 break-keep')}>
                                <GuideText text={GUIDE_FLOW.steps[i]} />
                            </p>
                        </li>
                    )
                })}
            </ol>
        </section>
    )
}
