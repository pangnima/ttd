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
            <SelectTrigger className="w-48 h-8 text-xs bg-white/[0.04] border border-white/12 text-white/85 hover:border-white/25 hover:text-white focus:ring-0 focus:border-white/30 transition-colors rounded-lg">
                <SelectValue placeholder="클럽 선택">
                    {currentClub?.name ?? '클럽 선택'}
                </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-zinc-950 border border-white/12 text-white">
                {clubs.map((club) => (
                    <SelectItem
                        key={club.id}
                        value={club.id}
                        className="text-white/70 focus:bg-white/8 focus:text-white cursor-pointer text-xs"
                    >
                        {club.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
