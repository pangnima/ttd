import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

/**
 * Baseline 멤버 아바타 그룹 — 겹침 표시 + 초과 인원 +N 카운트.
 * highlightId가 있으면 해당 멤버에 lime 링으로 강조.
 */
type AvatarMember = {
    id: string
    name: string
    imageUrl?: string | null
}

type MemberAvatarGroupProps = {
    members: AvatarMember[]
    max?: number
    size?: 'sm' | 'default' | 'lg'
    highlightId?: string
    className?: string
}

export function MemberAvatarGroup({
    members,
    max = 4,
    size = 'default',
    highlightId,
    className,
}: MemberAvatarGroupProps) {
    const visible = members.slice(0, max)
    const overflow = members.length - visible.length

    return (
        <AvatarGroup className={className}>
            {visible.map((m) => (
                <Avatar
                    key={m.id}
                    size={size}
                    className={cn(m.id === highlightId && 'ring-2 ring-accent-lime')}
                >
                    {m.imageUrl ? <AvatarImage src={m.imageUrl} alt={m.name} /> : null}
                    <AvatarFallback>{m.name.slice(0, 1)}</AvatarFallback>
                </Avatar>
            ))}
            {overflow > 0 ? <AvatarGroupCount>+{overflow}</AvatarGroupCount> : null}
        </AvatarGroup>
    )
}
