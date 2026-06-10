'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { PersonalMatch } from '@/types'
import { PersonalMatchListItem } from '@/components/personal-matches/personal-match-list-item'

type Filter = 'all' | 'singles' | 'doubles'

const FILTERS: { value: Filter; label: string }[] = [
    { value: 'all', label: '전체' },
    { value: 'singles', label: '단식' },
    { value: 'doubles', label: '복식' },
]

type Props = {
    matches: PersonalMatch[]
}

/**
 * 개인 경기 목록 + 단식/복식 필터 탭.
 * 데이터는 서버에서 이미 로드되어 클라이언트에서 matchType 기준으로 필터링한다.
 */
export function PersonalMatchList({ matches }: Props) {
    const [filter, setFilter] = useState<Filter>('all')

    const visible = matches.filter((m) => {
        if (filter === 'all') return true
        if (filter === 'singles') return m.matchType === 'singles'
        return m.matchType !== 'singles'
    })

    return (
        <div className="space-y-3">
            <div className="flex gap-1.5">
                {FILTERS.map(({ value, label }) => {
                    const active = filter === value
                    return (
                        <button
                            key={value}
                            type="button"
                            onClick={() => setFilter(value)}
                            className={`px-3 py-1.5 text-xs rounded-[4px] border transition-colors ${
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

            {visible.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-muted/30 text-muted-foreground text-sm text-center py-12">
                    해당하는 경기 기록이 없습니다.{' '}
                    <Link href="/me/personal-matches/new" className="underline underline-offset-2 hover:text-foreground">
                        경기를 기록해보세요
                    </Link>
                </div>
            ) : (
                <div className="rounded-xl border border-border bg-card divide-y divide-border">
                    {visible.map((m) => (
                        <PersonalMatchListItem key={m.id} match={m} />
                    ))}
                </div>
            )}
        </div>
    )
}
