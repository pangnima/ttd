import Link from 'next/link'
import { ArrowDown, ChevronRight } from 'lucide-react'
import { Fragment } from 'react'

import { GUIDE_FLOW_STEPS, guideAnchorHref } from '@/lib/guide/sections'
import { GUIDE_ICONS } from '@/components/guide/guide-section-card'

/**
 * 흐름 스테퍼 — 매칭이 어느 화면을 거쳐 전적이 되는지 네 칸으로(Week 58).
 * 예시 래퍼 **밖**에 있는 실제 링크다: 칸을 누르면 그 일을 자세히 말하는 섹션으로 간다(페이지 안 목차).
 * 문구는 `GUIDE_FLOW_STEPS`(단일 출처), 아이콘은 섹션 카드와 같은 맵.
 */
export function FlowStepper() {
    return (
        <ol className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-stretch">
            {GUIDE_FLOW_STEPS.map((step, i) => {
                const Icon = GUIDE_ICONS[step.anchor]
                return (
                    <Fragment key={step.anchor}>
                        {i > 0 && (
                            <li aria-hidden className="flex items-center justify-center text-muted-foreground">
                                <ChevronRight className="hidden size-4 sm:block" />
                                <ArrowDown className="size-4 sm:hidden" />
                            </li>
                        )}
                        <li className="min-w-0 flex-1">
                            <Link
                                href={guideAnchorHref(step.anchor)}
                                className="flex h-full flex-col gap-1.5 rounded-md border border-border bg-muted/40 p-3 transition-colors hover:border-input"
                            >
                                <span className="flex items-center gap-2">
                                    <span className="text-caption font-medium tabular-nums text-muted-foreground">{i + 1}</span>
                                    <Icon className="size-4 text-primary" />
                                </span>
                                <span className="text-body2 font-medium text-foreground break-keep">{step.label}</span>
                                <span className="text-caption text-muted-foreground break-keep">{step.screen}</span>
                            </Link>
                        </li>
                    </Fragment>
                )
            })}
        </ol>
    )
}
