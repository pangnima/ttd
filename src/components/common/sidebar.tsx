'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { navItems } from '@/lib/nav-items'
import { createClient } from '@/lib/supabase/client'

type SidebarProps = {
    currentPath?: string
}

export function Sidebar({ currentPath }: SidebarProps) {
    const pathname = usePathname()
    const activePath = currentPath ?? pathname
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
        <aside className="hidden md:flex w-60 flex-col shrink-0 border-r border-white/5 bg-card">
            {/* 로고 영역 */}
            <div className="h-14 flex items-center px-5 border-b border-white/5">
                <Link href="/dashboard" className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
                        T
                    </div>
                    <span className="font-semibold text-sm">테니스 클럽</span>
                </Link>
            </div>

            {/* 네비게이션 */}
            <nav className="flex-1 p-3 space-y-0.5">
                {navItems.map(({ href, label, icon: Icon }) => (
                    <Link
                        key={href}
                        href={href}
                        className={cn(
                            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                            activePath === href
                                ? 'bg-white/10 text-foreground'
                                : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                        )}
                    >
                        <Icon className="w-4 h-4 shrink-0" />
                        {label}
                    </Link>
                ))}

                {/* 동적 대진표 링크 */}
                {matchGameHref && (
                    <Link
                        href={matchGameHref}
                        className={cn(
                            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                            activePath.includes('/match-games')
                                ? 'bg-white/10 text-foreground'
                                : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                        )}
                    >
                        <Trophy className="w-4 h-4 shrink-0" />
                        대진표
                    </Link>
                )}
            </nav>
        </aside>
    )
}
