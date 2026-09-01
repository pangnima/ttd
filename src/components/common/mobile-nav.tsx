'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Menu, BarChart3, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { topNavItems, myMatchNavItems, clubNavItems } from '@/lib/nav-items'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { ClubNavTree } from '@/components/common/club-nav-tree'
import { BrandLogo } from '@/components/common/brand-logo'

type MobileNavProps = {
    clubs?: { id: string; name: string }[]
}

export function MobileNav({ clubs = [] }: MobileNavProps) {
    const [open, setOpen] = useState(false)
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [userId, setUserId] = useState<string | null>(null)
    const [pendingRequestCount, setPendingRequestCount] = useState(0)

    useEffect(() => {
        let isMounted = true
        const supabase = createClient()

        supabase.auth.getUser().then(async ({ data: { user } }) => {
            if (!isMounted || !user) return
            setUserId(user.id)
            // 받은 확인 요청 pending 건수 (RLS로 당사자만 조회됨)
            const { count } = await supabase
                .from('match_requests')
                .select('id', { count: 'exact', head: true })
                .eq('opponent_user_id', user.id)
                .eq('status', 'pending')
            if (isMounted) setPendingRequestCount(count ?? 0)
        })

        return () => {
            isMounted = false
        }
    }, [])

    // 내 전적 하위 메뉴 active 판정 — scope 미지정은 'total'로 간주
    const onProfile = pathname.startsWith('/profile/')
    const currentScope = searchParams.get('scope') ?? 'total'
    const scopeActive = (scope: string) => onProfile && currentScope === scope
    // 개인 경기 등록(목록·생성·수정)·경기 확인 요청 active 판정
    const onPersonalMatches = pathname.startsWith('/me/personal-matches')
    const onMatchRequests = pathname.startsWith('/me/match-requests')
    // 메인 네비 active 판정 — /clubs는 탐색·생성 페이지에서만 켜고, 특정 클럽 하위는 가입 클럽 트리가 담당.
    const mainActive = (href: string) => pathname === href || pathname === `${href}/new`

    const navLinkClass = (active: boolean) =>
        cn(
            'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
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

                    {/* 내 전적: 클럽 무관 통합/개인 전적 (로그인 시) */}
                    {userId && (
                        <div className="mt-2 pt-2 border-t border-foreground/5 dark:border-foreground/10">
                            <div className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-sidebar-foreground/70">
                                <BarChart3 className="w-4 h-4" />
                                내 전적
                            </div>
                            <div className="space-y-1">
                                <Link href={`/profile/${userId}?scope=total`} onClick={() => setOpen(false)} className={cn(navLinkClass(scopeActive('total')), 'pl-9 text-[13px]')}>
                                    통합
                                </Link>
                                <Link href={`/profile/${userId}?scope=personal`} onClick={() => setOpen(false)} className={cn(navLinkClass(scopeActive('personal')), 'pl-9 text-[13px]')}>
                                    개인
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* 개인 경기: 등록·확인 요청 독립 메뉴 (로그인 시) */}
                    {userId && (
                        <div className="mt-2 pt-2 border-t border-foreground/5 dark:border-foreground/10 space-y-1">
                            {myMatchNavItems.map(({ href, label, icon: Icon }) => {
                                const active = href === '/me/personal-matches' ? onPersonalMatches : onMatchRequests
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
                                            <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-600 dark:text-orange-400 tabular-nums">
                                                {pendingRequestCount}
                                            </span>
                                        )}
                                    </Link>
                                )
                            })}
                        </div>
                    )}

                    {/* 클럽 찾기 — 내 전적 아래, 가입 클럽 트리 위 */}
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

                        {/* 내가 가입한 클럽: 클럽별로 홈·대진표·클럽 전적을 아코디언으로 노출 */}
                        <ClubNavTree clubs={clubs} userId={userId} variant="mobile" onNavigate={() => setOpen(false)} />
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
