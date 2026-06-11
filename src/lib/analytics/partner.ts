import type { MatchType, User } from '@/types'
import {
    type BundleWithMatches, type BundleWithPersonal,
    getMatchOutcome, calcWinRate,
} from '@/lib/analytics/shared'

// ── 파트너 추천 집계 ─────────────────────────────────────────────────────

export type PartnerRec = {
    partnerId: string        // 회원: users.id, 외부: `name:{이름}` 키
    partnerName?: string     // 외부 파트너 표시명 (회원은 userMap에서 해석)
    matchType: MatchType
    wins: number
    losses: number
    draws: number
    total: number
    winRate: number
}

export type PartnerRecommendations = {
    menDoubles: PartnerRec[]
    womenDoubles: PartnerRec[]
    mixedDoubles: PartnerRec[]
}

type DoubleMatchType = 'men_doubles' | 'women_doubles' | 'mixed_doubles'
const DOUBLES_TYPES: DoubleMatchType[] = ['men_doubles', 'women_doubles', 'mixed_doubles']

type PartnerAcc = { wins: number; losses: number; draws: number; total: number; name?: string }

/**
 * 복식 매치에서 같은 팀 파트너별 전적을 집계하여 추천 목록 반환.
 * 5경기 이상 함께 뛴 파트너만 포함하며, 승률 내림차순 정렬.
 * 클럽 복식(team1/team2) + 개인 복식(personalMatches.partner*) 모두 반영한다.
 */
export function aggregatePartnerRecommendations(
    bundle: BundleWithMatches & Partial<BundleWithPersonal>,
    userId: string,
): PartnerRecommendations {
    // 복식 타입별 파트너별 집계 맵
    const maps: Record<DoubleMatchType, Map<string, PartnerAcc>> = {
        men_doubles: new Map(),
        women_doubles: new Map(),
        mixed_doubles: new Map(),
    }

    function addOutcome(
        doublesType: DoubleMatchType,
        partnerKey: string,
        outcome: 'win' | 'loss' | 'draw',
        name?: string,
    ) {
        const map = maps[doublesType]
        const rec = map.get(partnerKey) ?? { wins: 0, losses: 0, draws: 0, total: 0 }
        rec.total++
        if (outcome === 'win') rec.wins++
        else if (outcome === 'loss') rec.losses++
        else rec.draws++
        if (name && !rec.name) rec.name = name
        map.set(partnerKey, rec)
    }

    // 클럽 복식 매치
    for (const m of bundle.matches) {
        if (!m.result) continue
        if (!DOUBLES_TYPES.includes(m.matchType as DoubleMatchType)) continue

        const myTeam = (m.team1 ?? []).includes(userId) ? (m.team1 ?? []) : (m.team2 ?? [])
        if (!myTeam.includes(userId)) continue

        const outcome = getMatchOutcome(m, userId)
        const doublesType = m.matchType as DoubleMatchType

        // 같은 팀 동료(자신 제외)
        for (const partnerId of myTeam) {
            if (partnerId === userId) continue
            addOutcome(doublesType, partnerId, outcome)
        }
    }

    // 개인 복식 매치 (파트너 정보가 있을 때만)
    for (const pm of bundle.personalMatches ?? []) {
        if (!DOUBLES_TYPES.includes(pm.matchType as DoubleMatchType)) continue
        const doublesType = pm.matchType as DoubleMatchType
        // 회원 파트너는 userId 키, 외부 파트너는 `name:{이름}` 키
        const partnerKey = pm.partnerUserId ?? (pm.partnerName ? `name:${pm.partnerName}` : null)
        if (!partnerKey) continue
        const outcome = pm.winner === 'me' ? 'win' : pm.winner === 'opponent' ? 'loss' : 'draw'
        addOutcome(doublesType, partnerKey, outcome, pm.partnerUserId ? undefined : pm.partnerName)
    }

    function toSortedRecs(
        doublesType: DoubleMatchType,
        map: Map<string, PartnerAcc>,
    ): PartnerRec[] {
        const recs: PartnerRec[] = []
        for (const [partnerId, rec] of map.entries()) {
            if (rec.total < 5) continue   // 5경기 이상 필터
            recs.push({
                partnerId,
                partnerName: rec.name,
                matchType: doublesType,
                wins: rec.wins,
                losses: rec.losses,
                draws: rec.draws,
                total: rec.total,
                winRate: calcWinRate(rec.wins, rec.losses) ?? 0,
            })
        }
        return recs.sort((a, b) => b.winRate - a.winRate || b.total - a.total)
    }

    return {
        menDoubles: toSortedRecs('men_doubles', maps.men_doubles),
        womenDoubles: toSortedRecs('women_doubles', maps.women_doubles),
        mixedDoubles: toSortedRecs('mixed_doubles', maps.mixed_doubles),
    }
}

/**
 * 성별에 맞는 복식 종목을 한 목록으로 합친다.
 * 남: 남복+혼복 / 여: 여복+혼복 / 그 외: 전체. (남복 파트너는 남성, 혼복 파트너는 여성이라 중복 없음)
 */
export function flattenPartnersByGender(
    recs: PartnerRecommendations,
    gender: User['gender'],
): PartnerRec[] {
    if (gender === 'male') return [...recs.menDoubles, ...recs.mixedDoubles]
    if (gender === 'female') return [...recs.womenDoubles, ...recs.mixedDoubles]
    return [...recs.menDoubles, ...recs.womenDoubles, ...recs.mixedDoubles]
}

/**
 * "나와 잘 맞는 파트너" 카드용 — 승률 minWinRate 이상만 추려
 * 승률 내림차순(동률 시 경기 수 많은 순)으로 정렬한다.
 */
export function selectGoodPartners(list: PartnerRec[], minWinRate = 55): PartnerRec[] {
    return list
        .filter((r) => r.winRate >= minWinRate)
        .sort((a, b) => b.winRate - a.winRate || b.total - a.total)
}

/**
 * "승률이 낮은 파트너" 카드용 — 승률 threshold 미만만 추려
 * 승률 오름차순(동률 시 경기 수 많은 순)으로 정렬한다.
 */
export function selectLowWinRatePartners(list: PartnerRec[], threshold = 40): PartnerRec[] {
    return list
        .filter((r) => r.winRate < threshold)
        .sort((a, b) => a.winRate - b.winRate || b.total - a.total)
}
