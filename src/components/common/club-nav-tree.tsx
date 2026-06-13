'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { UsersRound, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

type ClubNavTreeProps = {
    clubs: { id: string; name: string }[]
    userId?: string | null
    variant: 'desktop' | 'mobile'
    /** 모바일 시트에서 링크 클릭 시 시트를 닫기 위한 콜백 */
    onNavigate?: () => void
}

const VARIANT = {
    desktop: {
        section: 'mt-2 pt-2 border-t border-border/40',
        header: 'flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-muted-foreground',
        clubButton:
            'flex items-center gap-1.5 w-full px-3 py-2.5 pl-7 rounded-lg text-[13px] font-medium text-muted-foreground hover:bg-foreground/5 hover:text-foreground transition-colors',
        linkBase: 'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
        linkActive: 'bg-foreground/10 text-foreground',
        linkIdle: 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground',
    },
    mobile: {
        section: 'mt-2 pt-2 border-t border-foreground/5 dark:border-foreground/10',
        header: 'flex items-center gap-3 px-3 py-2 text-sm font-medium text-sidebar-foreground/70',
        clubButton:
            'flex items-center gap-1.5 w-full px-3 py-2 pl-7 rounded-md text-[13px] font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors',
        linkBase: 'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
        linkActive: 'bg-sidebar-accent text-sidebar-accent-foreground',
        linkIdle: 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
    },
} as const

export function ClubNavTree({ clubs, userId, variant, onNavigate }: ClubNavTreeProps) {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const s = VARIANT[variant]

    // 내 전적 하위 메뉴 active 판정 — scope 미지정은 'total'로 간주
    const onProfile = pathname.startsWith('/profile/')
    const currentScope = searchParams.get('scope') ?? 'total'
    const scopeActive = (scope: string) => onProfile && currentScope === scope
    const isClubActive = (id: string) =>
        pathname === `/clubs/${id}` || pathname.startsWith(`/clubs/${id}/match-games`) || scopeActive(id)

    // 현재 보고 있는 클럽 — 펼침 기본값 및 경로 변경 시 자동 펼침에 사용
    const activeClubId = clubs.find((c) => isClubActive(c.id))?.id ?? null

    // 기본: 모두 접되 현재 클럽만 펼침 / 여러 클럽 동시 펼침 허용
    const [expanded, setExpanded] = useState<Set<string>>(() => {
        const init = new Set<string>()
        if (activeClubId) init.add(activeClubId)
        return init
    })

    // 경로 이동으로 active 클럽이 바뀌면 펼침에 추가만 한다(다른 클럽은 유지)
    useEffect(() => {
        if (!activeClubId) return
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setExpanded((prev) => {
            if (prev.has(activeClubId)) return prev
            const next = new Set(prev)
            next.add(activeClubId)
            return next
        })
    }, [activeClubId])

    const toggle = (id: string) => {
        setExpanded((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const linkClass = (active: boolean) => cn(s.linkBase, active ? s.linkActive : s.linkIdle, 'pl-12 text-[13px]')

    if (clubs.length === 0) return null

    return (
        <div className={s.section}>
            <div className={s.header}>
                <UsersRound className="w-4 h-4 shrink-0" />
                내가 가입한 클럽
            </div>
            <div className="space-y-1">
                {clubs.map((club) => {
                    const isOpen = expanded.has(club.id)
                    return (
                        <div key={club.id}>
                            <button
                                type="button"
                                onClick={() => toggle(club.id)}
                                aria-expanded={isOpen}
                                className={s.clubButton}
                            >
                                <ChevronDown
                                    className={cn('w-3.5 h-3.5 shrink-0 transition-transform', isOpen && 'rotate-180')}
                                />
                                <span className="truncate">{club.name}</span>
                            </button>
                            {isOpen && (
                                <div className="space-y-0.5">
                                    <Link
                                        href={`/clubs/${club.id}`}
                                        onClick={onNavigate}
                                        className={linkClass(pathname === `/clubs/${club.id}`)}
                                    >
                                        홈
                                    </Link>
                                    <Link
                                        href={`/clubs/${club.id}/match-games`}
                                        onClick={onNavigate}
                                        className={linkClass(pathname.startsWith(`/clubs/${club.id}/match-games`))}
                                    >
                                        대진표
                                    </Link>
                                    {userId && (
                                        <Link
                                            href={`/profile/${userId}?scope=${club.id}`}
                                            onClick={onNavigate}
                                            className={linkClass(scopeActive(club.id))}
                                        >
                                            내 전적
                                        </Link>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
