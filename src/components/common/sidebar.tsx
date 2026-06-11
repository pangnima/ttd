'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Trophy, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { mainNavItems } from '@/lib/nav-items'
import { ThemeToggle } from '@/components/theme/theme-toggle'

type SidebarProps = {
    currentPath?: string
    /** 가입한 클럽 목록 (layout에서 주입, 대진표·개인 분석 하위 메뉴로 노출) */
    clubs?: { id: string; name: string }[]
    /** 로그인 사용자 id (개인 분석 하위 메뉴 href 생성용, 아이콘은 클라이언트에서 직접 렌더링) */
    userId?: string | null
}

export function Sidebar({ currentPath, clubs = [], userId }: SidebarProps) {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const activePath = currentPath ?? pathname
    // 개인 분석 하위 메뉴 active 판정 — scope 미지정은 'total'로 간주
    const onProfile = activePath.startsWith('/profile/')
    const currentScope = searchParams.get('scope') ?? 'total'
    const scopeActive = (scope: string) => onProfile && currentScope === scope

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
                <Link href="/clubs" className="flex items-center gap-2">
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
                        className={navLinkClass(activePath === href || activePath.startsWith(`${href}/`))}
                    >
                        <Icon className="w-4 h-4 shrink-0" />
                        {label}
                    </Link>
                ))}

                {/* 개인 분석: 전체/개인/클럽별 하위 메뉴를 항상 펼쳐서 노출 (로그인 시) */}
                {userId && (
                    <div className="pt-0.5">
                        <div className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-muted-foreground">
                            <BarChart3 className="w-4 h-4 shrink-0" />
                            개인 분석
                        </div>
                        <div className="space-y-0.5">
                            <Link href={`/profile/${userId}?scope=total`} className={cn(navLinkClass(scopeActive('total')), 'pl-9 text-[13px]')}>
                                통합
                            </Link>
                            <Link href={`/profile/${userId}?scope=personal`} className={cn(navLinkClass(scopeActive('personal')), 'pl-9 text-[13px]')}>
                                개인
                            </Link>
                            {clubs.map((club) => (
                                <Link
                                    key={club.id}
                                    href={`/profile/${userId}?scope=${club.id}`}
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
                        <div className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-muted-foreground">
                            <Trophy className="w-4 h-4 shrink-0" />
                            대진표
                        </div>
                        <div className="space-y-0.5">
                            {clubs.map((club) => (
                                <Link
                                    key={club.id}
                                    href={`/clubs/${club.id}/match-games`}
                                    className={cn(
                                        navLinkClass(activePath.startsWith(`/clubs/${club.id}/match-games`)),
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
        </aside>
    )
}
