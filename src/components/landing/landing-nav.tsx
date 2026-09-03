import Link from 'next/link'
import { LogOut } from 'lucide-react'

import { BrandLogo } from '@/components/common/brand-logo'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button, buttonVariants } from '@/components/ui/button'
import { logoutAction } from '@/lib/actions/auth'
import { createClient } from '@/lib/supabase/server'
import { cn } from '@/lib/utils'

export async function LandingNav() {
    // 로그인 상태에 따라 우측 액션을 분기 — 로그인 시 로그인/가입 버튼 대신 프로필 메뉴 노출
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    let profile: { name: string; nickname: string; profileImage: string | null } | null = null
    if (user) {
        const { data } = await supabase
            .from('users')
            .select('name, nickname, profile_image')
            .eq('id', user.id)
            .single()
        if (data) {
            profile = { name: data.name, nickname: data.nickname, profileImage: data.profile_image }
        }
    }

    return (
        <header className="w-full border-b border-border bg-background">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
                <Link href="/" aria-label="홈">
                    <BrandLogo />
                </Link>

                {profile ? (
                    <div className="flex items-center gap-2">
                        <Link
                            href="/clubs"
                            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-muted-foreground hover:text-foreground')}
                        >
                            내 클럽
                        </Link>
                        <Link
                            href="/profile/settings"
                            className="hidden items-center gap-2 transition-opacity hover:opacity-80 sm:flex"
                        >
                            <Avatar className="size-7">
                                {profile.profileImage && (
                                    <AvatarImage src={profile.profileImage} alt={profile.nickname} />
                                )}
                                <AvatarFallback className="bg-primary/20 text-caption font-bold text-primary">
                                    {profile.nickname[0]}
                                </AvatarFallback>
                            </Avatar>
                            <span className="text-body2 font-medium">{profile.name}</span>
                        </Link>
                        <form action={logoutAction}>
                            <Button
                                type="submit"
                                variant="ghost"
                                size="sm"
                                className="gap-1.5 text-muted-foreground hover:text-foreground"
                            >
                                <LogOut className="size-3.5" />
                                <span className="hidden sm:inline">로그아웃</span>
                            </Button>
                        </form>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <Link
                            href="/login"
                            className="hidden text-body2 text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
                        >
                            로그인
                        </Link>
                        <Link href="/signup" className={cn(buttonVariants({ size: 'lg' }))}>
                            무료로 시작
                        </Link>
                    </div>
                )}
            </div>
        </header>
    )
}
