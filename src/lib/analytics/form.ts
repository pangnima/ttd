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
    // id: 날짜 동률 시 결정적 정렬을 위한 2차 키 (매치 UUID)
    const outcomes: { date: string; id: string; outcome: 'W' | 'L' | 'D' }[] = []

    for (const m of bundle.matches) {
        if (!m.result) continue
        const meta = bundle.gameMetaById[m.matchGameId]
        const date = meta?.date ?? '0000-00-00'
        const o = getMatchOutcome(m, userId)
        outcomes.push({ date, id: m.id, outcome: o === 'win' ? 'W' : o === 'loss' ? 'L' : 'D' })
    }

    for (const pm of bundle.personalMatches) {
        const o = pm.winner === 'me' ? 'W' : pm.winner === 'opponent' ? 'L' : 'D'
        outcomes.push({ date: pm.playedAt, id: pm.id, outcome: o })
    }

    // 내림차순(최신=index 0) 정렬 후 최근 N경기 slice — streak은 최신 기준으로 계산.
    // 날짜 동률 시 id를 2차 키로 사용해 정렬을 결정적으로 만든다.
    outcomes.sort((a, b) => {
        const dateComp = b.date.localeCompare(a.date)
        return dateComp !== 0 ? dateComp : b.id.localeCompare(a.id)
    })
    const recent = outcomes.slice(0, n)

    const newestFirst = recent.map((r) => r.outcome)
    const recentWins = newestFirst.filter((o) => o === 'W').length
    const recentLosses = newestFirst.filter((o) => o === 'L').length
    const recentDraws = newestFirst.filter((o) => o === 'D').length

    // currentStreak: 최신 경기(index 0) 기준
    let currentStreak: RecentFormResult['currentStreak'] = null
    if (newestFirst.length > 0) {
        const first = newestFirst[0]
        let len = 1
        for (let i = 1; i < newestFirst.length; i++) {
            if (newestFirst[i] === first) len++
            else break
        }
        currentStreak = { type: first, length: len }
    }

    // 표시 배열은 과거→최신 (왼쪽=과거, 오른쪽=최신)
    const last10 = [...newestFirst].reverse()

    return { last10, currentStreak, recentWins, recentLosses, recentDraws }
}

// ── 컴백률 ──────────────────────────────────────────

export type ComebackStats = {
    comebackWins: number     // 첫 세트 패 후 역전 승리
    comebackLosses: number   // 첫 세트 승 후 역전 패배
    /** 2세트 이상이고 무승부가 아닌 경기 수. comebackRate의 분모와는 다르다.
     *  comebackRate 분모 = comebackWins + comebackLosses (역전이 발생한 경기만). */
    total: number
    comebackRate: number     // comebackWins / (comebackWins + comebackLosses) × 100
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
