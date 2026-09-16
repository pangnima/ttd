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
import { MatchRow } from '@/components/common/match-row'
import { MatchMetaLine } from '@/components/personal-matches/match-meta-line'
import { RoomLink } from '@/components/match-rooms/room-link'
import { ProgressBadge } from '@/components/common/progress-badge'
import { formatAcceptanceProgress } from '@/lib/match-requests/participants'
import { canManageRotationPool, pendingSeats, poolMemberIds, rejectedSeats } from '@/lib/personal-matches/rotation-participation'
import {
    awaitingConsentNote, enteredBadgeLabel, nextGroupSeq, type EnteredRotationGame,
} from '@/lib/personal-matches/rotation-entered'

type Props = {
    session: RotationSession
    picker: PoolPickerProps
    viewerId: string
    roomParticipants: RoomParticipant[]
    /**
     * 내가 이미 이 세션에 넣은 게임들 (0063). 종전에는 boolean이었고 판정도 personal_matches만
     * 봐서, 미수락 회원이 낀 게임은 finalize가 성공해도 '게임 미입력'으로 남았다 —
     * 사용자가 다시 넣으면 중복 요청이 쌓인다. 이제 목록을 받아 무엇이 들어갔는지 직접 말한다.
     */
    enteredGames?: EnteredRotationGame[]
    /**
     * 아직 응답하지 않은 참가자가 있어 결과를 저장할 수 없는 상태 (0064).
     * 카드를 숨기지 않고 남기는 이유는 이 카드가 **무응답 탈출구의 유일한 진입점**이기 때문이다 —
     * 팝업 안 참가자 편집에서 응답 없는 회원을 게스트로 대체해야 그날 경기를 기록할 수 있다.
     */
    resultBlocked?: boolean
}

/**
 * 결과 입력 대기 로테이션 세션 카드 — 참가자 요약 + 시각·코트명·메모 + [결과 입력](게임 빌더 Dialog).
 * 방 세션은 참가자 누구에게나 보이고 누구나 게임을 입력할 수 있다(0050). 세션 삭제는 만든 사람만.
 */
export function RotationSessionCard({
    session: s, picker, viewerId, roomParticipants, enteredGames = [], resultBlocked = false,
}: Props) {
    const d = useResultDialog()
    const [isDeleting, startDelete] = useTransition()
    const isOwner = s.userId === viewerId
    const entered = enteredGames.length > 0
    // 빌더의 '나' = 입력자이므로 카드의 참가자 요약도 같은 풀(세션 풀 ∪ 방 참가자 − 나)로 보여준다
    const pool = useMemo(() => buildBuilderPool(s.players, roomParticipants, viewerId), [s.players, roomParticipants, viewerId])
    const waitingNames = pendingSeats(s.seats).map((seat) => seat.name)
    const declinedNames = rejectedSeats(s.seats).map((seat) => seat.name)
    const consentNote = awaitingConsentNote(enteredGames, waitingNames.length)
    // 명부 편집은 방 밖 세션에서만 — 방은 '비밀번호 공유 = 초대'라 명단의 권위가 match_room_members다(0058)
    const poolAdmin = canManageRotationPool(s, viewerId)
        ? {
            sessionId: s.id,
            seats: s.seats,
            poolMemberIds: poolMemberIds(s.players),
            ownerUserId: s.userId,
            canInvite: true,
            isOwner,
        }
        : undefined

    function handleDelete() {
        if (!confirm('이 로테이션 세션을 삭제할까요? 참가자 정보가 사라집니다.')) return
        startDelete(async () => { await deleteRotationSessionAction(s.id) })
    }

    return (
        <MatchRow playedAt={s.playedAt} matchType={s.matchType} surface={s.surface} barClass={PENDING_RESULT_BAR}>
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <p className="text-body2 font-medium text-foreground truncate">
                            {pool.length === 0 ? '로테이션 · 참가자 모집 중' : `로테이션 · 참가자 ${pool.length}명`}
                        </p>
                        {pool.length > 0 && (
                            <p className="text-caption text-muted-foreground truncate">{pool.map((p) => p.name).join(' · ')}</p>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        {/* 참여 진행도(0057) — 주최자가 "누가 아직 답을 안 했는지"를 여기서 본다 */}
                        <ProgressBadge label={formatAcceptanceProgress(s.seats)} />
                        <span className={`px-2 py-1 rounded-[4px] text-caption font-bold ${PENDING_RESULT_BADGE}`}>
                            {enteredBadgeLabel(enteredGames)}
                        </span>
                    </div>
                </div>
                {waitingNames.length > 0 && (
                    <p className="text-caption text-muted-foreground truncate">응답 대기: {waitingNames.join(' · ')}</p>
                )}
                {declinedNames.length > 0 && (
                    <p className="text-caption text-muted-foreground truncate">거절: {declinedNames.join(' · ')}</p>
                )}
                {/* 입력은 됐지만 아직 아무의 기록도 아닌 상태를 화면이 직접 말한다(0063) —
                    종전에는 저장 후에도 카드가 그대로라 사용자가 실패로 읽고 다시 넣었다 */}
                {consentNote && <p className="text-caption text-muted-foreground">{consentNote}</p>}
                <MatchMetaLine playedTime={s.playedTime} courtName={s.courtName} notes={s.notes} className="mt-1 space-y-0.5" />
                {s.roomId && <RoomLink roomId={s.roomId} className="mt-1 inline-block" />}
                <div className="flex items-center justify-end gap-2 mt-2">
                    <Button size="sm" variant="outline" className="h-7 text-caption" onClick={d.openDialog}>
                        {resultBlocked ? '참가자 편집' : entered ? '게임 추가 입력' : '결과 입력'}
                    </Button>
                    {isOwner && (
                        <button onClick={handleDelete} disabled={isDeleting} className="text-caption text-destructive/80 hover:text-destructive transition-colors disabled:opacity-40">
                            삭제
                        </button>
                    )}
                </div>

            <RotationGamesDialog
                open={d.open}
                onOpenChange={d.setOpen}
                session={s}
                pool={pool}
                isRoomSession={!!s.roomId}
                picker={picker}
                onSubmit={(games) => d.run(() => finalizeRotationSessionAction(s.id, games, nextGroupSeq(enteredGames)))}
                blockedReason={resultBlocked ? blockedNote(waitingNames) : undefined}
                poolAdmin={poolAdmin}
                enteredGames={enteredGames}
                isPending={d.isPending}
                error={d.error}
            />
        </MatchRow>
    )
}

/**
 * 저장이 막힌 이유 + 탈출구 안내 (0064). 누구를 기다리는지 이름으로 말해야 주최자가
 * '누구를 게스트로 대체할지' 판단할 수 있다.
 */
function blockedNote(waitingNames: string[]): string {
    const who = waitingNames.length > 0 ? ` (대기: ${waitingNames.join(' · ')})` : ''
    return `아직 응답하지 않은 참가자가 있어 결과를 저장할 수 없습니다${who}. `
        + '응답을 기다리거나, 위 참가자 편집에서 [게스트로 대체]로 명단에서 빼주세요.'
}
