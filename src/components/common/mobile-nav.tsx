'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
    myMatchNavItems, buildPersonalNavItem, guideNavItem, isNavItemActive,
} from '@/lib/nav-items'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { BrandLogo } from '@/components/common/brand-logo'
import { MobileNavRow } from '@/components/common/mobile-nav-row'

type MobileNavProps = {
    /** 로그인 사용자 id — (main)/layout → Header 경유 (개인 섹션 노출·'개인' href) */
    userId?: string | null
    /** 「참여 중인 매칭」의 '내 차례' 건수 — 서버 fetchRoomQueue 1곳(roomBadgeTotal)에서 계산해 props로 전달 */
    myTurnCount?: number
}

export function MobileNav({ userId = null, myTurnCount = 0 }: MobileNavProps) {
    const [open, setOpen] = useState(false)
    const pathname = usePathname()
    const close = () => setOpen(false)

    // 개인 섹션: '개인'(본인 프로필) + 매칭 리스트(전체) + 참여 중인 매칭(내 방) + 개인 경기 결과(끝난 것)
    const myNavItems = userId ? [buildPersonalNavItem(userId), ...myMatchNavItems] : []

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
                    {/* 개인 섹션 (로그인 시) */}
                    {myNavItems.length > 0 && (
                        <div className="space-y-1">
                            {myNavItems.map((item) => (
                                <MobileNavRow
                                    key={item.href}
                                    item={item}
                                    active={isNavItemActive(item, pathname, userId)}
                                    badgeCount={item.badge ? myTurnCount : 0}
                                    onNavigate={close}
                                />
                            ))}
                        </div>
                    )}
                    {/* 사용 가이드 — 로그인 무관. 개인 섹션이 있으면 구분선 뒤, 없으면(비로그인) 이 한 줄뿐 */}
                    <div className={cn(myNavItems.length > 0 && 'mt-2 border-t border-foreground/5 dark:border-foreground/10 pt-2')}>
                        <MobileNavRow
                            item={guideNavItem}
                            active={isNavItemActive(guideNavItem, pathname, userId)}
                            onNavigate={close}
                        />
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
