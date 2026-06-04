'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import type { AnalyticsScope } from '@/lib/queries/analytics'

type Props = {
    scope: AnalyticsScope
    clubs: { id: string; name: string }[]
    /** 탭 전환 시 이동할 base pathname */
    basePath?: string
}

export function AnalyticsModeTabs({ scope, clubs, basePath = '/me/analytics' }: Props) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const handleChange = (scopeValue: string) => {
        // scope 전환 시 불필요한 기존 파라미터(clubId 등)가 전파되지 않도록 새 파라미터 객체 생성
        const params = new URLSearchParams()
        params.set('scope', scopeValue)
        router.push(`${basePath}?${params.toString()}`)
    }

    const currentKey =
        scope.kind === 'personal'
            ? 'personal'
            : scope.kind === 'club'
            ? scope.clubId
            : 'total'

    return (
        <div className="flex flex-wrap gap-0.5 rounded-lg border border-border bg-muted/30 p-0.5">
            {/* 전체 탭 */}
            <TabButton
                label="전체"
                value="total"
                active={currentKey === 'total'}
                onClick={handleChange}
            />
            {/* 클럽별 탭 */}
            {clubs.map((club) => (
                <TabButton
                    key={club.id}
                    label={club.name}
                    value={club.id}
                    active={currentKey === club.id}
                    onClick={handleChange}
                />
            ))}
            {/* 개인 탭 */}
            <TabButton
                label="개인"
                value="personal"
                active={currentKey === 'personal'}
                onClick={handleChange}
            />
        </div>
    )
}

function TabButton({
    label,
    value,
    active,
    onClick,
}: {
    label: string
    value: string
    active: boolean
    onClick: (value: string) => void
}) {
    return (
        <button
            type="button"
            onClick={() => onClick(value)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all max-w-[120px] truncate ${
                active
                    ? 'bg-background text-foreground shadow-sm border border-border'
                    : 'text-muted-foreground hover:text-foreground'
            }`}
        >
            {label}
        </button>
    )
}
