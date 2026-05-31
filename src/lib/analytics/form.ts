import {
    type BundleWithMatches, type BundleWithGameMeta, type BundleWithPersonal,
    getMatchOutcome,
    isUserTeam1,
} from '@/lib/analytics/shared'

// ── 최근 폼 ──────────────────────────────────────────────

export type RecentFormResult = {
    last10: ('W' | 'L' | 'D')[]
    currentStreak: { type: 'W' | 'L' | 'D'; length: number } | null
    recentWins: number
    recentLosses: number
    recentDraws: number
}

export function aggregateRecentForm(
    bundle: BundleWithMatches & BundleWithGameMeta & BundleWithPersonal,
    userId: string,
    n = 10,
): RecentFormResult {
    const outcomes: { date: string; outcome: 'W' | 'L' | 'D' }[] = []

    for (const m of bundle.matches) {
        if (!m.result) continue
        const meta = bundle.gameMetaById[m.matchGameId]
        const date = meta?.date ?? '0000-00-00'
        const o = getMatchOutcome(m, userId)
        outcomes.push({ date, outcome: o === 'win' ? 'W' : o === 'loss' ? 'L' : 'D' })
    }

    for (const pm of bundle.personalMatches) {
        const o = pm.winner === 'me' ? 'W' : pm.winner === 'opponent' ? 'L' : 'D'
        outcomes.push({ date: pm.playedAt, outcome: o })
    }

    outcomes.sort((a, b) => b.date.localeCompare(a.date))
    const recent = outcomes.slice(0, n)

    const last10 = recent.map((r) => r.outcome)
    const recentWins = last10.filter((o) => o === 'W').length
    const recentLosses = last10.filter((o) => o === 'L').length
    const recentDraws = last10.filter((o) => o === 'D').length

    let currentStreak: RecentFormResult['currentStreak'] = null
    if (last10.length > 0) {
        const first = last10[0]
        let len = 1
        for (let i = 1; i < last10.length; i++) {
            if (last10[i] === first) len++
            else break
        }
        currentStreak = { type: first, length: len }
    }

    return { last10, currentStreak, recentWins, recentLosses, recentDraws }
}

// ── 컴백률 ──────────────────────────────────────────

export type ComebackStats = {
    comebackWins: number     // 첫 세트 패 후 역전 승리
    comebackLosses: number   // 첫 세트 승 후 역전 패배
    total: number            // 결정 세트까지 간 경기 수
    comebackRate: number     // comebackWins / (comebackWins + comebackLosses)
}

export function aggregateComebackRate(
    bundle: BundleWithMatches & BundleWithPersonal,
    userId: string,
): ComebackStats {
    let comebackWins = 0
    let comebackLosses = 0
    let total = 0

    for (const m of bundle.matches) {
        if (!m.result?.sets || m.result.sets.length < 2) continue
        const sets = m.result.sets
        const isTeam1 = isUserTeam1(m, userId)
        const firstSetWon = isTeam1 ? sets[0].team1 > sets[0].team2 : sets[0].team2 > sets[0].team1
        const finalOutcome = getMatchOutcome(m, userId)
        if (finalOutcome === 'draw') continue

        total++
        if (!firstSetWon && finalOutcome === 'win') comebackWins++
        if (firstSetWon && finalOutcome === 'loss') comebackLosses++
    }

    for (const pm of bundle.personalMatches) {
        if (!pm.setScores || pm.setScores.length < 2) continue
        if (pm.winner === 'draw') continue
        const firstSetWon = pm.setScores[0].me > pm.setScores[0].opp
        total++
        if (!firstSetWon && pm.winner === 'me') comebackWins++
        if (firstSetWon && pm.winner === 'opponent') comebackLosses++
    }

    const comebackRate = comebackWins + comebackLosses > 0
        ? Math.round((comebackWins / (comebackWins + comebackLosses)) * 100)
        : 0

    return { comebackWins, comebackLosses, total, comebackRate }
}
