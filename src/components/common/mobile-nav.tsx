'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
    topNavItems, myMatchNavItems, clubNavItems, buildPersonalNavItem, isPersonalNavActive,
} from '@/lib/nav-items'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { ClubNavTree } from '@/components/common/club-nav-tree'
import { BrandLogo } from '@/components/common/brand-logo'

type MobileNavProps = {
    clubs?: { id: string; name: string }[]
    /** 로그인 사용자 id — (main)/layout → Header 경유 (개인 섹션 노출·'개인' href) */
    userId?: string | null
    /** 확인 요청 pending + 결과 제안 + 방 초대 건수 — 서버 fetchPendingReceivedCount 1곳에서 계산해 props로 전달 */
    pendingRequestCount?: number
}

export function MobileNav({ clubs = [], userId = null, pendingRequestCount = 0 }: MobileNavProps) {
    const [open, setOpen] = useState(false)
    const pathname = usePathname()

    // 개인 섹션: '개인'(본인 프로필, scope 무관) + 개인 경기 등록 + 경기 리스트 + 경기 확인 요청
    const myNavItems = userId ? [buildPersonalNavItem(userId), ...myMatchNavItems] : []
    const myNavActive = (href: string) => {
        if (href.startsWith('/me/personal-matches')) return pathname.startsWith('/me/personal-matches')
        if (href.startsWith('/match-rooms')) return pathname.startsWith('/match-rooms')
        if (href.startsWith('/me/match-requests')) return pathname.startsWith('/me/match-requests')
        return userId ? isPersonalNavActive(pathname, userId) : false
    }
    // 메인 네비 active 판정 — /clubs는 탐색·생성 페이지에서만 켜고, 특정 클럽 하위는 가입 클럽 트리가 담당.
    const mainActive = (href: string) => pathname === href || pathname === `${href}/new`

    const navLinkClass = (active: boolean) =>
        cn(
            'flex items-center gap-3 px-3 py-2 rounded-md text-body2 font-medium transition-colors',
            active
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
        )

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
                className="md:hidden p-2 rounded-md hover:bg-muted transition-colors"
                aria-label="메뉴 열기"
            >
                <Menu className="w-5 h-5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-56 p-0 gap-0" showCloseButton={false}>
                {/* 로고(좌, 메뉴 아이콘과 px-6 정렬) ↔ 닫기(우), 양쪽 수직 중앙 정렬 */}
                <SheetHeader className="h-14 flex-row items-center justify-between px-6 py-0 border-b">
                    <SheetTitle className="text-left leading-none">
                        <BrandLogo size="sm" />
                    </SheetTitle>
                    <SheetClose
                        aria-label="메뉴 닫기"
                        className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                        <X className="size-4" />
                    </SheetClose>
                </SheetHeader>

                {/* 메인 네비게이션 */}
                <nav className="flex-1 min-h-0 overflow-y-auto p-3 space-y-1">
                    {/* 사용 가이드 등 상단 단독 메뉴 */}
                    {topNavItems.map(({ href, label, icon: Icon }) => (
                        <Link
                            key={href}
                            href={href}
                            onClick={() => setOpen(false)}
                            className={navLinkClass(mainActive(href))}
                        >
                            <Icon className="w-4 h-4" />
                            {label}
                        </Link>
                    ))}

                    {/* 개인 섹션 (로그인 시) */}
                    {myNavItems.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-foreground/5 dark:border-foreground/10 space-y-1">
                            {myNavItems.map(({ href, label, icon: Icon }) => {
                                const active = myNavActive(href)
                                const showBadge = href === '/me/match-requests' && pendingRequestCount > 0
                                return (
                                    <Link
                                        key={href}
                                        href={href}
                                        onClick={() => setOpen(false)}
                                        className={navLinkClass(active)}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {label}
                                        {showBadge && (
                                            <span className="ml-auto text-micro font-semibold px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-600 dark:text-orange-400 tabular-nums">
                                                {pendingRequestCount}
                                            </span>
                                        )}
                                    </Link>
                                )
                            })}
                        </div>
                    )}

                    {/* 클럽 찾기 — 개인 섹션 아래, 가입 클럽 트리 위 */}
                    <div className="mt-2 pt-2 border-t border-foreground/5 dark:border-foreground/10 space-y-1">
                        {clubNavItems.map(({ href, label, icon: Icon }) => (
                            <Link
                                key={href}
                                href={href}
                                onClick={() => setOpen(false)}
                                className={navLinkClass(mainActive(href))}
                            >
                                <Icon className="w-4 h-4" />
                                {label}
                            </Link>
                        ))}

                        {/* 내가 가입한 클럽: 클럽별로 홈·대진표를 아코디언으로 노출 */}
                        <ClubNavTree clubs={clubs} variant="mobile" onNavigate={() => setOpen(false)} />
                    </div>
                </nav>

                {/* 테마 토글 — 하단 고정 (노치/홈 인디케이터 기기 대비 safe-area 패딩) */}
                <div className="p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-foreground/5 dark:border-foreground/10">
                    <ThemeToggle />
                </div>
            </SheetContent>
        </Sheet>
    )
}
