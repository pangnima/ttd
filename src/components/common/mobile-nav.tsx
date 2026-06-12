'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Menu, BarChart3, UsersRound } from 'lucide-react'
import { cn } from '@/lib/utils'
import { mainNavItems } from '@/lib/nav-items'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from '@/components/theme/theme-toggle'

type MobileNavProps = {
    clubs?: { id: string; name: string }[]
}

export function MobileNav({ clubs = [] }: MobileNavProps) {
    const [open, setOpen] = useState(false)
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [userId, setUserId] = useState<string | null>(null)

    useEffect(() => {
        let isMounted = true
        const supabase = createClient()

        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!isMounted || !user) return
            setUserId(user.id)
        })

        return () => {
            isMounted = false
        }
    }, [])

    // 내 전적 하위 메뉴 active 판정 — scope 미지정은 'total'로 간주
    const onProfile = pathname.startsWith('/profile/')
    const currentScope = searchParams.get('scope') ?? 'total'
    const scopeActive = (scope: string) => onProfile && currentScope === scope
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
            <SheetContent side="left" className="w-56 p-0 flex flex-col">
                <SheetHeader className="px-4 py-4 border-b">
                    <SheetTitle className="text-base font-semibold text-left">
                        🎾 테니스 클럽
                    </SheetTitle>
                </SheetHeader>

                {/* 메인 네비게이션 */}
                <nav className="flex-1 p-3 space-y-1">
                    {mainNavItems.map(({ href, label, icon: Icon }) => (
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

                    {/* 내가 가입한 클럽: 클럽별로 홈·대진표·클럽 전적을 묶어 트리 형태로 노출 */}
                    {clubs.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-foreground/5 dark:border-foreground/10">
                            <div className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-sidebar-foreground/70">
                                <UsersRound className="w-4 h-4" />
                                내가 가입한 클럽
                            </div>
                            <div className="space-y-2">
                                {clubs.map((club) => (
                                    <div key={club.id}>
                                        {/* 클럽명 — 통합/개인과 동일 스타일(pl-9). 하위 홈/대진표/내 전적은 한 뎁스 더(pl-14). */}
                                        <p className="flex items-center gap-3 px-3 py-2 pl-9 rounded-md text-[13px] font-medium text-sidebar-foreground truncate">
                                            {club.name}
                                        </p>
                                        <div className="space-y-1">
                                            <Link href={`/clubs/${club.id}`} onClick={() => setOpen(false)} className={cn(navLinkClass(pathname === `/clubs/${club.id}`), 'pl-14 text-[13px]')}>
                                                홈
                                            </Link>
                                            <Link href={`/clubs/${club.id}/match-games`} onClick={() => setOpen(false)} className={cn(navLinkClass(pathname.startsWith(`/clubs/${club.id}/match-games`)), 'pl-14 text-[13px]')}>
                                                대진표
                                            </Link>
                                            {userId && (
                                                <Link href={`/profile/${userId}?scope=${club.id}`} onClick={() => setOpen(false)} className={cn(navLinkClass(scopeActive(club.id)), 'pl-14 text-[13px]')}>
                                                    내 전적
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </nav>

                {/* 테마 토글 — 하단 고정 */}
                <div className="p-3 border-t border-foreground/5 dark:border-foreground/10">
                    <ThemeToggle />
                </div>
            </SheetContent>
        </Sheet>
    )
}
