'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { mainNavItems, settingNavItem } from '@/lib/nav-items'
import { ThemeToggle } from '@/components/theme/theme-toggle'

type SidebarProps = {
    currentPath?: string
    matchGameHref?: string | null
}

export function Sidebar({ currentPath, matchGameHref }: SidebarProps) {
    const pathname = usePathname()
    const activePath = currentPath ?? pathname

    const navLinkClass = (active: boolean) =>
        cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
            active
                ? 'bg-foreground/10 text-foreground'
                : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground'
        )

    return (
        <aside className="hidden md:flex w-60 flex-col shrink-0 border-r border-foreground/5 bg-card">
            {/* 로고 영역 */}
            <div className="h-14 flex items-center px-5 border-b border-foreground/5">
                <Link href="/dashboard" className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
                        T
                    </div>
                    <span className="font-semibold text-sm">테니스 클럽</span>
                </Link>
            </div>

            {/* 메인 네비게이션 */}
            <nav className="flex-1 p-3 space-y-0.5">
                {mainNavItems.map(({ href, label, icon: Icon }) => (
                    <Link
                        key={href}
                        href={href}
                        className={navLinkClass(activePath === href)}
                    >
                        <Icon className="w-4 h-4 shrink-0" />
                        {label}
                    </Link>
                ))}

                {/* 대진표: 가입 클럽 있을 때 클럽리스트 바로 아래 노출 */}
                {matchGameHref && (
                    <Link
                        href={matchGameHref}
                        className={navLinkClass(activePath.includes('/match-games'))}
                    >
                        <Trophy className="w-4 h-4 shrink-0" />
                        대진표
                    </Link>
                )}
            </nav>

            {/* 설정 + 테마 토글 — 하단 고정 */}
            <div className="p-3 border-t border-foreground/5 space-y-1">
                <ThemeToggle />
                <Link
                    href={settingNavItem.href}
                    className={navLinkClass(activePath === settingNavItem.href)}
                >
                    <settingNavItem.icon className="w-4 h-4 shrink-0" />
                    {settingNavItem.label}
                </Link>
            </div>
        </aside>
    )
}
