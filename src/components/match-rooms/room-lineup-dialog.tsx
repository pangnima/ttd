'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { MatchType } from '@/types'
import type { OpponentCandidate } from '@/lib/queries/users'
import { createRoomLineupAction } from '@/lib/actions/match-rooms'
import { Button } from '@/components/ui/button'
import { FormActions } from '@/components/common/form-actions'
import { FORM_CANCEL } from '@/lib/dashboard/tokens'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { LineupOptions } from '@/components/match-rooms/form-sections/lineup-options'
import { RoomLineupNotices } from '@/components/match-rooms/room-lineup-notices'
import { RoomLineupPreview } from '@/components/match-rooms/room-lineup-preview'
import { useRoomLineup } from '@/components/match-rooms/use-room-lineup'

type Props = {
    open: boolean
    onOpenChange: (open: boolean) => void
    roomId: string
    matchType: MatchType
    candidates: OpponentCandidate[]
    /** 이미 저장된 게임 수 — 대진은 덮어쓰지 않고 이어붙인다 */
    existingGames: number
}

/**
 * 자동 대진표 다이얼로그 — 옵션을 바꾸면 미리보기가 즉시 다시 그려지고, [저장]에서만 방에 반영된다.
 * 저장된 대진은 스코어가 없는 게임들이므로 그대로 방 게임 목록에 뜨고, 결과 입력부터는 기존 경로다.
 *
 * 골격은 헤더·푸터 고정 + 본문만 스크롤이다. 옵션이 길어 결과와 [저장]이 스크롤 아래로 묻히던 것을
 * DialogFooter(구분선 + bg-muted/50)로 바닥에 붙였다.
 */
export function RoomLineupDialog({ open, onOpenChange, roomId, matchType, candidates, existingGames }: Props) {
    const lineup = useRoomLineup({ candidates, matchType })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [optionsOpen, setOptionsOpen] = useState(true)
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
            <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
                <DialogHeader>
                    <DialogTitle>자동 대진표</DialogTitle>
                </DialogHeader>

                <div className="flex-1 min-h-0 overflow-y-auto space-y-4">
                    <LineupOptions
                        candidates={candidates}
                        included={lineup.included}
                        onToggle={lineup.toggle}
                        perPlayer={lineup.perPlayer}
                        onPerPlayerChange={lineup.setPerPlayer}
                        preset={lineup.preset}
                        onPresetChange={lineup.setPreset}
                        gameCount={lineup.gameCount}
                        open={optionsOpen}
                        onOpenChange={setOptionsOpen}
                    />
                    <RoomLineupNotices
                        existingGames={existingGames}
                        warnings={lineup.result.warnings}
                        error={error}
                    />
                    <RoomLineupPreview result={lineup.result} nameOf={lineup.nameOf} />
                </div>

                <DialogFooter>
                    <FormActions
                        submitLabel={`${lineup.result.games.length}경기 저장`}
                        pendingLabel="저장 중…"
                        onSubmit={handleSave}
                        onCancel={() => onOpenChange(false)}
                        isPending={saving}
                        disabled={lineup.result.games.length === 0}
                        secondary={(
                            <Button variant="outline" className={FORM_CANCEL} onClick={lineup.reroll} disabled={saving}>
                                다시 뽑기
                            </Button>
                        )}
                    />
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
