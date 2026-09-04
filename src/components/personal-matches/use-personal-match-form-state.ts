'use client'

import { useState } from 'react'
import type { PersonalMatch, MatchType, CourtSurface } from '@/types'
import type { OpponentCandidate } from '@/lib/queries/users'
import type { PersonalMatchInput, NtrpField } from '@/lib/personal-matches/validate-input'
import { isPlayerFilled } from '@/lib/personal-matches/validators'
import { isSlotEmpty, isSlotOk } from '@/lib/personal-matches/lineup'
import { isPlatformMember, resolveConfirmRep } from '@/lib/personal-matches/confirm-flow'
import type { RotationSessionMeta } from '@/lib/personal-matches/rotation'
import type { PlayerPickerValue } from '@/components/personal-matches/player-picker'
import { useRotationGames } from '@/components/personal-matches/use-rotation-games'
import type { DoublesMode } from '@/components/personal-matches/doubles-mode-toggle'
import { toHourValue } from '@/lib/format'
import { validateRoomPassword, type RoomListingInput } from '@/lib/match-rooms/password'
import type { RoomGameContext } from '@/lib/match-rooms/room-context'

const DOUBLES_TYPES: MatchType[] = ['men_doubles', 'women_doubles', 'mixed_doubles']
const SLOT_KEYS: NtrpField[] = ['partner', 'opponent', 'opponent2']

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
    // 방 게임 추가(0048) — 메타를 방 값으로 고정하고 자유 기록으로만 저장한다
    roomContext?: RoomGameContext
}

/**
 * 개인 경기 등록/수정 폼의 state 묶음 + 파생값(isDoubles/isRotation/확인 요청 대표/유효성/페이로드).
 * 렌더와 제출은 personal-match-form.tsx / use-personal-match-submit.ts가 담당한다.
 */
export function usePersonalMatchFormState({ initialData, opponentCandidates, selfUserId, roomContext }: Args) {
    const d = initialData
    const ctx = roomContext
    const opponent = usePlayerSlot(d?.opponentUserId, d?.opponentName, d?.opponentDominantHand, d?.opponentNtrp)
    const partner = usePlayerSlot(d?.partnerUserId, d?.partnerName, d?.partnerDominantHand, d?.partnerNtrp)
    const opponent2 = usePlayerSlot(d?.opponent2UserId, d?.opponent2Name, d?.opponent2DominantHand, d?.opponent2Ntrp)
    const slots: Record<NtrpField, PlayerSlot> = { opponent, partner, opponent2 }
    // 메타 — 방 게임이면 방 값으로 시작하고 화면에서 바꿀 수 없다(WhenColumn이 요약 카드로 대체)
    const [playedAt, setPlayedAt] = useState(ctx?.playedAt ?? d?.playedAt ?? new Date().toISOString().slice(0, 10))
    // 시각은 시 단위만 — 시 단위 도입 이전 'HH:30' 기록은 편집 진입 시 시로 절삭해 select와 맞추고, 저장하면 정규화된다
    const [playedTime, setPlayedTime] = useState(toHourValue(ctx?.playedTime ?? d?.playedTime ?? ''))
    const [matchType, setMatchType] = useState<MatchType>(ctx?.matchType ?? d?.matchType ?? 'singles')
    const [surface, setSurface] = useState<CourtSurface | ''>(ctx?.surface ?? d?.surface ?? '')
    const [courtName, setCourtName] = useState(ctx?.courtName ?? d?.courtName ?? '')
    const [notes, setNotes] = useState(ctx?.notes ?? d?.notes ?? '')
    // 복식 입력 방식 — 로테이션(기본, 선수 풀만 등록) vs 페어 고정. 로테이션은 신규 등록에서만 지원(수정·방 게임은 페어 고정).
    const [doublesMode, setDoublesMode] = useState<DoublesMode>(ctx ? 'fixed' : 'rotation')
    const rotation = useRotationGames()
    // 경기 리스트 노출 — 신규 등록에서만. 켜면 비밀번호(4~20자) 필수. 기록 저장 후 액션이 create_match_room RPC로 방을 만든다.
    const [listed, setListedState] = useState(false)
    const [roomPassword, setRoomPassword] = useState('')

    const isEdit = !!initialData
    const isRoomGame = !!ctx
    const isDoubles = DOUBLES_TYPES.includes(matchType)
    const isRotation = isDoubles && doublesMode === 'rotation' && !isEdit && !isRoomGame

    // 모집형(리스트에 노출)은 참가자를 비운 채 저장할 수 있다.
    // 수정 모드는 이미 리스트에 올라간 기록이면서 결과가 없을 때만 — 결과가 있으면 라인업을 비울 수 없다.
    const allowEmptyPlayers = (!isEdit && listed) || (isEdit && !!d?.roomId && (d?.setScores.length ?? 0) === 0)

    // 모집형에서 화면에 펼쳐진 슬롯(0048) — 빈 슬롯은 미리 그리지 않고 '참가자 추가'로만 연다.
    // 열린 슬롯은 완전 입력(이름·손잡이·NTRP)이 필수이고, 닫힌 슬롯만 '모집 중'으로 비워 둘 수 있다.
    const filledKeys = () => SLOT_KEYS.filter((k) => !isSlotEmpty(slots[k].player))
    const [openSlots, setOpenSlots] = useState<NtrpField[]>(() => (allowEmptyPlayers ? filledKeys() : []))

    function setListed(v: boolean) {
        setListedState(v)
        if (v) {
            // 노출로 전환: 입력되지 않은 슬롯·풀 행은 전부 제거
            setOpenSlots(filledKeys())
            rotation.compactEmptyRows()
        } else {
            rotation.ensureMinRows(3)
        }
    }
    function openSlot(key: NtrpField) {
        setOpenSlots((prev) => (prev.includes(key) ? prev : [...prev, key]))
    }
    function closeSlot(key: NtrpField) {
        slots[key].setPlayer({ name: '', hand: '' })
        slots[key].setNtrp('')
        setOpenSlots((prev) => prev.filter((k) => k !== key))
    }

    // 라인업이 다 찼을 때만 상호 확인 요청 — 빈 슬롯이 있으면 요청 RPC가 거부하므로 자유 기록으로 저장한다
    const allFilled = isPlayerFilled(opponent.player)
        && (!isDoubles || (isPlayerFilled(partner.player) && isPlayerFilled(opponent2.player)))

    // 상호 확인 요청 대표 — 신규 등록 + 페어 고정/단식 + 상대팀에 플랫폼 회원(비게스트)이 있을 때.
    // 게스트·직접 입력·로테이션·수정 모드·모집 중(빈 슬롯)·방 게임(방장 기록만)은 자유 기록으로 저장한다.
    const rep = !isEdit && !isRotation && !isRoomGame && selfUserId && allFilled
        ? resolveConfirmRep(
            { userId: opponent.player.userId, slot: opponent },
            { userId: opponent2.player.userId, slot: opponent2 },
            opponentCandidates, isDoubles,
        )
        : null
    const isConfirmFlow = !!rep
    // 확인 플로우에서 회원 참가자의 NTRP는 수락 시 서버가 파생하므로 입력란을 숨긴다
    const hideNtrpFor: NtrpField[] = isConfirmFlow
        ? SLOT_KEYS.filter((k) => isPlatformMember(slots[k].player, opponentCandidates))
        : []
    // 슬롯 1개 판정 — 모집형이면 닫힌(비운) 슬롯만 통과, 열린 슬롯은 선수 입력 + NTRP 필수(확인 플로우 회원은 면제)
    const slotOk = (key: NtrpField, s: PlayerSlot) =>
        isSlotOk(s.player, s.ntrp, allowEmptyPlayers && !openSlots.includes(key), hideNtrpFor.includes(key))

    const meta: RotationSessionMeta = { playedAt, playedTime, matchType, surface, notes, courtName }
    const metaOk = !!playedAt && !!playedTime && !!surface
    // 파트너 NTRP도 상대와 동일하게 필수 (회원 파트너는 확인 플로우에서 hideNtrpFor로 면제)
    const fixedValid =
        slotOk('opponent', opponent) &&
        (!isDoubles || (slotOk('partner', partner) && slotOk('opponent2', opponent2))) && metaOk
    const listingOk = isEdit || !listed || validateRoomPassword(roomPassword) === null
    const isValid = (isRotation ? rotation.isPoolValid(meta, { allowEmpty: allowEmptyPlayers }) : fixedValid) && listingOk
    const listing: RoomListingInput | undefined = listed && !isEdit ? { password: roomPassword } : undefined

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
            courtName: courtName.trim() || undefined,
        }
    }

    return {
        opponent, partner, opponent2, slots,
        playedAt, setPlayedAt, playedTime, setPlayedTime, matchType, setMatchType, surface, setSurface, notes, setNotes,
        courtName, setCourtName,
        doublesMode, setDoublesMode, rotation,
        listed, setListed, roomPassword, setRoomPassword, listing, allowEmptyPlayers,
        openSlots, openSlot, closeSlot,
        roomContext: ctx, isRoomGame,
        isEdit, isDoubles, isRotation, rep, isConfirmFlow, hideNtrpFor, isValid, meta, buildInput,
    }
}

export type PersonalMatchFormState = ReturnType<typeof usePersonalMatchFormState>
