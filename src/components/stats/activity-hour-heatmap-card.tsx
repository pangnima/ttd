'use client'

import { Fragment, useState } from 'react'
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
            contentClass="p-4 flex flex-col gap-3"
            headerRight={<SegmentedToggle options={OPTIONS} value={mode} onValueChange={setMode} />}
        >
            {isEmpty ? (
                <p className={`text-xs ${TEXT_MUTED}`}>이 기간에 시간 기록이 있는 경기가 없습니다.</p>
            ) : (
                <div
                    className="grid flex-1 gap-[3px]"
                    style={{
                        gridTemplateColumns: 'auto repeat(24, minmax(0, 1fr))',
                        gridTemplateRows: 'repeat(7, minmax(0, 1fr)) auto',
                    }}
                >
                    {WEEKDAY_LABELS.map((label, w) => (
                        <Fragment key={label}>
                            <span className={`self-center pr-1.5 text-right text-[12px] font-medium ${TEXT_MUTED}`}>{label}</span>
                            {HOURS.map((h) => (
                                <div
                                    key={h}
                                    className={`min-h-[18px] rounded-[3px] ${cellClass(data.grid[w][h], data.maxCount)}`}
                                    title={`${label}요일 ${h}시 · ${data.grid[w][h]}경기`}
                                />
                            ))}
                        </Fragment>
                    ))}
                    {/* 시간축: 거터 빈칸 + 시간 라벨 24개 (셀 컬럼과 수직 정렬) */}
                    <span aria-hidden />
                    {HOURS.map((h) => (
                        <span key={h} className={`text-center text-[12px] tabular-nums ${TEXT_MUTED}`}>
                            {h % 2 === 0 ? h : ''}
                        </span>
                    ))}
                </div>
            )}
            <p className={`text-xs ${TEXT_MUTED}`}>
                {activeLabel && <>가장 활발한 시간대 <span className="text-foreground font-medium">{activeLabel}</span></>}
                {data.untimed > 0 && <span className="ml-1.5">· 시간 미입력 {data.untimed}건 제외</span>}
            </p>
        </SectionCard>
    )
}
