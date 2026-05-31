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
            <SelectTrigger className="w-48 h-8 text-xs bg-background border border-input text-foreground hover:border-ring focus:ring-0 focus:border-ring transition-colors rounded-lg">
                <SelectValue placeholder="클럽 선택">
                    {currentClub?.name ?? '클럽 선택'}
                </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-popover border border-border text-foreground">
                {clubs.map((club) => (
                    <SelectItem
                        key={club.id}
                        value={club.id}
                        className="text-muted-foreground focus:bg-muted focus:text-foreground cursor-pointer text-xs"
                    >
                        {club.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
