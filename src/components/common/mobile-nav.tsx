'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Menu, Trophy, BarChart3 } from 'lucide-react'
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

    // 개인 분석 하위 메뉴 active 판정 — scope 미지정은 'total'로 간주
    const onProfile = pathname.startsWith('/profile/')
    const currentScope = searchParams.get('scope') ?? 'total'
    const scopeActive = (scope: string) => onProfile && currentScope === scope

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
                            className={navLinkClass(pathname === href || pathname.startsWith(`${href}/`))}
                        >
                            <Icon className="w-4 h-4" />
                            {label}
                        </Link>
                    ))}

                    {/* 개인 분석: 전체/개인/클럽별 하위 메뉴를 항상 펼쳐서 노출 (로그인 시) */}
                    {userId && (
                        <div className="pt-0.5">
                            <div className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-sidebar-foreground/70">
                                <BarChart3 className="w-4 h-4" />
                                개인 분석
                            </div>
                            <div className="space-y-1">
                                <Link href={`/profile/${userId}?scope=total`} onClick={() => setOpen(false)} className={cn(navLinkClass(scopeActive('total')), 'pl-9 text-[13px]')}>
                                    전체
                                </Link>
                                <Link href={`/profile/${userId}?scope=personal`} onClick={() => setOpen(false)} className={cn(navLinkClass(scopeActive('personal')), 'pl-9 text-[13px]')}>
                                    개인
                                </Link>
                                {clubs.map((club) => (
                                    <Link
                                        key={club.id}
                                        href={`/profile/${userId}?scope=${club.id}`}
                                        onClick={() => setOpen(false)}
                                        className={cn(navLinkClass(scopeActive(club.id)), 'pl-9 text-[13px]')}
                                    >
                                        {club.name}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 대진표: 가입 클럽별 하위 메뉴를 항상 펼쳐서 노출 */}
                    {clubs.length > 0 && (
                        <div className="pt-0.5">
                            <div className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-sidebar-foreground/70">
                                <Trophy className="w-4 h-4" />
                                대진표
                            </div>
                            <div className="space-y-1">
                                {clubs.map((club) => (
                                    <Link
                                        key={club.id}
                                        href={`/clubs/${club.id}/match-games`}
                                        onClick={() => setOpen(false)}
                                        className={cn(
                                            navLinkClass(pathname.startsWith(`/clubs/${club.id}/match-games`)),
                                            'pl-9 text-[13px]'
                                        )}
                                    >
                                        {club.name}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </nav>

                {/* 테마 토글 — 하단 고정 */}
                <div className="p-3 border-t border-foreground/5">
                    <ThemeToggle />
                </div>
            </SheetContent>
        </Sheet>
    )
}
