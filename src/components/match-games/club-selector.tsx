'use client'

import { useRouter } from 'next/navigation'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import type { Club } from '@/types'

type ClubSelectorProps = {
    clubs: Club[]
    currentClubId: string
}

export function ClubSelector({ clubs, currentClubId }: ClubSelectorProps) {
    const router = useRouter()
    const currentClub = clubs.find(c => c.id === currentClubId)

    return (
        <Select
            value={currentClubId}
            onValueChange={(clubId) => router.push(`/clubs/${clubId}/match-games`)}
        >
            <SelectTrigger className="w-48 h-8 text-xs bg-foreground/[0.04] border border-foreground/12 text-foreground/85 hover:border-foreground/25 hover:text-foreground focus:ring-0 focus:border-foreground/30 transition-colors rounded-lg">
                <SelectValue placeholder="클럽 선택">
                    {currentClub?.name ?? '클럽 선택'}
                </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-popover border border-foreground/12 text-foreground">
                {clubs.map((club) => (
                    <SelectItem
                        key={club.id}
                        value={club.id}
                        className="text-foreground/70 focus:bg-foreground/8 focus:text-foreground cursor-pointer text-xs"
                    >
                        {club.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
