'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { MatchRoomGame, MatchType } from '@/types'
import type { OpponentCandidate } from '@/lib/queries/users'
import type { EditableLineupGame } from '@/lib/queries/match-rooms'
import { toLineupPlayers } from '@/lib/match-rooms/lineup'
import { effectiveCourtCount } from '@/lib/match-rooms/court-slots'
import { fromRoomGames, toSavePayload, validateDraft, type DraftGame } from '@/lib/match-rooms/lineup-draft'
import { replaceRoomLineupAction } from '@/lib/actions/match-rooms'
import { TYPO } from '@/lib/dashboard/tokens'
import { FormActions } from '@/components/common/form-actions'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { LineupEditList } from '@/components/match-rooms/lineup-edit/lineup-edit-list'

type Props = {
    open: boolean
    onOpenChange: (open: boolean) => void
    roomId: string
    matchType: MatchType
    candidates: OpponentCandidate[]
    games: MatchRoomGame[]
    editable: EditableLineupGame[]
    playedTime?: string
    durationMinutes?: number
    /** 방이 기억한 경기당 시간(0078) — 편집 화면은 이 값을 묻지 않고 그대로 쓴다 */
    slotMinutes?: number
    courtCount: number
}

/**
 * 저장된 대진 고치기(0071) — 자동 대진표와 같은 편집 화면을 쓰고, 저장만 교체 RPC로 간다.
 *
 * 결과가 붙은 게임은 애초에 목록에 없다. 편집 도중 누가 결과를 넣으면 저장이 `stale`로 돌아오는데,
 * 그때는 팝업을 닫지 않고 화면만 새로 읽는다 — 사용자가 고친 내용을 잃지 않게(0060 관용구).
 */
export function RoomLineupEditDialog({
    open, onOpenChange, roomId, matchType, candidates, games, editable, playedTime, durationMinutes, slotMinutes, courtCount,
}: Props) {
    const players = useMemo(() => toLineupPlayers(candidates), [candidates])
    const targets = useMemo(() => {
        const ids = new Set(editable.map((e) => e.gameId))
        return games.filter((g) => ids.has(g.id))
    }, [games, editable])

    const [draft, setDraft] = useState<DraftGame[]>(() => fromRoomGames(targets, players))
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

    const errors = validateDraft(draft)

    async function handleSave() {
        setSaving(true)
        setError(null)
        const res = await replaceRoomLineupAction(roomId, editable.map((e) => e.gameId), toSavePayload(draft))
        setSaving(false)
        if (res.error) {
            setError(res.error)
            if (res.stale) router.refresh()
            return
        }
        onOpenChange(false)
        router.refresh()
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col overflow-hidden" showCloseButton={false}>
                <DialogHeader>
                    <DialogTitle>대진 편집</DialogTitle>
                </DialogHeader>

                <div className="flex-1 min-h-0 overflow-y-auto space-y-4">
                    <p className={`${TYPO.caption} break-keep`}>
                        결과가 입력되었거나 확인이 시작된 경기는 여기에 오지 않습니다. 저장하면 이 목록이 방의 대진을 대체합니다.
                    </p>
                    {error && <p className={`${TYPO.caption} text-destructive break-keep`}>{error}</p>}
                    <LineupEditList
                        games={draft}
                        players={players}
                        matchType={matchType}
                        onChange={setDraft}
                        courts={effectiveCourtCount(players.length, matchType, courtCount)}
                        playedTime={playedTime}
                        durationMinutes={durationMinutes}
                        slotMinutes={slotMinutes}
                    />
                </div>

                <DialogFooter>
                    <FormActions
                        submitLabel={draft.length === 0 ? '대진 전부 삭제' : `${draft.length}경기 저장`}
                        pendingLabel="저장 중…"
                        onSubmit={handleSave}
                        onCancel={() => onOpenChange(false)}
                        isPending={saving}
                        disabled={errors.length > 0 && draft.length > 0}
                    />
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
