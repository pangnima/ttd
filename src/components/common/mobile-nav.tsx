'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Menu, Trophy, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { mainNavItems } from '@/lib/nav-items'
import { createClient } from '@/lib/supabase/client'

export function MobileNav() {
    const [open, setOpen] = useState(false)
    const pathname = usePathname()
    const [matchGameHref, setMatchGameHref] = useState<string | null>(null)
    const [profileHref, setProfileHref] = useState<string | null>(null)

    useEffect(() => {
        let isMounted = true
        const supabase = createClient()

        supabase.auth.getUser().then(async ({ data: { user } }) => {
            if (!isMounted || !user) return

            // 프로필 링크 설정
            if (isMounted) setProfileHref(`/profile/${user.id}`)

            // 첫 가입 클럽 대진표 링크 설정
            const { data } = await supabase
                .from('club_members')
                .select('club_id')
                .eq('user_id', user.id)
                .eq('status', 'approved')
                .limit(1)
                .maybeSingle()
            if (isMounted && data) {
                setMatchGameHref(`/clubs/${data.club_id}/match-games`)
            }
        })

        return () => {
            isMounted = false
        }
    }, [])

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

                    {/* 내 분석 (동적 프로필 링크) */}
                    {profileHref && (
                        <Link
                            href={profileHref}
                            onClick={() => setOpen(false)}
                            className={navLinkClass(pathname.startsWith('/profile/'))}
                        >
                            <BarChart3 className="w-4 h-4" />
                            내 분석
                        </Link>
                    )}

                    {/* 대진표: 가입 클럽 있을 때 클럽리스트 바로 아래 노출 */}
                    {matchGameHref && (
                        <Link
                            href={matchGameHref}
                            onClick={() => setOpen(false)}
                            className={navLinkClass(pathname.includes('/match-games'))}
                        >
                            <Trophy className="w-4 h-4" />
                            대진표
                        </Link>
                    )}
                </nav>

            </SheetContent>
        </Sheet>
    )
}
