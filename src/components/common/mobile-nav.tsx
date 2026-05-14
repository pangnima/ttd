'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Menu, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { navItems } from '@/lib/nav-items'
import { getCurrentUserId } from '@/lib/store/auth-store'
import { getJoinedClubIds } from '@/lib/store/club-member-store'
import { getStoredClubs } from '@/lib/store/club-store'
import { dummyClubs } from '@/lib/dummy/clubs'

export function MobileNav() {
    const [open, setOpen] = useState(false)
    const pathname = usePathname()
    const [tournamentHref, setTournamentHref] = useState<string | null>(null)

    useEffect(() => {
        const userId = getCurrentUserId()
        if (!userId) return

        const joinedIds = getJoinedClubIds(userId)
        if (joinedIds.length === 0) return

        const stored = getStoredClubs()
        const storedIds = new Set(stored.map((c) => c.id))
        const allClubs = [...dummyClubs.filter((c) => !storedIds.has(c.id)), ...stored]
        const firstClub = allClubs.find((c) => joinedIds.includes(c.id))
        if (firstClub) {
            setTournamentHref(`/clubs/${firstClub.id}/tournaments`)
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
            <SheetContent side="left" className="w-56 p-0">
                <SheetHeader className="px-4 py-4 border-b">
                    <SheetTitle className="text-base font-semibold text-left">
                        🎾 테니스 클럽
                    </SheetTitle>
                </SheetHeader>
                <nav className="p-3 space-y-1">
                    {navItems.map(({ href, label, icon: Icon }) => (
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

                    {/* 동적 대진표 링크 */}
                    {tournamentHref && (
                        <Link
                            href={tournamentHref}
                            onClick={() => setOpen(false)}
                            className={cn(
                                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                                pathname.includes('/tournaments')
                                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                            )}
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
