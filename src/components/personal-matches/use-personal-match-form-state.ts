'use client'

import { useState } from 'react'
import type { PersonalMatch, MatchType, CourtSurface } from '@/types'
import type { OpponentCandidate } from '@/lib/queries/users'
import type { PersonalMatchInput, NtrpField } from '@/lib/personal-matches/validate-input'
import { isNtrpValid, isPlayerFilled } from '@/lib/personal-matches/validators'
import { isPlatformMember, resolveConfirmRep } from '@/lib/personal-matches/confirm-flow'
import type { RotationSessionMeta } from '@/lib/personal-matches/rotation'
import type { PlayerPickerValue } from '@/components/personal-matches/player-picker'
import { useRotationGames } from '@/components/personal-matches/use-rotation-games'
import type { DoublesMode } from '@/components/personal-matches/doubles-mode-toggle'

const DOUBLES_TYPES: MatchType[] = ['men_doubles', 'women_doubles', 'mixed_doubles']

// 선수 슬롯 상태 — 선택값 + NTRP 문자열('' = 미입력) + 세터
export type PlayerSlot = {
    player: PlayerPickerValue
    setPlayer: (v: PlayerPickerValue) => void
    ntrp: string
    setNtrp: (v: string) => void
}

// 손잡이는 회원·비회원 모두 저장한다 (회원 선택 시 프로필 값이 자동 채워지고, 이후 편집 가능)
export function handOf(p: PlayerPickerValue): 'right' | 'left' | undefined {
    return p.hand || undefined
}

function usePlayerSlot(userId?: string, name?: string, hand?: 'right' | 'left', ntrp?: number): PlayerSlot {
    const [player, setPlayer] = useState<PlayerPickerValue>({ userId, name: name ?? '', hand: hand ?? '' })
    const [ntrpStr, setNtrp] = useState(ntrp != null ? String(ntrp) : '')
    return { player, setPlayer, ntrp: ntrpStr, setNtrp }
}

type Args = {
    initialData?: PersonalMatch
    opponentCandidates: OpponentCandidate[]
    selfUserId?: string
}

/**
 * 개인 경기 등록/수정 폼의 state 묶음 + 파생값(isDoubles/isRotation/확인 요청 대표/유효성/페이로드).
 * 렌더와 제출은 personal-match-form.tsx / use-personal-match-submit.ts가 담당한다.
 */
export function usePersonalMatchFormState({ initialData, opponentCandidates, selfUserId }: Args) {
    const d = initialData
    const opponent = usePlayerSlot(d?.opponentUserId, d?.opponentName, d?.opponentDominantHand, d?.opponentNtrp)
    const partner = usePlayerSlot(d?.partnerUserId, d?.partnerName, d?.partnerDominantHand, d?.partnerNtrp)
    const opponent2 = usePlayerSlot(d?.opponent2UserId, d?.opponent2Name, d?.opponent2DominantHand, d?.opponent2Ntrp)
    const [playedAt, setPlayedAt] = useState(d?.playedAt ?? new Date().toISOString().slice(0, 10))
    const [playedTime, setPlayedTime] = useState(d?.playedTime ?? '')
    const [matchType, setMatchType] = useState<MatchType>(d?.matchType ?? 'singles')
    const [surface, setSurface] = useState<CourtSurface | ''>(d?.surface ?? '')
    const [notes, setNotes] = useState(d?.notes ?? '')
    // 복식 입력 방식 — 페어 고정(기본) vs 로테이션(선수 풀만 등록). 로테이션은 신규 등록에서만 지원.
    const [doublesMode, setDoublesMode] = useState<DoublesMode>('fixed')
    const rotation = useRotationGames()

    const isEdit = !!initialData
    const isDoubles = DOUBLES_TYPES.includes(matchType)
    const isRotation = isDoubles && doublesMode === 'rotation' && !isEdit

    // 상호 확인 요청 대표 — 신규 등록 + 페어 고정/단식 + 상대팀에 플랫폼 회원(비게스트)이 있을 때.
    // 게스트·직접 입력·로테이션·수정 모드는 자유 기록으로 저장한다.
    const rep = !isEdit && !isRotation && selfUserId
        ? resolveConfirmRep(
            { userId: opponent.player.userId, slot: opponent },
            { userId: opponent2.player.userId, slot: opponent2 },
            opponentCandidates, isDoubles,
        )
        : null
    const isConfirmFlow = !!rep
    // 확인 플로우에서 회원 참가자의 NTRP는 수락 시 서버가 파생하므로 입력란을 숨긴다
    const hideNtrpFor: NtrpField[] = isConfirmFlow
        ? (
            [['opponent', opponent], ['partner', partner], ['opponent2', opponent2]] as const
        ).filter(([, s]) => isPlatformMember(s.player, opponentCandidates)).map(([k]) => k)
        : []
    const ntrpOk = (key: NtrpField, s: PlayerSlot, required: boolean) =>
        hideNtrpFor.includes(key) || (required ? isNtrpValid(s.ntrp) : s.ntrp.trim() === '' || isNtrpValid(s.ntrp))

    const meta: RotationSessionMeta = { playedAt, playedTime, matchType, surface, notes }
    const metaOk = !!playedAt && !!playedTime && !!surface
    const fixedValid =
        isPlayerFilled(opponent.player) && ntrpOk('opponent', opponent, true) &&
        (!isDoubles || (
            isPlayerFilled(partner.player) && ntrpOk('partner', partner, false) &&
            isPlayerFilled(opponent2.player) && ntrpOk('opponent2', opponent2, true)
        )) && metaOk
    const isValid = isRotation ? rotation.isPoolValid(meta) : fixedValid

    const num = (s: string) => (s.trim() ? Number(s) : undefined)
    // 자유 기록 페이로드. 세트는 신규면 빈 배열(미확정), 수정이면 기존 세트를 그대로 보존한다.
    function buildInput(): PersonalMatchInput {
        return {
            opponentName: opponent.player.name.trim(),
            opponentUserId: opponent.player.userId,
            opponentDominantHand: handOf(opponent.player),
            opponentNtrp: num(opponent.ntrp),
            // 복식 전용 필드 (단식이면 액션에서 NULL 처리)
            partnerName: partner.player.name.trim() || undefined,
            partnerUserId: partner.player.userId,
            partnerDominantHand: handOf(partner.player),
            partnerNtrp: isDoubles ? num(partner.ntrp) : undefined,
            opponent2Name: opponent2.player.name.trim() || undefined,
            opponent2UserId: opponent2.player.userId,
            opponent2DominantHand: handOf(opponent2.player),
            opponent2Ntrp: isDoubles ? num(opponent2.ntrp) : undefined,
            playedAt, playedTime: playedTime || undefined, matchType, surface: surface || undefined,
            setScores: d?.setScores ?? [],
            notes: notes || undefined,
        }
    }

    return {
        opponent, partner, opponent2,
        playedAt, setPlayedAt, playedTime, setPlayedTime, matchType, setMatchType, surface, setSurface, notes, setNotes,
        doublesMode, setDoublesMode, rotation,
        isEdit, isDoubles, isRotation, rep, isConfirmFlow, hideNtrpFor, isValid, meta, buildInput,
    }
}

export type PersonalMatchFormState = ReturnType<typeof usePersonalMatchFormState>
