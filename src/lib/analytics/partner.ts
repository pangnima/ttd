import type { MatchType } from '@/types'
import {
    type BundleWithMatches,
    getMatchOutcome, calcWinRate,
} from '@/lib/analytics/shared'

// ── 파트너 추천 집계 ─────────────────────────────────────────────────────

export type PartnerRec = {
    partnerId: string
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

/**
 * 복식 매치에서 같은 팀 파트너별 전적을 집계하여 추천 목록 반환.
 * 2경기 이상 함께 뛴 파트너만 포함하며, 승률 내림차순 정렬.
 * 개인 매치(PersonalMatch)에는 파트너 정보가 없으므로 클럽 매치만 사용.
 */
export function aggregatePartnerRecommendations(
    bundle: BundleWithMatches,
    userId: string,
): PartnerRecommendations {
    // 복식 타입별 파트너별 집계 맵
    const maps: Record<DoubleMatchType, Map<string, { wins: number; losses: number; draws: number; total: number }>> = {
        men_doubles: new Map(),
        women_doubles: new Map(),
        mixed_doubles: new Map(),
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
            const map = maps[doublesType]
            const rec = map.get(partnerId) ?? { wins: 0, losses: 0, draws: 0, total: 0 }
            rec.total++
            if (outcome === 'win') rec.wins++
            else if (outcome === 'loss') rec.losses++
            else rec.draws++
            map.set(partnerId, rec)
        }
    }

    function toSortedRecs(
        doublesType: DoubleMatchType,
        map: Map<string, { wins: number; losses: number; draws: number; total: number }>,
    ): PartnerRec[] {
        const recs: PartnerRec[] = []
        for (const [partnerId, rec] of map.entries()) {
            if (rec.total < 2) continue   // 2경기 이상 필터
            recs.push({
                partnerId,
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
