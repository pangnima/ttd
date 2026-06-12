'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { LayoutList, LayoutGrid } from 'lucide-react'

export type MatchViewMode = 'list' | 'grid'

// URL 쿼리(?view=)에서 현재 뷰 모드를 읽는다. 기본값은 'list'.
export function readViewMode(value: string | null): MatchViewMode {
    return value === 'grid' ? 'grid' : 'list'
}

type MatchViewToggleProps = {
    mode: MatchViewMode
}

// 리스트 ↔ 매트릭스 뷰 토글. 선택값을 URL 쿼리 ?view= 로 유지(새로고침·공유 시 보존).
export function MatchViewToggle({ mode }: MatchViewToggleProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const handleChange = (next: MatchViewMode) => {
        if (next === mode) return
        const params = new URLSearchParams(searchParams.toString())
        if (next === 'list') params.delete('view')
        else params.set('view', next)
        const query = params.toString()
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    }

    return (
        <div className="inline-flex gap-0.5 rounded-lg bg-muted/30 p-0.5">
            <ToggleButton
                label="리스트"
                active={mode === 'list'}
                onClick={() => handleChange('list')}
                icon={<LayoutList className="w-3.5 h-3.5" />}
            />
            <ToggleButton
                label="매트릭스"
                active={mode === 'grid'}
                onClick={() => handleChange('grid')}
                icon={<LayoutGrid className="w-3.5 h-3.5" />}
            />
        </div>
    )
}

function ToggleButton({
    label, active, onClick, icon,
}: {
    label: string
    active: boolean
    onClick: () => void
    icon: React.ReactNode
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                active
                    ? 'bg-background text-foreground shadow-sm border border-border'
                    : 'text-muted-foreground hover:text-foreground'
            }`}
        >
            {icon}
            {label}
        </button>
    )
}
