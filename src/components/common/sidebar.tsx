'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
    myMatchNavItems, buildPersonalNavItem, guideNavItem, isNavItemActive, personalNavHref,
} from '@/lib/nav-items'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { BrandLogo, WORDMARK_CLASS } from '@/components/common/brand-logo'
import { useSidebar } from '@/components/common/sidebar-context'
import { SidebarNavRow } from '@/components/common/sidebar-nav-row'

type SidebarProps = {
    currentPath?: string
    /** 로그인 사용자 id ('개인' 메뉴 href 생성용, 아이콘은 클라이언트에서 직접 렌더링) */
    userId?: string | null
    /** 「참여 중인 매칭」에 그려지는 강조 카드 수 — 방 초대 + 내 차례가 있는 방 (그 메뉴의 뱃지) */
    myTurnCount?: number
}

export function Sidebar({ currentPath, userId, myTurnCount = 0 }: SidebarProps) {
    const pathname = usePathname()
    const { collapsed } = useSidebar()
    const activePath = currentPath ?? pathname

    // 개인 섹션: '개인'(본인 프로필) + 매칭 리스트(전체) + 참여 중인 매칭(내 방) + 개인 경기 결과(끝난 것)
    const myNavItems = userId ? [buildPersonalNavItem(userId), ...myMatchNavItems] : []

    // 라벨은 rail에서 max-width/opacity로 페이드(width:auto는 트랜지션 불가하므로 max-width 사용)
    const labelClass = cn(
        'overflow-hidden whitespace-nowrap transition-all duration-200',
        collapsed ? 'max-w-0 opacity-0' : 'max-w-40 opacity-100'
    )

    return (
        <aside
            className={cn(
                'hidden md:flex flex-col shrink-0 border-r border-foreground/5 dark:border-foreground/10 bg-card transition-[width] duration-200',
                collapsed ? 'w-16' : 'w-60'
            )}
        >
            {/* 로고 영역 */}
            <div
                className={cn(
                    'h-14 flex items-center border-b border-foreground/5 dark:border-foreground/10 transition-[padding] duration-200',
                    collapsed ? 'justify-center px-2' : 'px-5'
                )}
            >
                <Link href={userId ? personalNavHref(userId) : '/'} className="flex items-center gap-2.5 min-w-0" aria-label="BASELINE 홈">
                    <BrandLogo wordmark={false} size="sm" className="shrink-0" />
                    <span className={cn(labelClass, WORDMARK_CLASS, 'text-body')}>BASELINE</span>
                </Link>
            </div>

            {/* 메인 네비게이션 — rail에서는 플라이아웃이 사이드바 밖으로 나가야 하므로 overflow를 자르지 않는다 */}
            <nav className={cn('flex-1 min-h-0 p-3 space-y-0.5', collapsed ? 'overflow-visible' : 'overflow-y-auto overflow-x-hidden')}>
                {/* 개인 섹션: '개인' 통계 허브(개인/클럽/통합 구분은 페이지 탭) + 매칭 리스트 + 개인 경기 결과 (로그인 시) */}
                {myNavItems.length > 0 && (
                    <div className="space-y-0.5">
                        {myNavItems.map((item) => (
                            <SidebarNavRow
                                key={item.href}
                                item={item}
                                active={isNavItemActive(item, activePath, userId ?? null)}
                                collapsed={collapsed}
                                badgeCount={item.badge ? myTurnCount : 0}
                            />
                        ))}
                    </div>
                )}
                {/* 사용 가이드 — 로그인 무관. 개인 섹션이 있으면 구분선 뒤, 없으면(비로그인) 이 한 줄뿐 */}
                <div className={cn(myNavItems.length > 0 && 'mt-2 border-t border-foreground/5 dark:border-foreground/10 pt-2')}>
                    <SidebarNavRow
                        item={guideNavItem}
                        active={isNavItemActive(guideNavItem, activePath, userId ?? null)}
                        collapsed={collapsed}
                    />
                </div>
            </nav>

            {/* 테마 토글 — 하단 고정 */}
            <div className={cn('border-t border-foreground/5 dark:border-foreground/10 transition-[padding] duration-200', collapsed ? 'p-2' : 'p-3')}>
                <ThemeToggle collapsed={collapsed} />
            </div>
        </aside>
    )
}
