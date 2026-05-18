'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Menu, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { mainNavItems, settingNavItem } from '@/lib/nav-items'
import { createClient } from '@/lib/supabase/client'

export function MobileNav() {
    const [open, setOpen] = useState(false)
    const pathname = usePathname()
    const [matchGameHref, setMatchGameHref] = useState<string | null>(null)

    useEffect(() => {
        let isMounted = true
        const supabase = createClient()

        supabase.auth.getUser().then(async ({ data: { user } }) => {
            if (!isMounted || !user) return
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
                            className={cn(
                                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                                pathname === href
                                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                            )}
                        >
                            <Icon className="w-4 h-4" />
                            {label}
                        </Link>
                    ))}

                    {/* 대진표: 가입 클럽 있을 때 클럽리스트 바로 아래 노출 */}
                    {matchGameHref && (
                        <Link
                            href={matchGameHref}
                            onClick={() => setOpen(false)}
                            className={cn(
                                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                                pathname.includes('/match-games')
                                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                            )}
                        >
                            <Trophy className="w-4 h-4" />
                            대진표
                        </Link>
                    )}
                </nav>

                {/* 설정 — 하단 고정 */}
                <div className="p-3 border-t">
                    <Link
                        href={settingNavItem.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                            'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                            pathname === settingNavItem.href
                                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                        )}
                    >
                        <settingNavItem.icon className="w-4 h-4" />
                        {settingNavItem.label}
                    </Link>
                </div>
            </SheetContent>
        </Sheet>
    )
}
