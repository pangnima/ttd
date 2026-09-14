'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createRoomLineupAction } from '@/lib/actions/match-rooms'
import { toSavePayload, type DraftGame } from '@/lib/match-rooms/lineup-draft'

type Options = { roomId: string; onDone: () => void }

export type RoomLineupSaveState = {
    saving: boolean
    error: string | null
    save: (games: DraftGame[], slotMinutes?: number) => Promise<void>
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
        // 호스트가 고른 경기당 시간을 함께 보낸다(0078) — 방이 그 값을 기억해야 라운드 예상 시각이
        // 팝업에서 본 것과 같아진다. 안 보내면 방은 소요 시간으로 역산한다(옛 동작).
        save: async (games, slotMinutes) => {
            setSaving(true)
            setError(null)
            const res = await createRoomLineupAction(roomId, toSavePayload(games), slotMinutes)
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
