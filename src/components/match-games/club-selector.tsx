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
            <SelectTrigger className="w-56">
                <SelectValue placeholder="클럽 선택">
                    {currentClub?.name ?? '클럽 선택'}
                </SelectValue>
            </SelectTrigger>
            <SelectContent>
                {clubs.map((club) => (
                    <SelectItem key={club.id} value={club.id}>
                        {club.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
