'use client'

import { useState } from 'react'
import type { TrendStatsResult } from '@/lib/analytics/trend-stats'
import { SectionCard } from '@/components/common/section-card'
import { SegmentedToggle } from '@/components/common/segmented-toggle'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { TEXT_MUTED } from '@/lib/dashboard/tokens'
import { WinRateTrendBody } from '@/components/stats/win-rate-trend-body'

export type YearTrend = {
    year: number
    daily: TrendStatsResult    // 요일별(월~일)
    weekly: TrendStatsResult   // 연중 주차별
    monthly: TrendStatsResult  // 월별
}

type Props = {
    years: YearTrend[]   // 내림차순(최신 연도 먼저)
}

type Mode = 'daily' | 'weekly' | 'monthly'

const OPTIONS: { value: Mode; label: string }[] = [
    { value: 'daily', label: '일간' },
    { value: 'weekly', label: '주간' },
    { value: 'monthly', label: '월간' },
]

// 내 승률 추이 — 연도 스코프 + 일간/주간/월간 토글. 데이터는 서버에서 연도별로 집계해 전달, 클라에서 전환만.
export function WinRateTrendCard({ years }: Props) {
    const [mode, setMode] = useState<Mode>('monthly')
    const [year, setYear] = useState<number>(years[0]?.year ?? 0)

    const current = years.find((y) => y.year === year) ?? years[0]
    const result = current ? current[mode] : null
    const isEmpty = !result || result.points.length === 0
    const best = result?.bestPoint ?? null

    return (
        <SectionCard
            title="내 승률 추이"
            isEmpty={years.length === 0}
            emptyMessage="기록된 경기가 없습니다"
            contentClass="p-4 flex flex-col gap-3"
            headerRight={
                <div className="flex items-center gap-2">
                    {years.length > 1 && (
                        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                            <SelectTrigger className="h-8 w-[88px] text-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {years.map((y) => (
                                    <SelectItem key={y.year} value={String(y.year)}>
                                        {y.year}년
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                    <SegmentedToggle options={OPTIONS} value={mode} onValueChange={setMode} />
                </div>
            }
        >
            {result && !isEmpty && (
                <>
                    <WinRateTrendBody result={result} minPointWidth={mode === 'daily' ? undefined : 48} />
                    {best && (
                        <p className={`text-xs ${TEXT_MUTED}`}>
                            최고 승률 <span className="text-win font-semibold">{best.label} {best.winRate}%</span>
                            <span className="mx-1.5">·</span>총 {result.totalGames}경기
                        </p>
                    )}
                </>
            )}
            {result && isEmpty && years.length > 0 && (
                <p className={`text-sm ${TEXT_MUTED} text-center py-6`}>{year}년 기록이 없습니다</p>
            )}
        </SectionCard>
    )
}
