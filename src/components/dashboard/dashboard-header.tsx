import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { User } from '@/types'

type Props = { me: User }

export function DashboardHeader({ me }: Props) {
    // 서버 UTC 시각을 한국 시간대(Asia/Seoul, UTC+9)로 변환
    const hour = new Date(
        new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' })
    ).getHours()
    const greeting =
        hour < 12 ? '좋은 아침이에요' : hour < 18 ? '안녕하세요' : '좋은 저녁이에요'

    return (
        <div className="flex items-center justify-between">
            <div className="space-y-1">
                <p className="text-[11px] font-medium tracking-widest uppercase text-foreground/65">
                    대시보드
                </p>
                <h1 className="text-2xl font-bold text-foreground">
                    {greeting},{' '}
                    <span className="text-foreground/85">{me.nickname}</span>
                </h1>
            </div>
            <Link
                href="/profile/settings"
                className="flex items-center gap-2 hover:opacity-75 transition-opacity group"
            >
                <Avatar className="w-9 h-9">
                    {me.profileImage && (
                        <AvatarImage src={me.profileImage} alt={me.nickname} />
                    )}
                    <AvatarFallback className="bg-primary/20 text-primary text-sm font-bold">
                        {me.nickname[0] ?? me.name[0] ?? '?'}
                    </AvatarFallback>
                </Avatar>
                <span className="hidden sm:block text-xs text-foreground/55 group-hover:text-foreground transition-colors">
                    프로필 변경
                </span>
            </Link>
        </div>
    )
}
