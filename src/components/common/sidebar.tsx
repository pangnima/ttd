'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
    topNavItems, myMatchNavItems, clubNavItems, buildPersonalNavItem, isPersonalNavActive,
} from '@/lib/nav-items'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { ClubNavTree } from '@/components/common/club-nav-tree'
import { BrandLogo, WORDMARK_CLASS } from '@/components/common/brand-logo'
import { useSidebar } from '@/components/common/sidebar-context'

type SidebarProps = {
    currentPath?: string
    /** 가입한 클럽 목록 (layout에서 주입, 클럽 트리로 노출) */
    clubs?: { id: string; name: string }[]
    /** 로그인 사용자 id ('개인' 메뉴 href 생성용, 아이콘은 클라이언트에서 직접 렌더링) */
    userId?: string | null
    /** 받은 확인 요청 pending + 결과 제안 + 경기 리스트 방 초대 건수 (경기 확인 요청 메뉴 뱃지) */
    myTurnCount?: number
}

export function Sidebar({ currentPath, clubs = [], userId, myTurnCount = 0 }: SidebarProps) {
    const pathname = usePathname()
    const { collapsed } = useSidebar()
    const activePath = currentPath ?? pathname

    // 개인 섹션: '개인'(본인 프로필, scope 무관) + 개인 경기 등록(목록·생성·수정) + 경기 리스트(목록·상세) + 경기 확인 요청
    const myNavItems = userId ? [buildPersonalNavItem(userId), ...myMatchNavItems] : []
    const myNavActive = (href: string) => {
        if (href.startsWith('/me/personal-matches')) return activePath.startsWith('/me/personal-matches')
        if (href.startsWith('/match-rooms')) return activePath.startsWith('/match-rooms')
        if (href.startsWith('/me/match-requests')) return activePath.startsWith('/me/match-requests')
        return userId ? isPersonalNavActive(activePath, userId) : false
    }

    // 메인 네비 active 판정 — /clubs는 탐색·생성 페이지에서만 켜고, 특정 클럽 하위(/clubs/[id]/...)는
    // "내가 가입한 클럽" 트리가 담당하므로 prefix 매칭을 쓰지 않는다.
    const mainActive = (href: string) => activePath === href || activePath === `${href}/new`

    // 단순 메뉴 항목 — rail/펼침 단일 마크업, 클래스만 토글해 폭과 함께 부드럽게 전환
    const rowClass = (active: boolean) =>
        cn(
            'flex items-center h-10 rounded-lg text-body2 font-medium transition-colors',
            collapsed ? 'gap-0 justify-center px-0 w-10 mx-auto' : 'gap-3 px-3',
            active
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )

    // 라벨 — rail에서 max-width/opacity로 페이드(width:auto는 트랜지션 불가하므로 max-width 사용)
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
                <Link href="/clubs" className="flex items-center gap-2.5 min-w-0" aria-label="BASELINE 홈">
                    <BrandLogo wordmark={false} size="sm" className="shrink-0" />
                    <span className={cn(labelClass, WORDMARK_CLASS, 'text-body')}>BASELINE</span>
                </Link>
            </div>

            {/* 메인 네비게이션 — rail에서는 플라이아웃이 사이드바 밖으로 나가야 하므로 overflow를 자르지 않는다 */}
            <nav className={cn('flex-1 min-h-0 p-3 space-y-0.5', collapsed ? 'overflow-visible' : 'overflow-y-auto overflow-x-hidden')}>
                {/* 사용 가이드 등 상단 단독 메뉴 */}
                {topNavItems.map(({ href, label, icon: Icon }) => (
                    <Link
                        key={href}
                        href={href}
                        className={rowClass(mainActive(href))}
                        aria-label={collapsed ? label : undefined}
                    >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className={labelClass}>{label}</span>
                    </Link>
                ))}

                {/* 개인 섹션: '개인' 통계 허브(개인/클럽/통합 구분은 페이지 탭) + 개인 경기 등록 + 경기 확인 요청 (로그인 시) */}
                {myNavItems.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border/40 space-y-0.5">
                        {myNavItems.map(({ href, label, icon: Icon }) => {
                            const active = myNavActive(href)
                            const showBadge = href === '/me/match-requests' && myTurnCount > 0
                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    className={cn(rowClass(active), 'relative')}
                                    aria-label={collapsed ? label : undefined}
                                >
                                    <Icon className="w-4 h-4 shrink-0" />
                                    <span className={labelClass}>{label}</span>
                                    {showBadge && !collapsed && (
                                        <span className="ml-auto text-micro font-semibold px-1.5 py-0.5 rounded-full bg-spot/15 text-spot tabular-nums">
                                            {myTurnCount}
                                        </span>
                                    )}
                                    {showBadge && collapsed && (
                                        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-spot-solid" aria-hidden />
                                    )}
                                </Link>
                            )
                        })}
                    </div>
                )}

                {/* 클럽 찾기 — 개인 섹션 아래, 가입 클럽 트리 위 */}
                <div className="mt-2 pt-2 border-t border-border/40 space-y-0.5">
                    {clubNavItems.map(({ href, label, icon: Icon }) => (
                        <Link
                            key={href}
                            href={href}
                            className={rowClass(mainActive(href))}
                            aria-label={collapsed ? label : undefined}
                        >
                            <Icon className="w-4 h-4 shrink-0" />
                            <span className={labelClass}>{label}</span>
                        </Link>
                    ))}

                    {/* 내가 가입한 클럽: 클럽별로 홈·대진표를 아코디언으로 노출 */}
                    <ClubNavTree clubs={clubs} variant="desktop" collapsed={collapsed} />
                </div>
            </nav>

            {/* 테마 토글 — 하단 고정 */}
            <div className={cn('border-t border-foreground/5 dark:border-foreground/10 transition-[padding] duration-200', collapsed ? 'p-2' : 'p-3')}>
                <ThemeToggle collapsed={collapsed} />
            </div>
        </aside>
    )
}
