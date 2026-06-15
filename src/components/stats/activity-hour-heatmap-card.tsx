'use client'

import { useState } from 'react'
import type { HourHeatmap } from '@/lib/analytics/hour-heatmap'
import { WEEKDAY_LABELS } from '@/lib/analytics/date-utils'
import { SectionCard } from '@/components/common/section-card'
import { SegmentedToggle } from '@/components/common/segmented-toggle'
import { TEXT_MUTED } from '@/lib/dashboard/tokens'

type Props = {
    weekly: HourHeatmap
    monthly: HourHeatmap
}

type Mode = 'weekly' | 'monthly'

const OPTIONS: { value: Mode; label: string }[] = [
    { value: 'weekly', label: '주간' },
    { value: 'monthly', label: '월간' },
]

const HOURS = Array.from({ length: 24 }, (_, h) => h)

// 활동량(count) → maxCount 기준 라임 강도
function cellClass(count: number, maxCount: number): string {
    if (count === 0) return 'bg-muted/40'
    if (maxCount <= 1) return 'bg-win/70'
    const ratio = count / maxCount
    if (ratio > 0.75) return 'bg-win/80'
    if (ratio > 0.5) return 'bg-win/60'
    if (ratio > 0.25) return 'bg-win/40'
    return 'bg-win/20'
}

// 경기 활동 — 요일(Y)×시간(X) 히트맵, 주간/월간 토글.
export function ActivityHourHeatmapCard({ weekly, monthly }: Props) {
    const [mode, setMode] = useState<Mode>('monthly')
    const data = mode === 'weekly' ? weekly : monthly
    const isEmpty = data.totalGames === 0

    const activeLabel = data.mostActive
        ? `${WEEKDAY_LABELS[data.mostActive.weekday]}요일 ${data.mostActive.hour}시대`
        : null

    return (
        <SectionCard
            title="경기 활동"
            isEmpty={isEmpty && data.untimed === 0}
            emptyMessage="기록된 경기가 없습니다"
            contentClass="p-4 space-y-3"
            headerRight={<SegmentedToggle options={OPTIONS} value={mode} onValueChange={setMode} />}
        >
            {isEmpty ? (
                <p className={`text-xs ${TEXT_MUTED}`}>이 기간에 시간 기록이 있는 경기가 없습니다.</p>
            ) : (
                <div className="overflow-x-auto">
                    <div className="flex flex-col gap-[3px]">
                        {WEEKDAY_LABELS.map((label, w) => (
                            <div key={label} className="flex items-center gap-[4px]">
                                <span className={`sticky left-0 z-10 w-5 shrink-0 bg-card pr-0.5 text-[10px] ${TEXT_MUTED}`}>{label}</span>
                                <div className="flex gap-[3px]">
                                    {HOURS.map((h) => (
                                        <div
                                            key={h}
                                            className={`aspect-square w-[18px] shrink-0 rounded-[2px] ${cellClass(data.grid[w][h], data.maxCount)}`}
                                            title={`${label}요일 ${h}시 · ${data.grid[w][h]}경기`}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                        <div className="flex gap-[3px] pl-[24px] text-[9px] text-muted-foreground/70">
                            {HOURS.map((h) => (
                                <span key={h} className="w-[18px] shrink-0 text-center">
                                    {h % 6 === 0 ? h : ''}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            <p className={`text-xs ${TEXT_MUTED}`}>
                {activeLabel && <>가장 활발한 시간대 <span className="text-foreground font-medium">{activeLabel}</span></>}
                {data.untimed > 0 && <span className="ml-1.5">· 시간 미입력 {data.untimed}건 제외</span>}
            </p>
        </SectionCard>
    )
}
