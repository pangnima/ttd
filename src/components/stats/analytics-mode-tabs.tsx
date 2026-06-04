'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import type { AnalyticsMode } from '@/lib/queries/analytics'

type Props = {
    mode: AnalyticsMode
    /** 탭 전환 시 이동할 base pathname (기본: /me/analytics) */
    basePath?: string
}

const TABS: { value: AnalyticsMode; label: string }[] = [
    { value: 'total',    label: '전체' },
    { value: 'personal', label: '개인' },
]

export function AnalyticsModeTabs({ mode, basePath = '/me/analytics' }: Props) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const handleChange = (next: AnalyticsMode) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('mode', next)
        router.push(`${basePath}?${params.toString()}`)
    }

    return (
        <div className="inline-flex rounded-lg border border-border bg-muted/30 p-0.5 gap-0.5">
            {TABS.map((tab) => {
                const active = tab.value === mode
                return (
                    <button
                        key={tab.value}
                        onClick={() => handleChange(tab.value)}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                            active
                                ? 'bg-background text-foreground shadow-sm border border-border'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        {tab.label}
                    </button>
                )
            })}
        </div>
    )
}
