'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button, buttonVariants } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { MobileNav } from '@/components/common/mobile-nav'
import { logoutAction } from '@/lib/actions/auth'
import { createClient } from '@/lib/supabase/client'
import { Shield, LogOut } from 'lucide-react'

type UserDisplay = {
    id: string
    name: string
    nickname: string
    role: string
    profileImage?: string | null
}

export function Header() {
    const [userDisplay, setUserDisplay] = useState<UserDisplay | null>(null)

    useEffect(() => {
        let isMounted = true
        const supabase = createClient()

        supabase.auth.getUser().then(async ({ data: { user } }) => {
            if (!isMounted || !user) return
            const { data } = await supabase
                .from('users')
                .select('name, nickname, role, profile_image')
                .eq('id', user.id)
                .single()
            if (isMounted && data) {
                setUserDisplay({
                    id: user.id,
                    name: data.name,
                    nickname: data.nickname,
                    role: data.role,
                    profileImage: data.profile_image,
                })
            }
        })

        return () => {
            isMounted = false
        }
    }, [])

    return (
        <header className="min-h-14 border-b border-foreground/5 bg-card flex items-center px-4 md:px-6 shrink-0 gap-3 pt-[env(safe-area-inset-top)]">
            <MobileNav />
            <Link href="/clubs" className="font-semibold text-sm md:hidden">
                🎾 테니스 클럽
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
                                    className="text-xs px-1.5 py-0 h-5 border-amber-500/50 text-amber-400 gap-1"
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
