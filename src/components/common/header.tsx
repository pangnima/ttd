'use client'

import Link from 'next/link'
import { Button, buttonVariants } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { MobileNav } from '@/components/common/mobile-nav'
import { BrandLogo } from '@/components/common/brand-logo'
import { useSidebar } from '@/components/common/sidebar-context'
import { logoutAction } from '@/lib/actions/auth'
import { Shield, LogOut, PanelLeft } from 'lucide-react'

type UserDisplay = {
    id: string
    name: string
    nickname: string
    role: string
    profileImage?: string | null
}

type HeaderProps = {
    clubs?: { id: string; name: string }[]
    userDisplay?: UserDisplay | null
}

export function Header({ clubs = [], userDisplay = null }: HeaderProps) {
    const { collapsed, toggle } = useSidebar()

    return (
        <header className="relative min-h-14 border-b border-foreground/5 dark:border-foreground/10 bg-card flex items-center px-4 md:px-6 shrink-0 gap-3 pt-[env(safe-area-inset-top)]">
            <MobileNav clubs={clubs} />
            <button
                type="button"
                onClick={toggle}
                aria-label={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
                aria-pressed={collapsed}
                className="hidden md:inline-flex p-2 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
                <PanelLeft className="w-5 h-5" />
            </button>
            {/* 모바일 전용 — 헤더 정중앙에 배치 (safe-area pt를 제외한 콘텐츠 영역 기준 수직 중앙) */}
            <Link
                href="/clubs"
                aria-label="BASELINE 홈"
                className="md:hidden absolute left-1/2 -translate-x-1/2 top-[env(safe-area-inset-top)] bottom-0 flex items-center"
            >
                <BrandLogo size="sm" />
            </Link>
            <div className="flex-1" />
            <nav className="flex items-center gap-2">
                <Link
                    href="/clubs"
                    className={cn(
                        buttonVariants({ variant: 'ghost', size: 'sm' }),
                        'hidden md:inline-flex text-muted-foreground hover:text-foreground'
                    )}
                >
                    클럽 찾기
                </Link>

                {userDisplay ? (
                    <div className="flex items-center gap-2">
                        <Link href="/profile/settings" className="hidden sm:flex items-center gap-2 hover:opacity-80 transition-opacity">
                            <Avatar className="w-7 h-7">
                                {userDisplay.profileImage && (
                                    <AvatarImage
                                        src={userDisplay.profileImage}
                                        alt={userDisplay.nickname}
                                    />
                                )}
                                <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                                    {userDisplay.nickname[0]}
                                </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">{userDisplay.name}</span>
                            {userDisplay.role === 'admin' && (
                                <Badge
                                    variant="outline"
                                    className="text-xs px-1.5 py-0 h-5 border-amber-500/50 text-amber-600 dark:text-amber-400 gap-1"
                                >
                                    <Shield className="w-2.5 h-2.5" />
                                    관리자
                                </Badge>
                            )}
                        </Link>
                        <form action={logoutAction}>
                            <Button
                                type="submit"
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground hover:text-foreground gap-1.5"
                            >
                                <LogOut className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">로그아웃</span>
                            </Button>
                        </form>
                    </div>
                ) : (
                    <Link href="/login" className={cn(buttonVariants({ size: 'sm' }))}>
                        로그인
                    </Link>
                )}
            </nav>
        </header>
    )
}
