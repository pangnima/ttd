import type { PersonalMatchSetScore, MatchType, CourtSurface } from '@/types'
import type { PlayerPickerValue } from '@/components/personal-matches/player-picker'
import type { PersonalMatchInput } from '@/lib/actions/personal-matches'
import { isNtrpValid, isPlayerFilled, isSetValid } from './validators'

/**
 * 로테이션(아메리칸) 복식: 4명 이상이 파트너를 바꿔가며 여러 게임을 치는 경기.
 * 각 게임은 파트너·상대 구성이 달라 독립된 경기이므로 게임마다 별도 레코드로 저장한다.
 * 선수는 풀(PoolPlayer)에 한 번만 등록하고, 게임은 풀 항목을 tempId로 참조한다.
 */

export type PoolPlayer = {
    tempId: string
    player: PlayerPickerValue
    ntrp: string // number input 문자열 보관('' = 미입력)
}

export type RotationGame = {
    tempId: string
    partnerRef: string | null // 내 파트너 (pool[].tempId)
    opp1Ref: string | null
    opp2Ref: string | null
    sets: PersonalMatchSetScore[]
}

// 세션 공통 메타 — 모든 게임에 동일 적용 (선수·세트 제외)
export type RotationSessionMeta = {
    playedAt: string
    playedTime: string
    matchType: MatchType
    surface: CourtSurface | ''
    notes: string
}

function poolById(pool: PoolPlayer[], ref: string | null): PoolPlayer | undefined {
    return ref ? pool.find((p) => p.tempId === ref) : undefined
}

// 손잡이는 회원 미선택(직접 입력)일 때만 저장 (기존 buildBaseInput 규칙과 동일)
function handOf(p: PlayerPickerValue): 'right' | 'left' | undefined {
    return !p.userId && (p.hand === 'right' || p.hand === 'left') ? p.hand : undefined
}

function ntrpNum(ntrp: string): number | undefined {
    return ntrp.trim() ? Number(ntrp) : undefined
}

/**
 * 로테이션 게임 1건 → PersonalMatchInput.
 * opp1 → opponent 슬롯, opp2 → opponent2 슬롯, partner → partner 슬롯.
 * 세트별 애드/듀스(myAd/oppAd)는 입력된 경우 그대로 보존한다.
 */
export function rotationGameToInput(
    meta: RotationSessionMeta,
    game: RotationGame,
    pool: PoolPlayer[],
): PersonalMatchInput {
    const partner = poolById(pool, game.partnerRef)
    const opp1 = poolById(pool, game.opp1Ref)
    const opp2 = poolById(pool, game.opp2Ref)
    const cleanSets = game.sets.map((s) => ({
        me: Number.isNaN(s.me) ? 0 : s.me,
        opp: Number.isNaN(s.opp) ? 0 : s.opp,
        ...(s.myAd ? { myAd: s.myAd } : {}),
        ...(s.oppAd ? { oppAd: s.oppAd } : {}),
    }))
    return {
        opponentName: opp1?.player.name.trim() ?? '',
        opponentUserId: opp1?.player.userId,
        opponentDominantHand: opp1 ? handOf(opp1.player) : undefined,
        opponentNtrp: opp1 ? ntrpNum(opp1.ntrp) : undefined,
        partnerName: partner?.player.name.trim() || undefined,
        partnerUserId: partner?.player.userId,
        partnerDominantHand: partner ? handOf(partner.player) : undefined,
        partnerNtrp: partner ? ntrpNum(partner.ntrp) : undefined,
        opponent2Name: opp2?.player.name.trim() || undefined,
        opponent2UserId: opp2?.player.userId,
        opponent2DominantHand: opp2 ? handOf(opp2.player) : undefined,
        opponent2Ntrp: opp2 ? ntrpNum(opp2.ntrp) : undefined,
        playedAt: meta.playedAt,
        playedTime: meta.playedTime || undefined,
        matchType: meta.matchType,
        surface: meta.surface || undefined,
        setScores: cleanSets,
        notes: meta.notes || undefined,
    }
}

export function buildRotationInputs(
    meta: RotationSessionMeta,
    games: RotationGame[],
    pool: PoolPlayer[],
): PersonalMatchInput[] {
    return games.map((g) => rotationGameToInput(meta, g, pool))
}

/**
 * 로테이션 입력 전체 유효성. 저장 버튼 활성화 판단에 쓴다.
 * - 공통 메타(날짜·시각·표면) 입력
 * - 풀 3명 이상, 각 풀 항목 선수 입력 완료
 * - 게임 1개 이상, 각 게임 파트너/상대2 ref가 풀에 실존하고 서로 중복 없음
 * - 상대1·상대2 NTRP 필수, 파트너 NTRP 선택(입력 시 유효)
 * - 각 게임 세트 유효
 */
export function validateRotation(
    pool: PoolPlayer[],
    games: RotationGame[],
    meta: RotationSessionMeta,
): boolean {
    if (!meta.playedAt || !meta.playedTime || !meta.surface) return false
    if (pool.length < 3) return false
    if (!pool.every((p) => isPlayerFilled(p.player))) return false
    if (games.length < 1) return false

    for (const g of games) {
        const refs = [g.partnerRef, g.opp1Ref, g.opp2Ref]
        if (refs.some((r) => r === null)) return false
        if (!refs.every((r) => pool.some((p) => p.tempId === r))) return false
        if (new Set(refs).size !== refs.length) return false // 한 게임에 같은 사람 중복 금지

        const opp1 = poolById(pool, g.opp1Ref)!
        const opp2 = poolById(pool, g.opp2Ref)!
        if (!isNtrpValid(opp1.ntrp) || !isNtrpValid(opp2.ntrp)) return false

        const partner = poolById(pool, g.partnerRef)!
        if (partner.ntrp.trim() !== '' && !isNtrpValid(partner.ntrp)) return false

        if (g.sets.length < 1 || !g.sets.every(isSetValid)) return false
    }
    return true
}
