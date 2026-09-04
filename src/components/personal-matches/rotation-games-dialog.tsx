'use client'

import type { RotationPoolPlayer, RotationSession } from '@/types'
import type { RotationGamePayload } from '@/lib/personal-matches/rotation'
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { RotationGamesPanel } from '@/components/personal-matches/rotation-games-panel'
import type { PoolPickerProps } from '@/components/personal-matches/rotation/pool-editor-block'
import { formatHourLabel } from '@/lib/format'

type Props = {
    open: boolean
    onOpenChange: (open: boolean) => void
    session: RotationSession
    /** 빌더 풀 — 세션 풀 ∪ 방 참가자 − 나 (0050) */
    pool: RotationPoolPlayer[]
    isRoomSession: boolean
    picker: PoolPickerProps
    onSubmit: (games: RotationGamePayload[]) => void
    isPending: boolean
    error: string | null
}

/**
 * 로테이션 세션 '결과 입력' 레이어 팝업 — 게임 빌더는 폭이 넓어(셀렉트 3개 + 스코어 + 애드 토글) 넓은 Dialog로 연다.
 * 닫히면 패널이 언마운트되어 게임 입력 state가 초기화된다.
 */
export function RotationGamesDialog({ open, onOpenChange, session, pool, isRoomSession, picker, onSubmit, isPending, error }: Props) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>로테이션 게임 입력</DialogTitle>
                    <DialogDescription>
                        {session.playedAt.replaceAll('-', '.')} {formatHourLabel(session.playedTime)} · 게임마다 파트너·상대를 고르고 스코어를 입력하면 게임별 경기로 저장됩니다.
                    </DialogDescription>
                </DialogHeader>
                <RotationGamesPanel pool={pool} isRoomSession={isRoomSession} picker={picker} onSubmit={onSubmit} isPending={isPending} error={error} />
            </DialogContent>
        </Dialog>
    )
}
