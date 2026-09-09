'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { MatchType } from '@/types'
import type { OpponentCandidate } from '@/lib/queries/users'
import { createRoomLineupAction } from '@/lib/actions/match-rooms'
import { TYPO } from '@/lib/dashboard/tokens'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { LineupOptions } from '@/components/match-rooms/form-sections/lineup-options'
import { RoomLineupPreview } from '@/components/match-rooms/room-lineup-preview'
import { useRoomLineup } from '@/components/match-rooms/use-room-lineup'

type Props = {
    open: boolean
    onOpenChange: (open: boolean) => void
    roomId: string
    matchType: MatchType
    candidates: OpponentCandidate[]
    /** 이미 저장된 게임 수 — 대진은 덮어쓰지 않고 이어붙이므로 미리 알린다 */
    existingGames: number
}

/**
 * 자동 대진표 다이얼로그 — 옵션을 바꾸면 미리보기가 즉시 다시 그려지고, [저장]에서만 방에 반영된다.
 * 저장된 대진은 스코어가 없는 게임들이므로 그대로 방 게임 목록에 뜨고, 결과 입력부터는 기존 경로다.
 */
export function RoomLineupDialog({ open, onOpenChange, roomId, matchType, candidates, existingGames }: Props) {
    const lineup = useRoomLineup({ candidates, matchType })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

    async function handleSave() {
        setSaving(true)
        setError(null)
        const games = lineup.result.games.map((g) => ({
            team1: g.team1.map((p) => ({ userId: p.isMember ? p.key : undefined, name: p.name })),
            team2: g.team2.map((p) => ({ userId: p.isMember ? p.key : undefined, name: p.name })),
        }))
        const res = await createRoomLineupAction(roomId, games)
        setSaving(false)
        if (res.error) {
            setError(res.error)
            return
        }
        onOpenChange(false)
        router.refresh()
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>자동 대진표</DialogTitle>
                </DialogHeader>

                {existingGames > 0 && (
                    <p className={`${TYPO.caption} text-spot break-keep`}>
                        이미 게임 {existingGames}개가 있습니다. 새 대진은 덮어쓰지 않고 이어서 추가됩니다.
                    </p>
                )}

                <LineupOptions
                    candidates={candidates}
                    included={lineup.included}
                    onToggle={lineup.toggle}
                    perPlayer={lineup.perPlayer}
                    onPerPlayerChange={lineup.setPerPlayer}
                    preset={lineup.preset}
                    onPresetChange={lineup.setPreset}
                    gameCount={lineup.gameCount}
                />

                <RoomLineupPreview result={lineup.result} nameOf={lineup.nameOf} />

                {error && <p className={`${TYPO.caption} text-destructive break-keep`}>{error}</p>}

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={lineup.reroll} disabled={saving}>
                        다시 뽑기
                    </Button>
                    <Button onClick={handleSave} disabled={saving || lineup.result.games.length === 0}>
                        {saving ? '저장 중…' : `${lineup.result.games.length}경기 저장`}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
