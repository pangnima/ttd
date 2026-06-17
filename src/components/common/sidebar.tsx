'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { mainNavItems } from '@/lib/nav-items'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { ClubNavTree } from '@/components/common/club-nav-tree'
import { BrandLogo, WORDMARK_CLASS } from '@/components/common/brand-logo'
import { useSidebar } from '@/components/common/sidebar-context'

type SidebarProps = {
    currentPath?: string
    /** 가입한 클럽 목록 (layout에서 주입, 대진표·개인 분석 하위 메뉴로 노출) */
    clubs?: { id: string; name: string }[]
    /** 로그인 사용자 id (개인 분석 하위 메뉴 href 생성용, 아이콘은 클라이언트에서 직접 렌더링) */
    userId?: string | null
}

/**
 * rail(접힘) 상태에서 아이콘에 호버 시 오른쪽으로 열리는 플라이아웃.
 * 바깥 래퍼는 투명 브릿지 패딩(pl-1.5)으로 아이콘과 패널 사이 hover 영역을 잇고,
 * 실제 패널(배경·보더)은 안쪽 div에 둔다 → 마우스가 끊기지 않고 패널까지 도달.
 * 호버 전용(focus-within 미사용) — 클릭 후 포커스 잔류로 패널이 닫히지 않는 겹침을 방지.
 */
function RailFlyout({ children }: { children: React.ReactNode }) {
    return (
        <div className="invisible absolute left-full -top-1.5 z-50 pl-1.5 opacity-0 transition-opacity group-hover/rail:visible group-hover/rail:opacity-100">
            <div className="min-w-44 rounded-lg border border-border bg-popover p-1.5 shadow-sm dark:shadow-md">
                {children}
            </div>
        </div>
    )
}

export function Sidebar({ currentPath, clubs = [], userId }: SidebarProps) {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const { collapsed } = useSidebar()
    const activePath = currentPath ?? pathname
    // 내 전적 하위 메뉴 active 판정 — scope 미지정은 'total'로 간주
    const onProfile = activePath.startsWith('/profile/')
    const currentScope = searchParams.get('scope') ?? 'total'
    const scopeActive = (scope: string) => onProfile && currentScope === scope
    // 개인 경기 등록(목록·생성·수정) 진입 active 판정
    const onPersonalMatches = activePath.startsWith('/me/personal-matches')

    // 메인 네비 active 판정 — /clubs는 탐색·생성 페이지에서만 켜고, 특정 클럽 하위(/clubs/[id]/...)는
    // "내가 가입한 클럽" 트리가 담당하므로 prefix 매칭을 쓰지 않는다.
    const mainActive = (href: string) => activePath === href || activePath === `${href}/new`

    // 단순 메뉴 항목 — rail/펼침 단일 마크업, 클래스만 토글해 폭과 함께 부드럽게 전환
    const rowClass = (active: boolean) =>
        cn(
            'flex items-center h-10 rounded-lg text-sm font-medium transition-colors',
            collapsed ? 'gap-0 justify-center px-0 w-10 mx-auto' : 'gap-3 px-3',
            active
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )

    // 라벨 — rail에서 max-width/opacity로 페이드(width:auto는 트랜지션 불가하므로 max-width 사용)
    const labelClass = cn(
        'overflow-hidden whitespace-nowrap transition-all duration-200',
        collapsed ? 'max-w-0 opacity-0' : 'max-w-40 opacity-100'
    )

    // 플라이아웃 내부(펼친 형태) 하위 링크 스타일
    const flyLinkClass = (active: boolean) =>
        cn(
            'flex items-center px-3 py-2 rounded-md text-[13px] font-medium transition-colors',
            active ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )

    return (
        <aside
            className={cn(
                'hidden md:flex flex-col shrink-0 border-r border-foreground/5 dark:border-foreground/10 bg-card transition-[width] duration-200',
                collapsed ? 'w-16' : 'w-60'
            )}
        >
            {/* 로고 영역 */}
            <div
                className={cn(
                    'h-14 flex items-center border-b border-foreground/5 dark:border-foreground/10 transition-[padding] duration-200',
                    collapsed ? 'justify-center px-2' : 'px-5'
                )}
            >
                <Link href="/clubs" className="flex items-center gap-2.5 min-w-0" aria-label="BASELINE 홈">
                    <BrandLogo wordmark={false} size="sm" className="shrink-0" />
                    <span className={cn(labelClass, WORDMARK_CLASS, 'text-base')}>BASELINE</span>
                </Link>
            </div>

            {/* 메인 네비게이션 — rail에서는 플라이아웃이 사이드바 밖으로 나가야 하므로 overflow를 자르지 않는다 */}
            <nav className={cn('flex-1 min-h-0 p-3 space-y-0.5', collapsed ? 'overflow-visible' : 'overflow-y-auto overflow-x-hidden')}>
                {mainNavItems.map(({ href, label, icon: Icon }) => (
                    <Link
                        key={href}
                        href={href}
                        className={rowClass(mainActive(href))}
                        aria-label={collapsed ? label : undefined}
                    >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className={labelClass}>{label}</span>
                    </Link>
                ))}

                {/* 내 전적: 클럽 무관 통합/개인 전적 (로그인 시) */}
                {userId &&
                    (collapsed ? (
                        <div className="group/rail relative mt-2 pt-2 border-t border-border/40">
                            <div className={rowClass(onProfile || onPersonalMatches)}>
                                <BarChart3 className="w-4 h-4 shrink-0" />
                            </div>
                            <RailFlyout>
                                <Link href={`/profile/${userId}?scope=total`} className={flyLinkClass(scopeActive('total'))}>
                                    통합
                                </Link>
                                <Link href={`/profile/${userId}?scope=personal`} className={flyLinkClass(scopeActive('personal'))}>
                                    개인
                                </Link>
                                <Link href="/me/personal-matches" className={flyLinkClass(onPersonalMatches)}>
                                    개인 경기 등록
                                </Link>
                            </RailFlyout>
                        </div>
                    ) : (
                        <div className="mt-2 pt-2 border-t border-border/40">
                            <div className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-muted-foreground">
                                <BarChart3 className="w-4 h-4 shrink-0" />
                                <span className={labelClass}>내 전적</span>
                            </div>
                            <div className="space-y-0.5">
                                <Link href={`/profile/${userId}?scope=total`} className={cn(rowClass(scopeActive('total')), 'pl-9 text-[13px]')}>
                                    통합
                                </Link>
                                <Link href={`/profile/${userId}?scope=personal`} className={cn(rowClass(scopeActive('personal')), 'pl-9 text-[13px]')}>
                                    개인
                                </Link>
                                <Link href="/me/personal-matches" className={cn(rowClass(onPersonalMatches), 'pl-9 text-[13px]')}>
                                    개인 경기 등록
                                </Link>
                            </div>
                        </div>
                    ))}

                {/* 내가 가입한 클럽: 클럽별로 홈·대진표·클럽 전적을 아코디언으로 노출 */}
                <ClubNavTree clubs={clubs} userId={userId} variant="desktop" collapsed={collapsed} />
            </nav>

            {/* 테마 토글 — 하단 고정 */}
            <div className={cn('border-t border-foreground/5 dark:border-foreground/10 transition-[padding] duration-200', collapsed ? 'p-2' : 'p-3')}>
                <ThemeToggle collapsed={collapsed} />
            </div>
        </aside>
    )
}
