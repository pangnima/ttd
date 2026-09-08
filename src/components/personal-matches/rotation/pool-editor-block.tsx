'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { RotationPoolPlayer, RotationSessionSeat } from '@/types'
import type { OpponentCandidate } from '@/lib/queries/users'
import type { PastOpponent } from '@/lib/queries/personal-matches'
import type { PoolPlayer } from '@/lib/personal-matches/rotation'
import { PILL_BASE } from '@/lib/dashboard/tokens'
import { reinvitableSeats } from '@/lib/personal-matches/rotation-participation'
import { addRotationSessionPlayerAction, removeRotationSessionPlayerAction } from '@/lib/actions/rotation-sessions'
import { RequestStatusBadge } from '@/components/match-requests/request-status-badge'
import { PlayerPoolSection } from '@/components/personal-matches/rotation/player-pool-section'

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
    /** 재초대한 사람을 그 자리에서 게임에 넣을 수 있도록 로컬 행에 채워 넣는다 */
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
 * 거절했던 사람도 다시 초대하면 좌석이 '수락 대기'로 돌아온다.
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

    // 거절했거나 주최자가 뺀 사람 — 명부에 없어 풀 행이 없으므로 여기가 유일한 재초대 진입점이다(0059)
    const reinvitable = poolAdmin ? reinvitableSeats(poolAdmin.seats) : []

    /**
     * 행 오른쪽 액션 — 판정 순서가 규칙이다.
     *  1. 비회원 → 없음 (로컬 그대로. allowlist를 통과하므로 서버 저장이 필요 없다)
     *  2. **주최자** → 배지만. players에도 좌석에도 없으므로(0057) 아래 분기에 맡기면
     *     "아직 초대 안 된 회원"으로 오분류돼 누르면 invalid_player가 나는 [초대]가 뜬다.
     *     참가자가 팝업을 열면 빌더 풀에 주최자가 섞여 들어온다(match-requests/page.tsx의 owner 주입).
     *  3. 명부에 있는 회원 → 좌석 배지 + (주최자면) 제외
     *  4. 그 외 회원 → [초대]
     */
    function rowAction(p: PoolPlayer) {
        const userId = p.player.userId
        if (!poolAdmin || !userId) return null

        if (userId === poolAdmin.ownerUserId) {
            return <span className={`${PILL_BASE} border border-border text-muted-foreground`}>주최자</span>
        }

        if (poolAdmin.poolMemberIds.has(userId)) {
            const seat = poolAdmin.seats.find((s) => s.userId === userId)
            return (
                <span className="flex items-center gap-2">
                    {/* 명부에 있는 좌석은 pending·accepted뿐이다(거절·제외는 명부에서 빠진다) */}
                    {(seat?.acceptance === 'pending' || seat?.acceptance === 'accepted') && (
                        <RequestStatusBadge status={seat.acceptance} />
                    )}
                    {poolAdmin.isOwner && (
                        <button
                            type="button"
                            disabled={isPending}
                            onClick={() => {
                                // 제외하면 좌석이 사라져 그 사람 화면에서 이 일정이 보이지 않게 된다(기록은 남는다)
                                if (!confirm(`${p.player.name || '이 참가자'}님을 참가자 명단에서 뺄까요? 이미 저장된 게임 기록은 그대로 남지만, 이 일정은 더 이상 그분 화면에 보이지 않습니다.`)) return
                                run(() => removeRotationSessionPlayerAction(poolAdmin.sessionId, userId))
                            }}
                            className="text-caption text-muted-foreground hover:text-foreground disabled:opacity-40"
                        >
                            참가자 제외
                        </button>
                    )}
                </span>
            )
        }

        if (!poolAdmin.canInvite) return null
        return (
            <button
                type="button"
                disabled={isPending}
                onClick={() => run(() => addRotationSessionPlayerAction(poolAdmin.sessionId, userId))}
                className="text-caption text-primary hover:underline disabled:opacity-40"
            >
                초대
            </button>
        )
    }

    return (
        <details className="rounded-lg border border-border px-3 py-2" open={pool.length === 0}>
            <summary className="text-body2 font-medium cursor-pointer">참가자 추가·편집</summary>
            <p className="mt-2 text-caption text-muted-foreground break-keep">
                {poolAdmin
                    ? '회원을 고르고 [초대]를 누르면 참가자로 등록되고 그분 화면에 참여 요청이 갑니다. 아직 수락하지 않은 참가자도 게임에 넣을 수 있고, 그 게임은 수락한 뒤 기록됩니다. 비회원은 이 게임 구성에만 쓰입니다.'
                    : '여기서 추가한 선수는 이 게임 구성에만 쓰이고 방 참가자·초대에는 반영되지 않습니다. 회원은 방 상세에서 비밀번호로 입장하면 자동으로 참가자 풀에 추가됩니다.'}
            </p>

            {reinvitable.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-caption text-muted-foreground">다시 초대할 수 있는 사람:</span>
                    {reinvitable.map((seat) => (
                        <span key={seat.userId} className="flex items-center gap-1.5">
                            <span className="text-caption text-foreground">{seat.name}</span>
                            {poolAdmin?.canInvite && (
                                <button
                                    type="button"
                                    disabled={isPending}
                                    onClick={() => run(
                                        () => addRotationSessionPlayerAction(poolAdmin.sessionId, seat.userId),
                                        // 재초대한 사람은 로컬 풀에 없다 — refresh는 명부만 갱신하므로
                                        // 그 자리에서 게임에 넣으려면 행을 직접 채워야 한다
                                        () => poolAdmin.onLocalAdd({
                                            userId: seat.userId,
                                            name: seat.name,
                                            ...(seat.hand ? { hand: seat.hand } : {}),
                                            ...(seat.ntrp != null ? { ntrp: seat.ntrp } : {}),
                                        }),
                                    )}
                                    className="text-caption text-primary hover:underline disabled:opacity-40"
                                >
                                    다시 초대
                                </button>
                            )}
                        </span>
                    ))}
                </div>
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
                    renderRowAction={poolAdmin ? rowAction : undefined}
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
