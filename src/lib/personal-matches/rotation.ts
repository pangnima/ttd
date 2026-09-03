import type { PersonalMatchSetScore, MatchType, CourtSurface, RotationPoolPlayer } from '@/types'
import type { PlayerPickerValue } from '@/components/personal-matches/player-picker'
import type { PersonalMatchInput } from '@/lib/personal-matches/validate-input'
import { isNtrpValid, isPlayerFilled, isSetValid } from './validators'

/**
 * 로테이션(아메리칸) 복식: 4명 이상이 파트너를 바꿔가며 여러 게임을 치는 경기.
 * 각 게임은 파트너·상대 구성이 달라 독립된 경기이므로 게임마다 별도 레코드로 저장한다.
 * 등록 시에는 선수 풀만 세션(rotation_sessions)으로 저장하고, 게임은 카드 '결과 입력'에서
 * 풀 항목을 tempId로 참조해 구성한 뒤 finalize RPC로 분해한다.
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
    sets: PersonalMatchSetScore[]  // 항상 길이 1 — 게임 1건 = 스코어 1줄 (배열 형태는 PersonalMatchSetScore[] 계약 유지용)
}

// 세션 공통 메타 — 모든 게임에 동일 적용 (선수·세트 제외)
export type RotationSessionMeta = {
    playedAt: string
    playedTime: string
    matchType: MatchType
    surface: CourtSurface | ''
    notes: string
    courtName: string  // '' = 미입력
}

// finalize RPC 페이로드 (게임 1건): 풀 항목을 직렬화한 선수 3명 + 세트
export type RotationGamePayload = {
    partner: RotationPoolPlayer
    opp1: RotationPoolPlayer
    opp2: RotationPoolPlayer
    sets: PersonalMatchSetScore[]
}

function poolById(pool: PoolPlayer[], ref: string | null): PoolPlayer | undefined {
    return ref ? pool.find((p) => p.tempId === ref) : undefined
}

// 손잡이는 회원·비회원 모두 저장 (고정 페어 폼의 buildInput 규칙과 동일 — 회원은 프로필 값이 자동 채워진다)
function handOf(p: PlayerPickerValue): 'right' | 'left' | undefined {
    return p.hand === 'right' || p.hand === 'left' ? p.hand : undefined
}

function ntrpNum(ntrp: string): number | undefined {
    return ntrp.trim() ? Number(ntrp) : undefined
}

function cleanSets(sets: PersonalMatchSetScore[]): PersonalMatchSetScore[] {
    return sets.map((s) => ({
        me: Number.isNaN(s.me) ? 0 : s.me,
        opp: Number.isNaN(s.opp) ? 0 : s.opp,
        ...(s.myAd ? { myAd: s.myAd } : {}),
        ...(s.oppAd ? { oppAd: s.oppAd } : {}),
    }))
}

// ── 풀 ↔ 세션 players(jsonb) 직렬화 ──

export function poolPlayerToJson(p: PoolPlayer): RotationPoolPlayer {
    return {
        userId: p.player.userId,
        name: p.player.name.trim(),
        hand: handOf(p.player),
        ntrp: ntrpNum(p.ntrp),
    }
}

export function poolToPlayers(pool: PoolPlayer[]): RotationPoolPlayer[] {
    return pool.map(poolPlayerToJson)
}

/** 세션 players → 편집용 풀 (tempId 재부여). makeId는 테스트에서 결정적 id를 주입하기 위한 훅. */
export function playersToPool(players: RotationPoolPlayer[], makeId: () => string = () => crypto.randomUUID()): PoolPlayer[] {
    return players.map((p) => ({
        tempId: makeId(),
        player: { userId: p.userId, name: p.name, hand: p.hand ?? '' },
        ntrp: p.ntrp != null ? String(p.ntrp) : '',
    }))
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
        setScores: cleanSets(game.sets),
        notes: meta.notes || undefined,
        courtName: meta.courtName || undefined,
    }
}

export function buildRotationInputs(
    meta: RotationSessionMeta,
    games: RotationGame[],
    pool: PoolPlayer[],
): PersonalMatchInput[] {
    return games.map((g) => rotationGameToInput(meta, g, pool))
}

/** finalize RPC 페이로드 — 검증(validateRotationGames)을 통과한 게임만 넘긴다. */
export function buildRotationGamePayloads(games: RotationGame[], pool: PoolPlayer[]): RotationGamePayload[] {
    return games.map((g) => {
        const partner = poolById(pool, g.partnerRef)
        const opp1 = poolById(pool, g.opp1Ref)
        const opp2 = poolById(pool, g.opp2Ref)
        const empty: RotationPoolPlayer = { name: '' }
        return {
            partner: partner ? poolPlayerToJson(partner) : empty,
            opp1: opp1 ? poolPlayerToJson(opp1) : empty,
            opp2: opp2 ? poolPlayerToJson(opp2) : empty,
            sets: cleanSets(g.sets),
        }
    })
}

/**
 * 세션 등록 단계 검증 — 공통 메타(날짜·시각·표면, 코트명은 선택) + 풀 3명 이상, 각 풀 항목 선수 입력 완료.
 * 풀 전원 NTRP 필수 — 게임에서 파트너/상대 어느 역할이든 개인 레이팅 계산에 쓰인다 (페어 고정 폼과 동일 규칙).
 */
export function validateRotationPool(pool: PoolPlayer[], meta: RotationSessionMeta): boolean {
    if (!meta.playedAt || !meta.playedTime || !meta.surface) return false
    if (pool.length < 3) return false
    if (!pool.every((p) => isPlayerFilled(p.player))) return false
    if (!pool.every((p) => isNtrpValid(p.ntrp))) return false
    return true
}

/**
 * 게임 단계 검증 — 게임 1개 이상, 각 게임 파트너/상대 ref가 풀에 실존하고 서로 중복 없음,
 * 파트너·상대1·상대2 NTRP 모두 필수, 게임당 스코어 정확히 1줄(세트 1개 = 게임 1개)이며 유효.
 */
export function validateRotationGames(pool: PoolPlayer[], games: RotationGame[]): boolean {
    if (games.length < 1) return false
    for (const g of games) {
        const refs = [g.partnerRef, g.opp1Ref, g.opp2Ref]
        if (refs.some((r) => r === null)) return false
        if (!refs.every((r) => pool.some((p) => p.tempId === r))) return false
        if (new Set(refs).size !== refs.length) return false // 한 게임에 같은 사람 중복 금지

        const partner = poolById(pool, g.partnerRef)!
        const opp1 = poolById(pool, g.opp1Ref)!
        const opp2 = poolById(pool, g.opp2Ref)!
        if (!isNtrpValid(partner.ntrp) || !isNtrpValid(opp1.ntrp) || !isNtrpValid(opp2.ntrp)) return false

        if (g.sets.length !== 1 || !g.sets.every(isSetValid)) return false
    }
    return true
}

/** 풀 + 게임 전체 유효성 (등록 폼에서 게임까지 한 번에 저장하던 구 경로·테스트 호환). */
export function validateRotation(pool: PoolPlayer[], games: RotationGame[], meta: RotationSessionMeta): boolean {
    return validateRotationPool(pool, meta) && validateRotationGames(pool, games)
}
