'use client'

import type { RotationPoolPlayer, RotationSession } from '@/types'
import type { RotationGamePayload } from '@/lib/personal-matches/rotation'
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { RotationGamesPanel } from '@/components/personal-matches/rotation-games-panel'
import type { PoolAdmin, PoolPickerProps } from '@/components/personal-matches/rotation/pool-editor-block'
import { formatHourLabel } from '@/lib/format'
import type { EnteredRotationGame } from '@/lib/personal-matches/rotation-entered'

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
    /** 세션 명부를 실제로 바꿀 수 있는 화면일 때만 온다 — 방 밖 세션 + 소유자/수락자 (0058) */
    poolAdmin?: Omit<PoolAdmin, 'onLocalAdd'>
    /** 이 세션에 등록된 게임 (0063·0064) — 팝업 상단에 읽기 전용으로 보여 중복 입력을 막는다 */
    enteredGames?: EnteredRotationGame[]
    /** 저장이 막힌 이유 (0064). 있으면 저장 버튼을 비활성화하고 이유·탈출구를 보여준다 */
    blockedReason?: string
}

/**
 * 로테이션 세션 '결과 입력' 레이어 팝업 — 게임 빌더는 폭이 넓어(셀렉트 3개 + 스코어 + 애드 토글) 넓은 Dialog로 연다.
 * 닫히면 패널이 언마운트되어 게임 입력 state가 초기화된다.
 */
export function RotationGamesDialog({ open, onOpenChange, session, pool, isRoomSession, picker, onSubmit, isPending, error, poolAdmin, enteredGames, blockedReason }: Props) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>로테이션 게임 입력</DialogTitle>
                    <DialogDescription>
                        {session.playedAt.replaceAll('-', '.')} {formatHourLabel(session.playedTime)} · 게임마다 파트너·상대를 고르고 스코어를 입력하면 게임별 경기로 저장됩니다.
                    </DialogDescription>
                </DialogHeader>
                <RotationGamesPanel pool={pool} isRoomSession={isRoomSession} picker={picker} onSubmit={onSubmit} isPending={isPending} error={error} poolAdmin={poolAdmin} enteredGames={enteredGames} blockedReason={blockedReason} />
            </DialogContent>
        </Dialog>
    )
}
