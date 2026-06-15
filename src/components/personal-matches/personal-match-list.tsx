'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import type { PersonalMatch } from '@/types'
import { groupByMonth } from '@/lib/personal-matches/grouping'
import { deletePersonalMatchAction } from '@/lib/actions/personal-matches'
import { PersonalMatchMonthGroup } from '@/components/personal-matches/personal-match-month-group'

type Filter = 'all' | 'singles' | 'doubles'

const FILTERS: { value: Filter; label: string }[] = [
    { value: 'all', label: '전체' },
    { value: 'singles', label: '단식' },
    { value: 'doubles', label: '복식' },
]

type Props = {
    matches: PersonalMatch[]
}

function MatchActions({ id }: { id: string }) {
    const [isPending, startTransition] = useTransition()
    function handleDelete() {
        if (!confirm('이 경기 기록을 삭제할까요?')) return
        startTransition(async () => { await deletePersonalMatchAction(id) })
    }
    return (
        <span className="flex items-center gap-1.5 ml-1">
            <Link href={`/me/personal-matches/${id}/edit`} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                수정
            </Link>
            <button onClick={handleDelete} disabled={isPending} className="text-xs text-destructive/80 hover:text-destructive transition-colors disabled:opacity-40">
                삭제
            </button>
        </span>
    )
}

/** 개인 경기 목록 — 단식/복식 필터 + 월별 그룹 카드. */
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

            {groups.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-muted/30 text-muted-foreground text-sm text-center py-12">
                    해당하는 경기 기록이 없습니다.{' '}
                    <Link href="/me/personal-matches/new" className="underline underline-offset-2 hover:text-foreground">
                        경기를 기록해보세요
                    </Link>
                </div>
            ) : (
                groups.map((group) => (
                    <PersonalMatchMonthGroup key={group.ym} group={group} renderActions={(id) => <MatchActions id={id} />} />
                ))
            )}
        </div>
    )
}
