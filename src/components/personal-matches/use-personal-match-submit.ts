'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createPersonalMatchesAction, updatePersonalMatchAction } from '@/lib/actions/personal-matches'
import { createMatchRequestAction } from '@/lib/actions/match-requests'
import { createRotationSessionAction } from '@/lib/actions/rotation-sessions'
import { compactPool, poolToPlayers } from '@/lib/personal-matches/rotation'
import { handOf, type PersonalMatchFormState } from '@/components/personal-matches/use-personal-match-form-state'

/**
 * 개인 경기 등록/수정 폼 제출 — 3갈래.
 *  ① 로테이션: 선수 풀만 세션으로 저장 (게임은 카드 '결과 입력'에서)
 *  ② 상호 확인 요청: 대표 확인자에게 요청 생성 (수락 시 양측 미확정 기록)
 *  ③ 자유 기록: 신규 INSERT 또는 수정 UPDATE (세트 없음 = 미확정)
 * 신규 등록 3갈래 모두 s.listing('리스트에 노출')을 넘기면 액션이 기록 저장 후 경기 리스트의 방을 만든다.
 */
export function usePersonalMatchSubmit(s: PersonalMatchFormState, initialId?: string) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)

    function run(action: () => Promise<{ error: string | null }>, next: string) {
        startTransition(async () => {
            const res = await action()
            if (res.error) setError(res.error)
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
            }, s.listing), '/me/personal-matches')
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
            }, s.listing), '/me/match-requests?tab=sent')
            return
        }

        const input = s.buildInput()
        run(
            () => (initialId ? updatePersonalMatchAction(initialId, input) : createPersonalMatchesAction([input], s.listing)),
            '/me/personal-matches',
        )
    }

    return { handleSubmit, isPending, error, cancel: () => router.back() }
}
