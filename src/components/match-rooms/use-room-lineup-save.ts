'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createRoomLineupAction } from '@/lib/actions/match-rooms'
import { toSavePayload, type DraftGame } from '@/lib/match-rooms/lineup-draft'

type Options = { roomId: string; onDone: () => void }

export type RoomLineupSaveState = {
    saving: boolean
    error: string | null
    save: (games: DraftGame[]) => Promise<void>
}

/**
 * 자동 대진표 저장 — 대진을 방에 꽂고 목록을 새로 읽는다.
 * 다이얼로그에서 분리한 이유는 편집 UI가 들어오며 컴포넌트가 100줄을 넘겼기 때문이다.
 */
export function useRoomLineupSave({ roomId, onDone }: Options): RoomLineupSaveState {
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

    return {
        saving,
        error,
        save: async (games) => {
            setSaving(true)
            setError(null)
            const res = await createRoomLineupAction(roomId, toSavePayload(games))
            setSaving(false)
            if (res.error) {
                setError(res.error)
                return
            }
            onDone()
            router.refresh()
        },
    }
}
