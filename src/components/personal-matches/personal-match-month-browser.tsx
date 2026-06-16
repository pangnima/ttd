'use client'

import { useState } from 'react'
import type { MonthGroup } from '@/lib/personal-matches/grouping'
import { CARD_BASE } from '@/lib/dashboard/tokens'
import { formatRecord } from '@/lib/dashboard/outcome'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { PersonalMatchCard } from '@/components/personal-matches/personal-match-card'

type Props = {
    groups: MonthGroup[]   // 월 내림차순(최신 먼저)
}

// 월별 승패 요약 라벨: '2026년 6월 (1승 0패)' / 무가 있으면 '... 1무' 추가
function monthOptionLabel(g: MonthGroup): string {
    return `${g.label} (${formatRecord(g.wins, g.losses, g.draws)})`
}

// 개인 경기 미리보기 — 월 선택 selectbox + 선택 월 경기 목록(최대 600px 스크롤).
export function PersonalMatchMonthBrowser({ groups }: Props) {
    const [ym, setYm] = useState<string>(groups[0]?.ym ?? '')

    const selected = groups.find((g) => g.ym === ym) ?? groups[0]
    if (!selected) return null

    // base-ui Select.Value는 raw value를 표시하므로 value→label 매핑을 items로 넘긴다.
    const items = groups.map((g) => ({ value: g.ym, label: monthOptionLabel(g) }))

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <Select value={ym} onValueChange={(v) => v && setYm(v)} items={items}>
                    <SelectTrigger className="w-full sm:w-[220px] h-8 text-sm">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {groups.map((g) => (
                            <SelectItem key={g.ym} value={g.ym}>
                                {monthOptionLabel(g)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <span className="ml-auto text-xs text-muted-foreground shrink-0">
                    승률 {selected.winRate}%
                </span>
            </div>

            <div className="max-h-[600px] overflow-y-auto pr-1">
                <div className={`${CARD_BASE} divide-y divide-border/60`}>
                    {selected.matches.map((m) => (
                        <PersonalMatchCard key={m.id} match={m} />
                    ))}
                </div>
            </div>
        </div>
    )
}
