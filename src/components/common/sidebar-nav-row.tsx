'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { NavItem } from '@/lib/nav-items'

type SidebarNavRowProps = {
    item: NavItem
    active: boolean
    collapsed: boolean
    /** 그 메뉴에 달 뱃지 숫자 — 0이면 없음 (item.badge가 true인 메뉴만 넘긴다) */
    badgeCount?: number
}

/**
 * 사이드바 메뉴 한 행 — rail/펼침 단일 마크업, 클래스만 토글해 폭과 함께 부드럽게 전환.
 * 라벨은 rail에서 max-width/opacity로 페이드한다(width:auto는 트랜지션 불가하므로 max-width 사용).
 */
export function SidebarNavRow({ item, active, collapsed, badgeCount = 0 }: SidebarNavRowProps) {
    const { href, label, icon: Icon } = item
    const showBadge = badgeCount > 0
    return (
        <Link
            href={href}
            className={cn(
                'relative flex items-center h-10 rounded-lg text-body2 font-medium transition-colors',
                collapsed ? 'gap-0 justify-center px-0 w-10 mx-auto' : 'gap-3 px-3',
                active
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
            aria-label={collapsed ? label : undefined}
        >
            <Icon className="w-4 h-4 shrink-0" />
            <span
                className={cn(
                    'overflow-hidden whitespace-nowrap transition-all duration-200',
                    collapsed ? 'max-w-0 opacity-0' : 'max-w-40 opacity-100',
                )}
            >
                {label}
            </span>
            {showBadge && !collapsed && (
                <span className="ml-auto text-micro font-semibold px-1.5 py-0.5 rounded-full bg-spot/15 text-spot tabular-nums">
                    {badgeCount}
                </span>
            )}
            {showBadge && collapsed && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-spot-solid" aria-hidden />
            )}
        </Link>
    )
}
