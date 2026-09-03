'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { CheckCircle2, ChevronRight, PlusCircle, UserRound, Users, X, type LucideIcon } from 'lucide-react'

import { CARD_BASE, TYPO } from '@/lib/dashboard/tokens'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { countCompletedSteps, type OnboardingStep, type OnboardingStepKey } from '@/lib/onboarding'

// 닫음 상태 영속 키 (sidebar-context의 localStorage 패턴과 동일 규약)
const DISMISS_KEY = 'onboarding:checklist-dismissed'

const STEP_ICONS: Record<OnboardingStepKey, LucideIcon> = {
    'personal-match': PlusCircle,
    profile: UserRound,
    club: Users,
}

function StepRow({ step }: { step: OnboardingStep }) {
    const Icon = step.done ? CheckCircle2 : STEP_ICONS[step.key]
    return (
        <Link
            href={step.href}
            className={cn(
                'flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50',
                step.done && 'opacity-60',
            )}
        >
            <span
                className={cn(
                    'grid size-9 shrink-0 place-items-center rounded-md',
                    step.done ? 'bg-win/15 text-win' : 'bg-secondary text-foreground',
                )}
            >
                <Icon className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
                <span className={cn('block text-sm font-medium text-foreground', step.done && 'line-through')}>
                    {step.title}
                </span>
                <span className="block text-xs text-muted-foreground">{step.description}</span>
            </span>
            {!step.done && <ChevronRight className="size-4 shrink-0 text-muted-foreground" />}
        </Link>
    )
}

export function OnboardingChecklist({ steps }: { steps: OnboardingStep[] }) {
    // mount 전에는 렌더하지 않아 dismiss 깜빡임/hydration mismatch를 피한다
    const [mounted, setMounted] = useState(false)
    const [dismissed, setDismissed] = useState(false)

    useEffect(() => {
        // mount 직후 1회 보정으로 hydration mismatch를 피하는 의도된 동기 setState
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true)
        if (localStorage.getItem(DISMISS_KEY) === '1') setDismissed(true)
    }, [])

    if (!mounted || dismissed) return null

    const completed = countCompletedSteps(steps)
    const pct = Math.round((completed / steps.length) * 100)

    const dismiss = () => {
        localStorage.setItem(DISMISS_KEY, '1')
        setDismissed(true)
    }

    return (
        <section className={cn(CARD_BASE, 'p-5')}>
            <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                    <h2 className={TYPO.h4}>시작하기</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        {completed === steps.length
                            ? '모든 준비를 마쳤어요!'
                            : `${steps.length}단계 중 ${completed}단계 완료`}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={dismiss}
                    aria-label="시작하기 안내 닫기"
                    className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                    <X className="size-4" />
                </button>
            </div>

            <Progress value={pct} className="mb-4" />

            <div className="space-y-2">
                {steps.map((step) => (
                    <StepRow key={step.key} step={step} />
                ))}
            </div>
        </section>
    )
}
