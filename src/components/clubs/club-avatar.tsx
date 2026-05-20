import Image from 'next/image'
import { cn } from '@/lib/utils'

type ClubAvatarProps = {
    name: string
    logoUrl?: string
    size?: 'sm' | 'md' | 'lg'
    className?: string
}

const sizeStyles: Record<NonNullable<ClubAvatarProps['size']>, string> = {
    sm: 'w-8 h-8 text-xs rounded-md',
    md: 'w-9 h-9 text-sm rounded-md',
    lg: 'w-14 h-14 text-base rounded-xl',
}

export function ClubAvatar({ name, logoUrl, size = 'md', className }: ClubAvatarProps) {
    const base = cn(
        'bg-foreground/5 border border-foreground/10 flex items-center justify-center shrink-0 overflow-hidden relative',
        sizeStyles[size],
        className
    )

    if (logoUrl) {
        return (
            <div className={base}>
                <Image src={logoUrl} alt={name} fill className="object-cover" sizes="56px" />
            </div>
        )
    }

    return (
        <div className={cn(base, 'font-semibold text-foreground/70')}>
            {name.charAt(0).toUpperCase() || '?'}
        </div>
    )
}
