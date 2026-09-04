'use client'

import { useMemo, useTransition } from 'react'
import type { RotationSession } from '@/types'
import { Button } from '@/components/ui/button'
import { PENDING_RESULT_BADGE, PENDING_RESULT_BAR } from '@/lib/dashboard/outcome'
import { deleteRotationSessionAction, finalizeRotationSessionAction } from '@/lib/actions/rotation-sessions'
import { RotationGamesDialog } from '@/components/personal-matches/rotation-games-dialog'
import { buildBuilderPool, type RoomParticipant } from '@/lib/personal-matches/rotation-pool'
import type { PoolPickerProps } from '@/components/personal-matches/rotation/pool-editor-block'
import { useResultDialog } from '@/components/personal-matches/use-result-dialog'
import { MatchDateColumn } from '@/components/personal-matches/match-date-column'
import { MatchMetaLine } from '@/components/personal-matches/match-meta-line'
import { RoomLink } from '@/components/match-rooms/room-link'

type Props = {
    session: RotationSession
    picker: PoolPickerProps
    viewerId: string
    roomParticipants: RoomParticipant[]
}

/**
 * 결과 입력 대기 로테이션 세션 카드 — 참가자 요약 + 시각·코트명·메모 + [결과 입력](게임 빌더 Dialog).
 * 방 세션은 참가자 누구에게나 보이고 누구나 게임을 입력할 수 있다(0050). 세션 삭제는 만든 사람만.
 */
export function RotationSessionCard({ session: s, picker, viewerId, roomParticipants }: Props) {
    const d = useResultDialog()
    const [isDeleting, startDelete] = useTransition()
    const isOwner = s.userId === viewerId
    // 빌더의 '나' = 입력자이므로 카드의 참가자 요약도 같은 풀(세션 풀 ∪ 방 참가자 − 나)로 보여준다
    const pool = useMemo(() => buildBuilderPool(s.players, roomParticipants, viewerId), [s.players, roomParticipants, viewerId])

    function handleDelete() {
        if (!confirm('이 로테이션 세션을 삭제할까요? 참가자 정보가 사라집니다.')) return
        startDelete(async () => { await deleteRotationSessionAction(s.id) })
    }

    return (
        <div className="flex items-stretch gap-3 px-3 py-3">
            <span className={`w-1 self-stretch rounded-full ${PENDING_RESULT_BAR}`} aria-hidden />
            <MatchDateColumn playedAt={s.playedAt} matchType={s.matchType} surface={s.surface} />

            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <p className="text-body2 font-medium text-foreground truncate">
                            {pool.length === 0 ? '로테이션 · 참가자 모집 중' : `로테이션 · 참가자 ${pool.length}명`}
                        </p>
                        {pool.length > 0 && (
                            <p className="text-caption text-muted-foreground truncate">{pool.map((p) => p.name).join(' · ')}</p>
                        )}
                    </div>
                    <span className={`px-2 py-1 rounded-[4px] text-caption font-bold shrink-0 ${PENDING_RESULT_BADGE}`}>게임 미입력</span>
                </div>
                <MatchMetaLine playedTime={s.playedTime} courtName={s.courtName} notes={s.notes} className="mt-1 space-y-0.5" />
                {s.roomId && <RoomLink roomId={s.roomId} className="mt-1 inline-block" />}
                <div className="flex items-center justify-end gap-2 mt-2">
                    <Button size="sm" variant="outline" className="h-7 text-caption" onClick={d.openDialog}>결과 입력</Button>
                    {isOwner && (
                        <button onClick={handleDelete} disabled={isDeleting} className="text-caption text-destructive/80 hover:text-destructive transition-colors disabled:opacity-40">
                            삭제
                        </button>
                    )}
                </div>
            </div>

            <RotationGamesDialog
                open={d.open}
                onOpenChange={d.setOpen}
                session={s}
                pool={pool}
                isRoomSession={!!s.roomId}
                picker={picker}
                onSubmit={(games) => d.run(() => finalizeRotationSessionAction(s.id, games))}
                isPending={d.isPending}
                error={d.error}
            />
        </div>
    )
}
