import Link from 'next/link'
import {
    ArrowRight, BookOpen, CalendarDays, ClipboardList, ListChecks, Milestone, Route, type LucideIcon,
} from 'lucide-react'

import { CARD_BASE, TYPO } from '@/lib/dashboard/tokens'
import type { GuideSection, GuideSectionId } from '@/lib/guide/sections'
import { cn } from '@/lib/utils'

/** 화면 셋은 사이드바 메뉴(nav-items)와 같은 아이콘 — 가이드가 말하는 화면이 곧 메뉴의 화면이다 */
const GUIDE_ICONS: Record<GuideSectionId, LucideIcon> = {
    flow: Route,
    'match-rooms': CalendarDays,
    'my-match-rooms': ListChecks,
    'personal-matches': ClipboardList,
    stages: Milestone,
    terms: BookOpen,
}

/**
 * 가이드 페이지의 섹션 카드 — 문서형 화면이라 섹션 제목은 `<h2>` + H2 레벨(docs/typography.md).
 * `id`가 앵커라 인라인 설명의 「전체 가이드 →」가 여기로 착지한다. 스크롤 컨테이너가 `<main>`이라
 * `scroll-mt`로 상단 여백만 준다.
 */
export function GuideSectionCard({ section }: { section: GuideSection }) {
    const Icon = GUIDE_ICONS[section.id]
    return (
        <section id={section.id} className={cn(CARD_BASE, 'p-6 scroll-mt-4')}>
            <div className="mb-3 flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-md bg-secondary text-foreground">
                    <Icon className="size-5" />
                </span>
                <h2 className={TYPO.h2}>{section.title}</h2>
            </div>
            <p className={cn(TYPO.bodyMuted, 'break-keep')}>{section.summary}</p>
            <ol className="mt-4 space-y-2.5">
                {section.steps.map((step, i) => (
                    <li key={i} className="flex gap-3 text-body text-foreground">
                        <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-muted text-caption font-medium text-muted-foreground tabular-nums">
                            {i + 1}
                        </span>
                        <span className="break-keep">{step}</span>
                    </li>
                ))}
            </ol>
            {section.href && section.cta && (
                <Link
                    href={section.href}
                    className="mt-5 inline-flex w-fit items-center gap-1 text-body2 font-medium text-primary hover:underline"
                >
                    {section.cta}
                    <ArrowRight className="size-4" />
                </Link>
            )}
        </section>
    )
}
