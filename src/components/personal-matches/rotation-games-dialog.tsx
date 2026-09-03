'use client'

import type { RotationSession } from '@/types'
import type { RotationGamePayload } from '@/lib/personal-matches/rotation'
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { RotationGamesPanel } from '@/components/personal-matches/rotation-games-panel'
import { formatHourLabel } from '@/lib/format'

type Props = {
    open: boolean
    onOpenChange: (open: boolean) => void
    session: RotationSession
    onSubmit: (games: RotationGamePayload[]) => void
    isPending: boolean
    error: string | null
}

/**
 * 로테이션 세션 '결과 입력' 레이어 팝업 — 게임 빌더는 폭이 넓어(셀렉트 3개 + 스코어 + 애드 토글) 넓은 Dialog로 연다.
 * 닫히면 패널이 언마운트되어 게임 입력 state가 초기화된다.
 */
export function RotationGamesDialog({ open, onOpenChange, session, onSubmit, isPending, error }: Props) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>로테이션 게임 입력</DialogTitle>
                    <DialogDescription>
                        {session.playedAt.replaceAll('-', '.')} {formatHourLabel(session.playedTime)} · 게임마다 파트너·상대를 고르고 스코어를 입력하면 게임별 경기로 저장됩니다.
                    </DialogDescription>
                </DialogHeader>
                <RotationGamesPanel session={session} onSubmit={onSubmit} isPending={isPending} error={error} />
            </DialogContent>
        </Dialog>
    )
}
