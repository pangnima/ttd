'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { BarChart3, UsersRound } from 'lucide-react'
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
    // 내 전적 하위 메뉴 active 판정 — scope 미지정은 'total'로 간주
    const onProfile = activePath.startsWith('/profile/')
    const currentScope = searchParams.get('scope') ?? 'total'
    const scopeActive = (scope: string) => onProfile && currentScope === scope

    // 메인 네비 active 판정 — /clubs는 탐색·생성 페이지에서만 켜고, 특정 클럽 하위(/clubs/[id]/...)는
    // "내가 가입한 클럽" 트리가 담당하므로 prefix 매칭을 쓰지 않는다.
    const mainActive = (href: string) => activePath === href || activePath === `${href}/new`

    const navLinkClass = (active: boolean) =>
        cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
            active
                ? 'bg-foreground/10 text-foreground'
                : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground'
        )

    return (
        <aside className="hidden md:flex w-60 flex-col shrink-0 border-r border-foreground/5 dark:border-foreground/10 bg-card">
            {/* 로고 영역 */}
            <div className="h-14 flex items-center px-5 border-b border-foreground/5 dark:border-foreground/10">
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
                        className={navLinkClass(mainActive(href))}
                    >
                        <Icon className="w-4 h-4 shrink-0" />
                        {label}
                    </Link>
                ))}

                {/* 내 전적: 클럽 무관 통합/개인 전적 (로그인 시) */}
                {userId && (
                    <div className="mt-2 pt-2 border-t border-border/40">
                        <div className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-muted-foreground">
                            <BarChart3 className="w-4 h-4 shrink-0" />
                            내 전적
                        </div>
                        <div className="space-y-0.5">
                            <Link href={`/profile/${userId}?scope=total`} className={cn(navLinkClass(scopeActive('total')), 'pl-9 text-[13px]')}>
                                통합
                            </Link>
                            <Link href={`/profile/${userId}?scope=personal`} className={cn(navLinkClass(scopeActive('personal')), 'pl-9 text-[13px]')}>
                                개인
                            </Link>
                        </div>
                    </div>
                )}

                {/* 내가 가입한 클럽: 클럽별로 홈·대진표·클럽 전적을 묶어 트리 형태로 노출 */}
                {clubs.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border/40">
                        <div className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-muted-foreground">
                            <UsersRound className="w-4 h-4 shrink-0" />
                            내가 가입한 클럽
                        </div>
                        <div className="space-y-2">
                            {clubs.map((club) => (
                                <div key={club.id}>
                                    {/* 클럽명 — 통합/개인과 동일 스타일(pl-9). 하위 홈/대진표/내 전적은 한 뎁스 더(pl-14). */}
                                    <p className="flex items-center gap-3 px-3 py-2.5 pl-9 rounded-lg text-[13px] font-medium text-muted-foreground truncate">
                                        {club.name}
                                    </p>
                                    <div className="space-y-0.5">
                                        <Link href={`/clubs/${club.id}`} className={cn(navLinkClass(activePath === `/clubs/${club.id}`), 'pl-14 text-[13px]')}>
                                            홈
                                        </Link>
                                        <Link href={`/clubs/${club.id}/match-games`} className={cn(navLinkClass(activePath.startsWith(`/clubs/${club.id}/match-games`)), 'pl-14 text-[13px]')}>
                                            대진표
                                        </Link>
                                        {userId && (
                                            <Link href={`/profile/${userId}?scope=${club.id}`} className={cn(navLinkClass(scopeActive(club.id)), 'pl-14 text-[13px]')}>
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
        </aside>
    )
}
