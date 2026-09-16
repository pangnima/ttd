'use client'

import type { RotationPoolPlayer, RotationSessionSeat } from '@/types'
import type { PoolPlayer } from '@/lib/personal-matches/rotation'
import { PILL_BASE, TEXT_LINK } from '@/lib/dashboard/tokens'
import { RequestStatusBadge } from '@/components/personal-matches/request-status-badge'

/** 좌석 조작에 필요한 것만 — PoolAdmin에서 좁혀 받는다(순환 import 회피) */
export type SeatAdmin = {
    sessionId: string
    seats: RotationSessionSeat[]
    poolMemberIds: Set<string>
    ownerUserId: string
    canInvite: boolean
    isOwner: boolean
}

type RowProps = {
    row: PoolPlayer
    admin: SeatAdmin
    isPending: boolean
    onInvite: (userId: string) => void
    onRemove: (userId: string, name: string) => void
    /** 응답이 없는 회원을 명단에서 빼고 같은 이름의 게스트로 대체한다 (0064 무응답 탈출구) */
    onSwapToGuest: (seat: RotationSessionSeat, row: PoolPlayer) => void
}

/**
 * 풀 행 오른쪽 액션 — 판정 순서가 규칙이다.
 *  1. 비회원 → 없음 (로컬 그대로. allowlist를 통과하므로 서버 저장이 필요 없다)
 *  2. **주최자** → 배지만. players에도 좌석에도 없으므로(0057) 아래 분기에 맡기면
 *     "아직 초대 안 된 회원"으로 오분류돼 누르면 실패하는 [초대]가 뜬다.
 *  3. 명부에 있는 회원 → 좌석 배지 + (주최자면) 제외 / 미응답이면 게스트 대체
 *  4. 그 외 회원 → [초대]
 */
export function PoolRowSeatAction({ row, admin, isPending, onInvite, onRemove, onSwapToGuest }: RowProps) {
    const userId = row.player.userId
    if (!userId) return null

    if (userId === admin.ownerUserId) {
        return <span className={`${PILL_BASE} border border-border text-muted-foreground`}>주최자</span>
    }

    if (admin.poolMemberIds.has(userId)) {
        const seat = admin.seats.find((s) => s.userId === userId)
        return (
            <span className="flex items-center gap-2">
                {/* 명부에 있는 좌석은 pending·accepted뿐이다(거절·제외는 명부에서 빠진다) */}
                {(seat?.acceptance === 'pending' || seat?.acceptance === 'accepted') && (
                    <RequestStatusBadge status={seat.acceptance} />
                )}
                {admin.isOwner && seat?.acceptance === 'pending' && (
                    <button
                        type="button"
                        disabled={isPending}
                        onClick={() => onSwapToGuest(seat, row)}
                        className={`text-caption ${TEXT_LINK} disabled:opacity-40`}
                    >
                        게스트로 대체
                    </button>
                )}
                {admin.isOwner && (
                    <button
                        type="button"
                        disabled={isPending}
                        onClick={() => onRemove(userId, row.player.name)}
                        className="text-caption text-muted-foreground hover:text-foreground disabled:opacity-40"
                    >
                        참가자 제외
                    </button>
                )}
            </span>
        )
    }

    if (!admin.canInvite) return null
    return (
        <button
            type="button"
            disabled={isPending}
            onClick={() => onInvite(userId)}
            className={`text-caption ${TEXT_LINK} disabled:opacity-40`}
        >
            초대
        </button>
    )
}

type ReinviteProps = {
    seats: RotationSessionSeat[]
    canInvite: boolean
    isPending: boolean
    onReinvite: (seat: RotationSessionSeat) => void
    /** 거절한 사람을 기다리는 대신 게스트로 넣는다 — 서버 호출 없이 로컬 행만 만든다 */
    onAddAsGuest: (player: RotationPoolPlayer) => void
}

/**
 * 거절했거나 주최자가 뺀 사람 — 명부에 없어 풀 행이 없으므로 여기가 유일한 진입점이다(0059).
 *
 * 0064부터 [게스트로 넣기]가 함께 온다. 전원 수락 전에는 결과를 입력할 수 없게 됐으므로,
 * 거절한 사람을 그대로 두면 그날 경기를 영영 기록할 수 없다 — 게스트는 언제나 동의한 것으로 보므로
 * (0056) 경기는 기록되고 그 회원의 전적에는 남지 않는다.
 */
export function ReinvitableSeatsRow({ seats, canInvite, isPending, onReinvite, onAddAsGuest }: ReinviteProps) {
    if (seats.length === 0) return null
    return (
        <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-caption text-muted-foreground">다시 초대할 수 있는 사람:</span>
            {seats.map((seat) => (
                <span key={seat.userId} className="flex items-center gap-1.5">
                    <span className="text-caption text-foreground">{seat.name}</span>
                    {canInvite && (
                        <>
                            <button
                                type="button"
                                disabled={isPending}
                                onClick={() => onReinvite(seat)}
                                className={`text-caption ${TEXT_LINK} disabled:opacity-40`}
                            >
                                다시 초대
                            </button>
                            <button
                                type="button"
                                disabled={isPending}
                                onClick={() => onAddAsGuest(guestOf(seat))}
                                className="text-caption text-muted-foreground hover:text-foreground disabled:opacity-40"
                            >
                                게스트로 넣기
                            </button>
                        </>
                    )}
                </span>
            ))}
        </div>
    )
}

/**
 * 좌석 → 비회원 풀 행. `userId`를 **버리는 것이 요점**이다 — 그래야 finalize가 이 슬롯을 비회원으로
 * 보고 위조 방어 allowlist를 건너뛰며, 그 사람의 전적에도 기록이 생기지 않는다.
 * 손잡이·NTRP는 좌석의 users 조인 값(0058)을 물려주되, 없으면 사용자가 행에서 채운다.
 */
export function guestOf(seat: RotationSessionSeat): RotationPoolPlayer {
    return {
        name: seat.name,
        ...(seat.hand ? { hand: seat.hand } : {}),
        ...(seat.ntrp != null ? { ntrp: seat.ntrp } : {}),
    }
}
