import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { avatarColorClass } from '@/lib/avatar-color'
import { cn } from '@/lib/utils'

type Props = {
    /** 이니셜·색 seed. 이니셜은 닉네임 첫 글자, 없으면 이름 첫 글자, 없으면 '?' */
    name: string
    nickname?: string | null
    image?: string | null
    /** 같은 사람은 항상 같은 fallback 색(`avatarColorClass`). 없으면 무채 */
    userId?: string | null
    size?: 'sm' | 'md' | 'lg' | 'xl'
    alt?: string
    className?: string
}

const SIZE: Record<NonNullable<Props['size']>, { box: string; text: string }> = {
    sm: { box: 'w-7 h-7', text: 'text-caption' },
    md: { box: 'w-8 h-8', text: 'text-caption' },
    lg: { box: 'w-12 h-12', text: 'text-h4' },
    xl: { box: 'w-16 h-16', text: 'text-h3' },
}

/**
 * 사용자 아바타 — 헤더·프로필·룸 명단·회원 검색이 각자 이니셜 규칙(4종)과 fallback 색(6종)을 갖고 있던 것을
 * 하나로(Week 69). 이미지는 provider 외부 URL이 올 수 있어 `next/image`가 아니라 네이티브 `<img>`(shadcn Avatar)다
 * — 등록되지 않은 호스트는 렌더 중 throw라 허용목록을 쓰지 않는다(next.config.ts 주석).
 */
export function UserAvatar({ name, nickname, image, userId, size = 'md', alt, className }: Props) {
    const initial = nickname?.trim()[0] ?? name.trim()[0] ?? '?'
    const s = SIZE[size]
    return (
        <Avatar className={cn(s.box, 'shrink-0', className)}>
            {image && <AvatarImage src={image} alt={alt ?? nickname ?? name} />}
            <AvatarFallback className={cn(userId ? avatarColorClass(userId) : 'bg-muted text-muted-foreground', s.text, 'font-bold')}>
                {initial}
            </AvatarFallback>
        </Avatar>
    )
}
