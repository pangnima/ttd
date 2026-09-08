'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { RotationPoolPlayer, RotationSessionSeat } from '@/types'
import type { OpponentCandidate } from '@/lib/queries/users'
import type { PastOpponent } from '@/lib/queries/personal-matches'
import type { PoolPlayer } from '@/lib/personal-matches/rotation'
import { reinvitableSeats } from '@/lib/personal-matches/rotation-participation'
import { addRotationSessionPlayerAction, removeRotationSessionPlayerAction } from '@/lib/actions/rotation-sessions'
import { PlayerPoolSection } from '@/components/personal-matches/rotation/player-pool-section'
import {
    PoolRowSeatAction, ReinvitableSeatsRow, guestOf,
} from '@/components/personal-matches/rotation/pool-seat-actions'

export type PoolPickerProps = {
    candidates: OpponentCandidate[]
    pastOpponents: PastOpponent[]
    selfUserId?: string
}

/**
 * 세션 명부를 실제로 바꿀 수 있는 화면일 때만 주어진다(방 밖 세션 + 소유자/수락자, 0058).
 * 없으면 이 블록은 종전처럼 순수 로컬 편집기다 — 등록 폼과 방 세션 빌더가 그 경우다.
 */
export type PoolAdmin = {
    sessionId: string
    seats: RotationSessionSeat[]
    /** 서버 명부(rotation_sessions.players)에 있는 회원 id — 로컬 행과 가르는 기준 */
    poolMemberIds: Set<string>
    /** 세션을 만든 사람 — players에도 좌석에도 없으므로(0057) 따로 알아야 한다 */
    ownerUserId: string
    canInvite: boolean
    isOwner: boolean
    /** 재초대·게스트 대체한 사람을 그 자리에서 게임에 넣을 수 있도록 로컬 행에 채워 넣는다 */
    onLocalAdd: (player: RotationPoolPlayer) => void
}

type Props = {
    pool: PoolPlayer[]
    picker: PoolPickerProps
    onAdd: () => void
    onUpdate: (tempId: string, patch: Partial<Omit<PoolPlayer, 'tempId'>>) => void
    onRemove: (tempId: string) => void
    poolAdmin?: PoolAdmin
}

/**
 * 결과 입력 팝업의 참가자 편집 블록.
 *
 * 종전에는 여기서 고른 **회원**이 세션 명부에 저장되지 않아, 저장 단계에서 위조 방어 allowlist에
 * 걸려 `participant_not_in_room`으로 실패했다(비회원만 통과했다). 0058부터 방 밖 세션에서는
 * [초대] 버튼이 명부에 실제로 추가하고, 그 순간 상대에게 참여 요청이 간다.
 *
 * 0064부터 **전원이 응답해야 결과를 입력할 수 있다**. 그래서 이 블록은 무응답의 탈출구를 겸한다 —
 * 응답 없는 회원을 [게스트로 대체]하면 그 사람은 명단에서 빠지고 같은 이름의 비회원 행이 남아,
 * 경기는 기록되고 그분 전적에는 남지 않는다. 이 경로가 없으면 한 명이 앱을 안 켜는 것만으로
 * 그날 경기 전체가 영영 기록 불가가 된다(알림·리마인더·만료가 아직 없다).
 */
export function PoolEditorBlock({ pool, picker, onAdd, onUpdate, onRemove, poolAdmin }: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)

    function run(action: () => Promise<{ error: string | null }>, after?: () => void) {
        startTransition(async () => {
            setError(null)
            const res = await action()
            if (res.error) { setError(res.error); return }
            after?.()
            router.refresh()
        })
    }

    const reinvitable = poolAdmin ? reinvitableSeats(poolAdmin.seats) : []

    /**
     * 미응답 회원 → 게스트. 순서가 중요하다: 명부에서 뺀 **뒤** 로컬 행을 갈아끼운다.
     * 로컬 회원 행을 남겨 두면 그 userId가 allowlist에서 빠져(명부에서 제거됐다)
     * 저장 시 `participant_not_in_room`으로 실패한다.
     */
    function swapToGuest(seat: RotationSessionSeat, row: PoolPlayer) {
        if (!poolAdmin) return
        if (!confirm(
            `${seat.name || '이 참가자'}님이 아직 응답하지 않았습니다. 명단에서 빼고 게스트로 기록할까요?\n\n`
            + '경기는 그대로 저장되지만, 그분의 전적에는 남지 않습니다.',
        )) return
        run(
            () => removeRotationSessionPlayerAction(poolAdmin.sessionId, seat.userId),
            () => { onRemove(row.tempId); poolAdmin.onLocalAdd(guestOf(seat)) },
        )
    }

    return (
        <details className="rounded-lg border border-border px-3 py-2" open={pool.length === 0}>
            <summary className="text-body2 font-medium cursor-pointer">참가자 추가·편집</summary>
            <p className="mt-2 text-caption text-muted-foreground break-keep">
                {poolAdmin
                    ? '회원을 고르고 [초대]를 누르면 참가자로 등록되고 그분 화면에 참여 요청이 갑니다. 초대한 회원이 모두 응답해야 결과를 입력할 수 있고, 응답이 없으면 [게스트로 대체]로 명단에서 뺄 수 있습니다. 비회원은 이 게임 구성에만 쓰입니다.'
                    : '여기서 추가한 선수는 이 게임 구성에만 쓰이고 방 참가자·초대에는 반영되지 않습니다. 회원은 방 상세에서 비밀번호로 입장하면 자동으로 참가자 풀에 추가됩니다.'}
            </p>

            {poolAdmin && (
                <ReinvitableSeatsRow
                    seats={reinvitable}
                    canInvite={poolAdmin.canInvite}
                    isPending={isPending}
                    onReinvite={(seat) => run(
                        () => addRotationSessionPlayerAction(poolAdmin.sessionId, seat.userId),
                        // 재초대한 사람은 로컬 풀에 없다 — refresh는 명부만 갱신하므로
                        // 그 자리에서 게임에 넣으려면 행을 직접 채워야 한다
                        () => poolAdmin.onLocalAdd({ userId: seat.userId, ...guestOf(seat) }),
                    )}
                    onAddAsGuest={poolAdmin.onLocalAdd}
                />
            )}

            {error && <p className="mt-2 text-caption text-destructive break-keep">{error}</p>}

            <div className="mt-3">
                <PlayerPoolSection
                    pool={pool}
                    candidates={picker.candidates}
                    pastOpponents={picker.pastOpponents}
                    onAdd={onAdd}
                    onUpdate={onUpdate}
                    onRemove={onRemove}
                    searchSelfUserId={picker.selfUserId}
                    renderRowAction={poolAdmin
                        ? (row) => (
                            <PoolRowSeatAction
                                row={row}
                                admin={poolAdmin}
                                isPending={isPending}
                                onInvite={(userId) => run(
                                    () => addRotationSessionPlayerAction(poolAdmin.sessionId, userId),
                                )}
                                onRemove={(userId, name) => {
                                    // 제외하면 좌석이 사라져 그 사람 화면에서 이 일정이 보이지 않게 된다(기록은 남는다)
                                    if (!confirm(`${name || '이 참가자'}님을 참가자 명단에서 뺄까요? 이미 저장된 게임 기록은 그대로 남지만, 이 일정은 더 이상 그분 화면에 보이지 않습니다.`)) return
                                    run(() => removeRotationSessionPlayerAction(poolAdmin.sessionId, userId))
                                }}
                                onSwapToGuest={swapToGuest}
                            />
                        )
                        : undefined}
                    // 명부에 있는 회원(과 주최자)은 로컬로 지울 수 없다 — 취소 수단을 [참가자 제외] 하나로
                    // 좁히지 않으면, 로컬 [삭제]로 행만 사라지고 초대는 남아 다시 초대할 길이 막힌다(0059)
                    rowRemovable={poolAdmin
                        ? (p) => !p.player.userId
                            || (p.player.userId !== poolAdmin.ownerUserId && !poolAdmin.poolMemberIds.has(p.player.userId))
                        : undefined}
                />
            </div>
        </details>
    )
}
