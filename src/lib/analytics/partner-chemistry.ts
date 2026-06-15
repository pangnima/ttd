import type { MatchType, User } from '@/types'
import {
    type BundleWithMatches, type BundleWithGameMeta, type BundleWithPersonal,
    getMatchOutcome, calcWinRate,
} from '@/lib/analytics/shared'

// ── 파트너 케미 (복식 파트너별 승률·연승·케미지수·추세) ───────────────────
// aggregatePartnerRecommendations는 5경기 하드필터·연승 미지원이라
// 시퀀스 기반으로 독립 집계한다(연승/최근폼/추세에 시간순 시퀀스가 필요).

export type PartnerChemistry = {
    partnerId: string
    partnerName?: string
    matchType: MatchType
    total: number
    wins: number
    losses: number
    draws: number
    winRate: number
    recentWinRate: number     // 최근 5경기 decisive 승률(최근 전부 무승부면 winRate로 폴백)
    currentStreak: number     // 현재 연속(양수). streakType과 함께 해석
    streakType: 'W' | 'L' | 'D' | null
    chemistry: number         // 0~100
    trend: 'up' | 'down' | 'flat'
}

type DoubleMatchType = 'men_doubles' | 'women_doubles' | 'mixed_doubles'
const DOUBLES_TYPES: DoubleMatchType[] = ['men_doubles', 'women_doubles', 'mixed_doubles']

type Game = { date: string; id: string; outcome: 'W' | 'L' | 'D' }
type Group = { partnerId: string; partnerName?: string; matchType: DoubleMatchType; games: Game[] }

const RECENT_N = 5
const TREND_THRESHOLD = 8

export function aggregatePartnerChemistry(
    bundle: BundleWithMatches & BundleWithGameMeta & BundleWithPersonal,
    userId: string,
    gender: User['gender'],
    minGames = 3,
): PartnerChemistry[] {
    const groups = new Map<string, Group>()

    const push = (partnerId: string, matchType: DoubleMatchType, g: Game, name?: string) => {
        const key = `${matchType}::${partnerId}`
        const grp = groups.get(key) ?? { partnerId, partnerName: name, matchType, games: [] }
        if (name && !grp.partnerName) grp.partnerName = name
        grp.games.push(g)
        groups.set(key, grp)
    }

    // 클럽 복식
    for (const m of bundle.matches) {
        if (!m.result) continue
        if (!DOUBLES_TYPES.includes(m.matchType as DoubleMatchType)) continue
        const myTeam = (m.team1 ?? []).includes(userId) ? (m.team1 ?? []) : (m.team2 ?? [])
        if (!myTeam.includes(userId)) continue
        const outcome = getMatchOutcome(m, userId)
        const o: 'W' | 'L' | 'D' = outcome === 'win' ? 'W' : outcome === 'loss' ? 'L' : 'D'
        const date = bundle.gameMetaById[m.matchGameId]?.date ?? '0000-00-00'
        for (const partnerId of myTeam) {
            if (partnerId === userId) continue
            push(partnerId, m.matchType as DoubleMatchType, { date, id: m.id, outcome: o })
        }
    }

    // 개인 복식
    for (const pm of bundle.personalMatches) {
        if (!DOUBLES_TYPES.includes(pm.matchType as DoubleMatchType)) continue
        const partnerKey = pm.partnerUserId ?? (pm.partnerName ? `name:${pm.partnerName}` : null)
        if (!partnerKey) continue
        const o: 'W' | 'L' | 'D' = pm.winner === 'me' ? 'W' : pm.winner === 'opponent' ? 'L' : 'D'
        push(
            partnerKey,
            pm.matchType as DoubleMatchType,
            { date: pm.playedAt, id: pm.id, outcome: o },
            pm.partnerUserId ? undefined : pm.partnerName,
        )
    }

    const all = [...groups.values()].map((grp) => toChemistry(grp))
    const filtered = byGender(all, gender).filter((p) => p.total >= minGames)
    return filtered.sort((a, b) => b.chemistry - a.chemistry || b.total - a.total)
}

function toChemistry(grp: Group): PartnerChemistry {
    // 최신순 정렬(form.ts 규약: 날짜 desc, 동률 시 id desc)
    const games = [...grp.games].sort((a, b) => {
        const c = b.date.localeCompare(a.date)
        return c !== 0 ? c : b.id.localeCompare(a.id)
    })
    const wins = games.filter((g) => g.outcome === 'W').length
    const losses = games.filter((g) => g.outcome === 'L').length
    const draws = games.filter((g) => g.outcome === 'D').length
    const total = games.length
    const winRate = calcWinRate(wins, losses)

    const recent = games.slice(0, RECENT_N)
    const recentWins = recent.filter((g) => g.outcome === 'W').length
    const recentLosses = recent.filter((g) => g.outcome === 'L').length
    const recentWinRate = recentWins + recentLosses === 0 ? winRate : calcWinRate(recentWins, recentLosses)

    // 현재 연속 (최신=index 0 기준)
    let currentStreak = 0
    let streakType: 'W' | 'L' | 'D' | null = null
    if (games.length > 0) {
        streakType = games[0].outcome
        currentStreak = 1
        for (let i = 1; i < games.length; i++) {
            if (games[i].outcome === streakType) currentStreak++
            else break
        }
    }

    const sampleScore = Math.min(total / 20, 1) * 100
    const chemistry = Math.max(0, Math.min(100,
        Math.round(winRate * 0.55 + recentWinRate * 0.30 + sampleScore * 0.15),
    ))

    const diff = recentWinRate - winRate
    const trend: PartnerChemistry['trend'] = diff > TREND_THRESHOLD ? 'up' : diff < -TREND_THRESHOLD ? 'down' : 'flat'

    return {
        partnerId: grp.partnerId,
        partnerName: grp.partnerName,
        matchType: grp.matchType,
        total, wins, losses, draws,
        winRate, recentWinRate, currentStreak, streakType, chemistry, trend,
    }
}

// 남: 남복+혼복 / 여: 여복+혼복 / 그 외: 전체
function byGender(list: PartnerChemistry[], gender: User['gender']): PartnerChemistry[] {
    if (gender === 'male') return list.filter((p) => p.matchType === 'men_doubles' || p.matchType === 'mixed_doubles')
    if (gender === 'female') return list.filter((p) => p.matchType === 'women_doubles' || p.matchType === 'mixed_doubles')
    return list
}
