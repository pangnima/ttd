'use client'

import { useRouter } from 'next/navigation'
import type { Club } from '@/types'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { SECTION_LABEL } from '@/lib/dashboard/tokens'

type Props = {
    clubs: Club[]
    selectedClubId?: string
}

export function ClubSelector({ clubs, selectedClubId }: Props) {
    const router = useRouter()
    const selectedName = clubs.find((c) => c.id === selectedClubId)?.name

    return (
        <div className="flex items-center gap-3">
            <span className={SECTION_LABEL}>클럽</span>
            <Select
                value={selectedClubId}
                onValueChange={(id) => id && router.push(`/dashboard?clubId=${id}`)}
            >
                <SelectTrigger className="w-[200px] h-8 text-sm">
                    <SelectValue placeholder="클럽 선택">
                        {selectedName ?? '클럽 선택'}
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
        </div>
    )
}
