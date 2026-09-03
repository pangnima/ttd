'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UsersRound, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

type ClubNavTreeProps = {
    clubs: { id: string; name: string }[]
    variant: 'desktop' | 'mobile'
    /** 모바일 시트에서 링크 클릭 시 시트를 닫기 위한 콜백 */
    onNavigate?: () => void
    /** desktop rail(접힘) 상태 — 아이콘만 노출하고 하위는 호버 플라이아웃으로 */
    collapsed?: boolean
}

const VARIANT = {
    desktop: {
        section: 'mt-2 pt-2 border-t border-border/40',
        header: 'flex items-center gap-3 px-3 py-2.5 text-body2 font-medium text-muted-foreground',
        clubButton:
            'flex items-center gap-1.5 w-full px-3 py-2.5 pl-7 rounded-lg text-body2 font-medium text-muted-foreground hover:bg-foreground/5 hover:text-foreground transition-colors',
        linkBase: 'flex items-center gap-3 px-3 py-2.5 rounded-lg text-body2 font-medium transition-colors',
        linkActive: 'bg-foreground/10 text-foreground',
        linkIdle: 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground',
    },
    mobile: {
        section: 'mt-2 pt-2 border-t border-foreground/5 dark:border-foreground/10',
        header: 'flex items-center gap-3 px-3 py-2 text-body2 font-medium text-sidebar-foreground/70',
        clubButton:
            'flex items-center gap-1.5 w-full px-3 py-2 pl-7 rounded-md text-body2 font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors',
        linkBase: 'flex items-center gap-3 px-3 py-2 rounded-md text-body2 font-medium transition-colors',
        linkActive: 'bg-sidebar-accent text-sidebar-accent-foreground',
        linkIdle: 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
    },
} as const

export function ClubNavTree({ clubs, variant, onNavigate, collapsed = false }: ClubNavTreeProps) {
    const pathname = usePathname()
    const s = VARIANT[variant]

    // 클럽 활성 판정 — 경로 기반(홈·대진표). 클럽별 전적은 '개인' 페이지의 클럽 탭이 담당한다.
    const isClubActive = (id: string) =>
        pathname === `/clubs/${id}` || pathname.startsWith(`/clubs/${id}/match-games`)

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

    const linkClass = (active: boolean) => cn(s.linkBase, active ? s.linkActive : s.linkIdle, 'pl-12 text-body2')
    // 플라이아웃 내부 하위 링크 — 좁은 패널에 맞춰 들여쓰기를 줄이고 muted 토큰으로 라이트/다크 대비 확보
    const flyLinkClass = (active: boolean) =>
        cn(
            'flex items-center pl-7 pr-3 py-2 rounded-md text-body2 font-medium transition-colors',
            active ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )

    if (clubs.length === 0) return null

    // rail(접힘) 상태: 아이콘 하나만 노출하고 전체 클럽 트리는 호버 플라이아웃으로 펼쳐 보여준다.
    // 바깥 래퍼의 투명 브릿지 패딩(pl-1.5)으로 아이콘↔패널 hover 영역을 이어 끊김 없이 도달.
    if (collapsed) {
        return (
            <div className="group/rail relative mt-2 pt-2 border-t border-border/40">
                <div
                    className={cn(
                        'flex items-center justify-center w-10 h-10 mx-auto rounded-lg transition-colors',
                        clubs.some((c) => isClubActive(c.id)) ? 'bg-muted text-foreground' : 'text-muted-foreground'
                    )}
                >
                    <UsersRound className="w-4 h-4 shrink-0" />
                </div>
                <div className="invisible absolute left-full -top-1.5 z-50 pl-1.5 opacity-0 transition-opacity group-hover/rail:visible group-hover/rail:opacity-100">
                    <div className="max-h-[70vh] min-w-52 overflow-y-auto rounded-lg border border-border bg-popover p-1.5 shadow-sm dark:shadow-md">
                        {clubs.map((club) => (
                            <div key={club.id} className="mb-1 last:mb-0">
                                <div className={cn('px-3 py-1.5 text-body2 font-medium truncate', isClubActive(club.id) ? 'text-foreground' : 'text-muted-foreground')}>
                                    {club.name}
                                </div>
                                <div className="space-y-0.5">
                                    <Link href={`/clubs/${club.id}`} className={flyLinkClass(pathname === `/clubs/${club.id}`)}>
                                        홈
                                    </Link>
                                    <Link href={`/clubs/${club.id}/match-games`} className={flyLinkClass(pathname.startsWith(`/clubs/${club.id}/match-games`))}>
                                        대진표
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

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
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
