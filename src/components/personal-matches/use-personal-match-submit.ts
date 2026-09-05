'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createPersonalMatchesAction, updatePersonalMatchAction } from '@/lib/actions/personal-matches'
import { createMatchRequestAction } from '@/lib/actions/match-requests'
import { createRoomGameAction } from '@/lib/actions/match-rooms'
import { createRotationSessionAction } from '@/lib/actions/rotation-sessions'
import { compactPool, poolToPlayers } from '@/lib/personal-matches/rotation'
import { handOf, type PersonalMatchFormState } from '@/components/personal-matches/use-personal-match-form-state'

/**
 * 개인 경기 등록/수정 폼 제출 — 4갈래.
 *  ① 로테이션: 선수 풀만 세션으로 저장 (게임은 카드 '결과 입력'에서)
 *  ② 방 게임(0049): 방 참가자끼리의 게임 — 수락 없이 참가자 전원 기록 생성, 결과는 제안·확인으로 확정
 *  ③ 상호 확인 요청: 대표 확인자에게 요청 생성 (수락 시 양측 미확정 기록)
 *  ④ 자유 기록: 신규 INSERT 또는 수정 UPDATE (세트 없음 = 미확정)
 * 신규 등록은 s.listing('리스트에 노출')을 넘기면 액션이 기록 저장 후 매칭 리스트의 방을 만든다.
 *
 * 저장 후 목적지: 폼은 세트를 받지 않아 **신규 저장물은 전부 미확정**이므로 확인 요청 허브로 보낸다
 * (개인 경기 결과로 보내면 방금 저장한 기록이 없는 화면에 도착한다). 방 게임만 방 상세로 돌아간다.
 */
export type SubmitNavigation = {
    /** 저장 성공 후 — 다이얼로그를 닫고 새로고침한다. 주면 router.push(next)를 하지 않는다 */
    onDone?: () => void
    onCancel?: () => void
}

export function usePersonalMatchSubmit(s: PersonalMatchFormState, initialId?: string, nav?: SubmitNavigation) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)

    function run(action: () => Promise<{ error: string | null }>, next: string) {
        startTransition(async () => {
            const res = await action()
            if (res.error) setError(res.error)
            else if (nav?.onDone) nav.onDone()
            else router.push(next)
        })
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)
        if (!s.isValid) {
            setError('필수 항목을 모두 정확히 입력해주세요.')
            return
        }

        if (s.isRotation && s.surface) {
            const { playedAt, playedTime, matchType, surface, notes, courtName } = s
            run(() => createRotationSessionAction({
                playedAt, playedTime, matchType, surface, notes: notes || undefined,
                courtName: courtName.trim() || undefined,
                // 빈 행은 제거하고 보낸다 (모집형은 0명도 허용)
                players: poolToPlayers(compactPool(s.rotation.pool)),
            }, s.listing), '/me/match-requests')
            return
        }

        // 방 게임(0049) — 회원 상대면 상호 확인 게임으로 등록해 참가자 전원 기록에 남긴다.
        // 방 입장이 곧 참여 동의라 수락 단계 없이 바로 양측 기록이 생기고, 결과는 카드에서 제안·확인한다.
        if (s.rep && s.roomId) {
            const num = (v: string) => (v.trim() ? Number(v) : undefined)
            // 대표가 상대2 칸에 있었다면 슬롯이 스왑돼 있다 — 상대2로 보낼 쪽은 나머지 한 명
            const other = s.rep.opponent2.slot
            const roomId = s.roomId
            run(() => createRoomGameAction({
                roomId,
                opponentUserId: s.rep!.repUserId,
                partner: s.isDoubles ? {
                    name: s.partner.player.name.trim(),
                    userId: s.partner.player.userId,
                    dominantHand: handOf(s.partner.player),
                    ntrp: num(s.partner.ntrp),
                } : undefined,
                opponent2: s.isDoubles ? {
                    name: other.player.name.trim(),
                    userId: other.player.userId,
                    dominantHand: handOf(other.player),
                    ntrp: num(other.ntrp),
                } : undefined,
                replaceMatchId: s.replaceMatchId,
            }), `/match-rooms/${roomId}`)
            return
        }

        // 방 게임의 상대가 비회원이면 자유 기록이 되는데, 그 행은 방장만 만들 수 있다(RLS)
        if (s.roomId && !s.rep && !s.viewerIsHost) {
            setError('방 게임의 상대는 방에 참가한 회원 중에서 선택해주세요.')
            return
        }

        if (s.rep && s.surface) {
            // 대표가 상대2 칸에 있었다면 슬롯을 스왑해 opponent = 대표로 보낸다
            const rep = s.rep.opponent.slot
            const other = s.rep.opponent2.slot
            const num = (v: string) => (v.trim() ? Number(v) : undefined)
            const { playedAt, playedTime, matchType, surface, notes, courtName } = s
            run(() => createMatchRequestAction({
                matchType,
                opponentUserId: s.rep!.repUserId,
                opponentName: rep.player.name.trim(),
                opponentDominantHand: handOf(rep.player),
                partnerName: s.isDoubles ? s.partner.player.name.trim() || undefined : undefined,
                partnerUserId: s.isDoubles ? s.partner.player.userId : undefined,
                partnerDominantHand: s.isDoubles ? handOf(s.partner.player) : undefined,
                partnerNtrp: s.isDoubles ? num(s.partner.ntrp) : undefined,
                opponent2Name: s.isDoubles ? other.player.name.trim() || undefined : undefined,
                opponent2UserId: s.isDoubles ? other.player.userId : undefined,
                opponent2DominantHand: s.isDoubles ? handOf(other.player) : undefined,
                opponent2Ntrp: s.isDoubles ? num(other.ntrp) : undefined,
                playedAt, playedTime, surface, notes: notes || undefined,
                courtName: courtName.trim() || undefined,
            }, s.listing), '/me/match-requests?tab=waiting')
            return
        }

        const input = s.buildInput()
        // 방 게임(0048)은 room_id를 붙여 저장하고 방 상세로 돌아간다 (신규 등록만 — 수정은 room_id를 옮기지 않는다)
        const newRoomId = s.roomContext?.roomId
        run(
            () => (initialId
                ? updatePersonalMatchAction(initialId, input)
                : createPersonalMatchesAction([input], s.listing, newRoomId ? { roomId: newRoomId } : undefined)),
            // 폼은 세트를 받지 않는다 — 신규는 언제나 미확정이므로 허브로 보내야 방금 저장한 기록이 보인다.
            // 수정은 원래 결과가 있었으면 확정 목록으로 돌아간다.
            s.roomId
                ? `/match-rooms/${s.roomId}`
                : initialId && s.initialHasResult
                    ? '/me/personal-matches'
                    : '/me/match-requests',
        )
    }

    // 다이얼로그에서 취소가 router.back()으로 룸을 떠나는 사고를 막는다
    return { handleSubmit, isPending, error, cancel: nav?.onCancel ?? (() => router.back()) }
}
