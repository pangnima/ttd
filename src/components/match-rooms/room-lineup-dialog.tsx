'use client'

import { useState } from 'react'
import type { MatchType } from '@/types'
import type { OpponentCandidate } from '@/lib/queries/users'
import { Button } from '@/components/ui/button'
import { FormActions } from '@/components/common/form-actions'
import { FORM_CANCEL } from '@/lib/dashboard/tokens'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { LineupOptions } from '@/components/match-rooms/form-sections/lineup-options'
import { LineupRecommendation } from '@/components/match-rooms/form-sections/lineup-recommendation'
import { LineupEditList } from '@/components/match-rooms/lineup-edit/lineup-edit-list'
import { RoomLineupNotices } from '@/components/match-rooms/room-lineup-notices'
import { useRoomLineup } from '@/components/match-rooms/use-room-lineup'
import { useRoomLineupSave } from '@/components/match-rooms/use-room-lineup-save'

type Props = {
    open: boolean
    onOpenChange: (open: boolean) => void
    roomId: string
    matchType: MatchType
    candidates: OpponentCandidate[]
    /** 이미 저장된 게임 수 — 대진은 덮어쓰지 않고 이어붙인다 */
    existingGames: number
    /** 방의 일정 — 권장 경기 수를 내는 근거 (0073). 모르는 방이면 추천 줄이 뜨지 않는다 */
    playedTime?: string
    durationMinutes?: number
    courtCount?: number
}

/**
 * 자동 대진표 다이얼로그 — 옵션을 바꾸면 대진이 즉시 다시 그려지고, [저장]에서만 방에 반영된다.
 * 뽑힌 대진은 그대로 쓸 수도 있고 자리를 고칠 수도 있다(카드마다 [수정]·[삭제], 목록 아래 [게임 추가]).
 * 저장된 대진은 스코어가 없는 게임들이므로 그대로 방 게임 목록에 뜨고, 결과 입력부터는 기존 경로다.
 *
 * 골격은 헤더·푸터 고정 + 본문만 스크롤이다. 옵션이 길어 결과와 [저장]이 스크롤 아래로 묻히던 것을
 * DialogFooter(구분선 + bg-muted/50)로 바닥에 붙였다.
 */
export function RoomLineupDialog({
    open, onOpenChange, roomId, matchType, candidates, existingGames,
    playedTime, durationMinutes, courtCount = 1,
}: Props) {
    const lineup = useRoomLineup({ candidates, matchType, durationMinutes, courtCount })
    const save = useRoomLineupSave({ roomId, onDone: () => onOpenChange(false) })
    const [optionsOpen, setOptionsOpen] = useState(true)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col overflow-hidden" showCloseButton={false}>
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
                        slotMinutes={lineup.slotMinutes}
                        onSlotMinutesChange={lineup.setSlotMinutes}
                        recommendation={(
                            <LineupRecommendation
                                recommendation={lineup.recommendation}
                                playedTime={playedTime}
                                durationMinutes={durationMinutes}
                                slotMinutes={lineup.slotMinutes}
                                perPlayer={lineup.perPlayer}
                                isEdited={lineup.isEdited}
                                gameCount={lineup.draft.length}
                                estimatedMinutes={lineup.estimatedMinutes}
                                onApply={lineup.setPerPlayer}
                            />
                        )}
                        preset={lineup.preset}
                        onPresetChange={lineup.setPreset}
                        gameCount={lineup.gameCount}
                        open={optionsOpen}
                        onOpenChange={setOptionsOpen}
                    />
                    <RoomLineupNotices
                        existingGames={existingGames}
                        warnings={lineup.warnings}
                        error={save.error}
                        isEdited={lineup.isEdited}
                    />
                    <LineupEditList
                        games={lineup.draft}
                        players={lineup.players}
                        matchType={matchType}
                        onChange={lineup.setDraft}
                        courts={lineup.courts}
                        playedTime={playedTime}
                        slotMinutes={lineup.slotMinutes}
                    />
                </div>

                <DialogFooter>
                    <FormActions
                        submitLabel={`${lineup.draft.length}경기 저장`}
                        pendingLabel="저장 중…"
                        onSubmit={() => save.save(lineup.draft)}
                        onCancel={() => onOpenChange(false)}
                        isPending={save.saving}
                        disabled={lineup.errors.length > 0}
                        secondary={(
                            <Button variant="outline" className={FORM_CANCEL} onClick={lineup.reroll} disabled={save.saving}>
                                다시 뽑기
                            </Button>
                        )}
                    />
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
