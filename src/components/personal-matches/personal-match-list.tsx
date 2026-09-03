'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { PersonalMatch } from '@/types'
import { groupByMonth } from '@/lib/personal-matches/grouping'
import { PersonalMatchMonthGroup } from '@/components/personal-matches/personal-match-month-group'
import { MatchActions } from '@/components/personal-matches/match-actions'

type Filter = 'all' | 'singles' | 'doubles'

const FILTERS: { value: Filter; label: string }[] = [
    { value: 'all', label: '전체' },
    { value: 'singles', label: '단식' },
    { value: 'doubles', label: '복식' },
]

type Props = {
    matches: PersonalMatch[]
}

/** 개인 경기 목록 — 단식/복식 필터 + 월별 그룹 카드. 카드 액션(결과 입력·수정·삭제)은 MatchActions. */
export function PersonalMatchList({ matches }: Props) {
    const [filter, setFilter] = useState<Filter>('all')

    const visible = matches.filter((m) => {
        if (filter === 'all') return true
        if (filter === 'singles') return m.matchType === 'singles'
        return m.matchType !== 'singles'
    })
    const groups = groupByMonth(visible)

    return (
        <div className="space-y-5">
            <div className="flex gap-1.5">
                {FILTERS.map(({ value, label }) => {
                    const active = filter === value
                    return (
                        <button
                            key={value}
                            type="button"
                            onClick={() => setFilter(value)}
                            className={`px-3 py-1.5 text-caption rounded-[4px] border transition-colors ${
                                active
                                    ? 'border-primary bg-primary/10 text-foreground font-medium'
                                    : 'border-border text-muted-foreground hover:border-input hover:text-foreground'
                            }`}
                        >
                            {label}
                        </button>
                    )
                })}
            </div>

            {groups.length === 0 ? (
                <div className="rounded-xl border border-dashed border-input bg-muted/30 text-muted-foreground text-body2 text-center py-12">
                    해당하는 경기 기록이 없습니다.{' '}
                    <Link href="/me/personal-matches/new" className="underline underline-offset-2 hover:text-foreground">
                        경기를 기록해보세요
                    </Link>
                </div>
            ) : (
                groups.map((group) => (
                    <PersonalMatchMonthGroup key={group.ym} group={group} renderActions={(m) => <MatchActions match={m} />} />
                ))
            )}
        </div>
    )
}
