'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button, buttonVariants } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { MobileNav } from '@/components/common/mobile-nav'
import { getCurrentUserId, clearCurrentUser } from '@/lib/store/auth-store'
import { getUserById } from '@/lib/dummy/users'
import { Shield, LogOut } from 'lucide-react'
import type { User } from '@/types'

export function Header() {
    const router = useRouter()
    const [currentUser, setCurrentUser] = useState<User | null>(null)

    useEffect(() => {
        const id = getCurrentUserId()
        if (id) {
            const user = getUserById(id)
            setCurrentUser(user ?? null)
        }
    }, [])

    function handleLogout() {
        clearCurrentUser()
        router.push('/login')
    }

    return (
        <header className="h-14 border-b border-white/5 bg-card flex items-center px-4 md:px-6 shrink-0 gap-3">
            <MobileNav />
            <Link href="/dashboard" className="font-semibold text-sm md:hidden">
                🎾 테니스 클럽
            </Link>
            <div className="flex-1" />
            <nav className="flex items-center gap-2">
                <Link
                    href="/clubs"
                    className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'hidden md:inline-flex text-muted-foreground hover:text-foreground')}
                >
                    클럽 찾기
                </Link>

                {currentUser ? (
                    <div className="flex items-center gap-2">
                        <div className="hidden sm:flex items-center gap-2">
                            <Avatar className="w-7 h-7">
                                <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                                    {currentUser.nickname[0]}
                                </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">{currentUser.name}</span>
                            {currentUser.role === 'admin' && (
                                <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 border-amber-500/50 text-amber-400 gap-1">
                                    <Shield className="w-2.5 h-2.5" />
                                    관리자
                                </Badge>
                            )}
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleLogout}
                            className="text-muted-foreground hover:text-foreground gap-1.5"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">로그아웃</span>
                        </Button>
                    </div>
                ) : (
                    <Link
                        href="/login"
                        className={cn(buttonVariants({ size: 'sm' }))}
                    >
                        로그인
                    </Link>
                )}
            </nav>
        </header>
    )
}
