'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { NavItem } from '@/lib/nav-items'

type MobileNavRowProps = {
    item: NavItem
    active: boolean
    /** 그 메뉴에 달 뱃지 숫자 — 0이면 없음 (item.badge가 true인 메뉴만 넘긴다) */
    badgeCount?: number
    /** 링크를 누르면 시트를 닫는다 */
    onNavigate: () => void
}

/** 모바일 시트의 메뉴 한 행 — 사이드바 행과 색 토큰(sidebar-accent 계열)이 달라 따로 둔다 */
export function MobileNavRow({ item, active, badgeCount = 0, onNavigate }: MobileNavRowProps) {
    const { href, label, icon: Icon } = item
    return (
        <Link
            href={href}
            onClick={onNavigate}
            className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-body2 font-medium transition-colors',
                active
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            )}
        >
            <Icon className="w-4 h-4" />
            {label}
            {badgeCount > 0 && (
                <span className="ml-auto text-micro font-semibold px-1.5 py-0.5 rounded-full bg-spot/15 text-spot tabular-nums">
                    {badgeCount}
                </span>
            )}
        </Link>
    )
}
