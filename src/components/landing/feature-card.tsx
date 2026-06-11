import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

import { Chip } from '@/components/common/chip'
import { CARD_BASE } from '@/lib/dashboard/tokens'
import { cn } from '@/lib/utils'

type ChipTone = 'win' | 'info' | 'lime'

type FeatureCardProps = {
    icon: LucideIcon
    chipLabel: string
    chipTone: ChipTone
    title: string
    description: string
}

export function FeatureCard({
    icon: Icon,
    chipLabel,
    chipTone,
    title,
    description,
}: FeatureCardProps) {
    return (
        <div className={cn(CARD_BASE, 'flex flex-col p-6')}>
            <div className="mb-4 flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-md bg-secondary text-foreground">
                    <Icon className="size-5" />
                </span>
                <Chip variant="soft" tone={chipTone}>
                    {chipLabel}
                </Chip>
            </div>
            <h3 className="type-title text-foreground">{title}</h3>
            <p className="mt-2 flex-1 text-sm text-muted-foreground">{description}</p>
            <Link
                href="#"
                className="mt-5 inline-flex w-fit items-center gap-1 text-sm font-medium text-foreground hover:underline"
            >
                자세히 보기 →
            </Link>
        </div>
    )
}
