import {
    type BundleWithMatches, type BundleWithGameMeta, type BundleWithPersonal,
    getMatchOutcome, getOpponentIds, isUserTeam1,
} from '@/lib/analytics/shared'

// ── 통합 1:1 맞대결 상세 (클럽+개인 매치) ─────────────────────

export type UnifiedHeadToHeadDetail = {
    key: string
    opponentUserId: string | null
    opponentName: string
    totalMatches: number
    myWins: number
    myLosses: number
    draws: number
    winRate: number
    mySetsWon: number
    mySetsLost: number
    last5: ('W' | 'L' | 'D')[]
    matches: { id: string; date: string; outcome: 'W' | 'L' | 'D'; score: string; source: 'club' | 'personal' }[]
}

export function aggregateHeadToHeadUnified(
    bundle: BundleWithMatches & BundleWithGameMeta & BundleWithPersonal,
    userId: string,
    opponentKey: { userId: string | null; name: string | null },
): UnifiedHeadToHeadDetail {
    type MatchEntry = { id: string; date: string; outcome: 'W' | 'L' | 'D'; score: string; source: 'club' | 'personal' }
    const entries: MatchEntry[] = []

    // 클럽 매치 (단식+복식 모두)
    for (const m of bundle.matches) {
        if (!m.result) continue
        const allIds = m.matchType === 'singles'
            ? [m.player1Id, m.player2Id].filter(Boolean) as string[]
            : [...(m.team1 ?? []), ...(m.team2 ?? [])]
        if (!allIds.includes(userId)) continue

        const oppIds = getOpponentIds(m, userId)
        const matched = opponentKey.userId
            ? oppIds.includes(opponentKey.userId)
            : false
        if (!matched) continue

        const outcome = getMatchOutcome(m, userId)
        const o: 'W' | 'L' | 'D' = outcome === 'win' ? 'W' : outcome === 'loss' ? 'L' : 'D'
        const sets = m.result.sets
        const isTeam1 = isUserTeam1(m, userId)
        const scoreStr = sets.map((s) => `${isTeam1 ? s.team1 : s.team2}-${isTeam1 ? s.team2 : s.team1}`).join(', ')
        const date = bundle.gameMetaById[m.matchGameId]?.date ?? '0000-00-00'
        entries.push({ id: m.id, date, outcome: o, score: scoreStr, source: 'club' })
    }

    // 개인 매치
    for (const pm of bundle.personalMatches) {
        const matched = opponentKey.userId
            ? pm.opponentUserId === opponentKey.userId
            : (!pm.opponentUserId && pm.opponentName === opponentKey.name)
        if (!matched) continue

        const o: 'W' | 'L' | 'D' = pm.winner === 'me' ? 'W' : pm.winner === 'opponent' ? 'L' : 'D'
        const scoreStr = pm.setScores.map((s) => `${s.me}-${s.opp}`).join(', ')
        entries.push({ id: pm.id, date: pm.playedAt, outcome: o, score: scoreStr, source: 'personal' })
    }

    entries.sort((a, b) => b.date.localeCompare(a.date))

    let myWins = 0; let myLosses = 0; let draws = 0
    let mySetsWon = 0; let mySetsLost = 0

    for (const e of entries) {
        if (e.outcome === 'W') myWins++
        else if (e.outcome === 'L') myLosses++
        else draws++
    }

    // 세트 합산: 클럽 매치
    for (const m of bundle.matches) {
        if (!m.result?.sets) continue
        const oppIds = getOpponentIds(m, userId)
        if (opponentKey.userId && !oppIds.includes(opponentKey.userId)) continue
        const isTeam1 = isUserTeam1(m, userId)
        for (const s of m.result.sets) {
            mySetsWon += isTeam1 ? s.team1 : s.team2
            mySetsLost += isTeam1 ? s.team2 : s.team1
        }
    }

    // 세트 합산: 개인 매치
    for (const pm of bundle.personalMatches) {
        const matched = opponentKey.userId
            ? pm.opponentUserId === opponentKey.userId
            : (!pm.opponentUserId && pm.opponentName === opponentKey.name)
        if (!matched) continue
        for (const s of pm.setScores) {
            mySetsWon += s.me
            mySetsLost += s.opp
        }
    }

    const decisive = myWins + myLosses
    const key = opponentKey.userId ? opponentKey.userId : `name:${opponentKey.name}`

    return {
        key,
        opponentUserId: opponentKey.userId,
        opponentName: opponentKey.name ?? '',
        totalMatches: entries.length,
        myWins,
        myLosses,
        draws,
        winRate: decisive === 0 ? 0 : Math.round((myWins / decisive) * 100),
        mySetsWon,
        mySetsLost,
        last5: entries.slice(0, 5).map((e) => e.outcome),
        matches: entries,
    }
}
