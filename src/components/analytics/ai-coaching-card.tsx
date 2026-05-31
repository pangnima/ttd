'use client'

import { useState, useTransition } from 'react'
import { generateAICoachingAction, type AICoachingResult } from '@/lib/actions/ai-coaching'
import { CARD_BASE, SECTION_LABEL } from '@/lib/dashboard/tokens'

type Props = {
    initialResult: AICoachingResult | null
    initialGeneratedAt: string | null
}

function formatRelativeTime(isoString: string): string {
    const diffMs = Date.now() - new Date(isoString).getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return '방금 전'
    if (diffMin < 60) return `${diffMin}분 전`
    const diffH = Math.floor(diffMin / 60)
    if (diffH < 24) return `${diffH}시간 전`
    return `${Math.floor(diffH / 24)}일 전`
}

export function AICoachingCard({ initialResult, initialGeneratedAt }: Props) {
    const [isPending, startTransition] = useTransition()
    const [result, setResult] = useState<AICoachingResult | null>(initialResult)
    const [generatedAt, setGeneratedAt] = useState<string | null>(initialGeneratedAt)
    const [error, setError] = useState<string | null>(null)

    function handleGenerate() {
        setError(null)
        startTransition(async () => {
            const res = await generateAICoachingAction()
            if (res.error) {
                setError(res.error)
            } else {
                setResult(res.result)
                setGeneratedAt(res.generatedAt)
            }
        })
    }

    return (
        <section className="space-y-3">
            <div className="flex items-center justify-between">
                <p className={SECTION_LABEL}>AI 코칭 분석</p>
                {generatedAt && (
                    <span className="text-xs text-muted-foreground">
                        마지막 분석: {formatRelativeTime(generatedAt)}
                    </span>
                )}
            </div>
            <div className={`${CARD_BASE} p-4 space-y-4`}>
                {result ? (
                    <>
                        <div className="space-y-2">
                            <p className="text-sm font-semibold text-green-600">💪 강점</p>
                            <ul className="space-y-1">
                                {result.strengths.map((s, i) => (
                                    <li key={i} className="text-sm text-foreground flex gap-2">
                                        <span className="text-muted-foreground mt-0.5">•</span>
                                        <span>{s}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="space-y-2">
                            <p className="text-sm font-semibold text-orange-500">⚠️ 개선 포인트</p>
                            <ul className="space-y-1">
                                {result.weaknesses.map((w, i) => (
                                    <li key={i} className="text-sm text-foreground flex gap-2">
                                        <span className="text-muted-foreground mt-0.5">•</span>
                                        <span>{w}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="space-y-2">
                            <p className="text-sm font-semibold text-blue-500">🎯 코칭 팁</p>
                            <ul className="space-y-1">
                                {result.tips.map((t, i) => (
                                    <li key={i} className="text-sm text-foreground flex gap-2">
                                        <span className="text-muted-foreground mt-0.5">•</span>
                                        <span>{t}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="border-t border-border pt-3">
                            <button
                                onClick={handleGenerate}
                                disabled={isPending}
                                className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                            >
                                {isPending ? '분석 중...' : '↻ 다시 분석'}
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="text-center space-y-3 py-2">
                        <p className="text-sm text-muted-foreground">
                            AI가 나의 경기 데이터를 분석해 강점·약점·코칭 팁을 제공합니다.
                        </p>
                        {error && (
                            <p className="text-sm text-red-500">{error}</p>
                        )}
                        <button
                            onClick={handleGenerate}
                            disabled={isPending}
                            className="inline-flex items-center gap-2 text-sm border border-border rounded-[4px] px-4 py-2 hover:border-input transition-colors disabled:opacity-40"
                        >
                            {isPending ? (
                                <>
                                    <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                                    분석 중...
                                </>
                            ) : (
                                '✨ AI 코칭 분석 시작'
                            )}
                        </button>
                        <p className="text-xs text-muted-foreground">Claude AI가 분석합니다 · 결과는 24시간 캐시됩니다</p>
                    </div>
                )}
            </div>
        </section>
    )
}

