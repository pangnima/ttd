import {
    type BundleWithMatches, type BundleWithGameMeta, type BundleWithPersonal,
    getMatchOutcome, getOpponentIds, isUserTeam1,
} from '@/lib/analytics/shared'
import type { UnifiedHeadToHead } from '@/lib/queries/stats'

// ── 클라이언트 H2H 목록 빌더 (scope-aware 번들용) ─────────────────────────

/**
 * 필터된 matches/personalMatches에서 상대별 H2H 목록을 순수함수로 산출.
 * analytics 번들이 scope(전체/클럽/개인)로 자른 데이터를 받아 사용한다.
 */
export function buildHeadToHeadList(
    bundle: BundleWithMatches & BundleWithGameMeta & BundleWithPersonal,
    userId: string,
): UnifiedHeadToHead[] {
    const map = new Map<string, UnifiedHeadToHead>()

    // 클럽 매치
    for (const m of bundle.matches) {
        if (!m.result) continue
        const allIds = m.matchType === 'singles'
            ? [m.player1Id, m.player2Id].filter(Boolean) as string[]
            : [...(m.team1 ?? []), ...(m.team2 ?? [])]
        if (!allIds.includes(userId)) continue

        const oppIds = getOpponentIds(m, userId)
        if (oppIds.length === 0) continue

        const outcome = getMatchOutcome(m, userId)
        const isTeam1 = isUserTeam1(m, userId)

        for (const oppId of oppIds) {
            const existing: UnifiedHeadToHead = map.get(oppId) ?? {
                opponentUserId: oppId,
                opponentName: null,
                matches: 0, wins: 0, losses: 0, draws: 0, setsWon: 0, setsLost: 0,
            }
            existing.matches++
            if (outcome === 'win') existing.wins++
            else if (outcome === 'loss') existing.losses++
            else existing.draws++
            for (const s of m.result.sets) {
                existing.setsWon += isTeam1 ? s.team1 : s.team2
                existing.setsLost += isTeam1 ? s.team2 : s.team1
            }
            map.set(oppId, existing)
        }
    }

    // 개인 매치
    for (const pm of bundle.personalMatches) {
        const outcome = pm.winner === 'me' ? 'win' : pm.winner === 'opponent' ? 'loss' : 'draw'

        if (pm.opponentUserId) {
            const key = pm.opponentUserId
            const existing: UnifiedHeadToHead = map.get(key) ?? {
                opponentUserId: pm.opponentUserId,
                opponentName: pm.opponentName ?? null,
                matches: 0, wins: 0, losses: 0, draws: 0, setsWon: 0, setsLost: 0,
            }
            existing.matches++
            if (outcome === 'win') existing.wins++
            else if (outcome === 'loss') existing.losses++
            else existing.draws++
            for (const s of pm.setScores) { existing.setsWon += s.me; existing.setsLost += s.opp }
            map.set(key, existing)
        } else if (pm.opponentName) {
            const key = `name:${pm.opponentName}`
            const existing: UnifiedHeadToHead = map.get(key) ?? {
                opponentUserId: null,
                opponentName: pm.opponentName,
                matches: 0, wins: 0, losses: 0, draws: 0, setsWon: 0, setsLost: 0,
            }
            existing.matches++
            if (outcome === 'win') existing.wins++
            else if (outcome === 'loss') existing.losses++
            else existing.draws++
            for (const s of pm.setScores) { existing.setsWon += s.me; existing.setsLost += s.opp }
            map.set(key, existing)
        }
    }

    // 총 경기 내림차순 정렬
    return [...map.values()].sort((a, b) => b.matches - a.matches)
}

// ── 통합 1:1 맞대결 상세 (클럽+개인 매치) ─────────────────────────────────

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

    let mySetsWon = 0; let mySetsLost = 0

    // 클럽 매치 (단식+복식 모두): 세트 합산을 엔트리 루프 안에서 처리 (버그 수정)
    for (const m of bundle.matches) {
        if (!m.result) continue
        const allIds = m.matchType === 'singles'
            ? [m.player1Id, m.player2Id].filter(Boolean) as string[]
            : [...(m.team1 ?? []), ...(m.team2 ?? [])]
        if (!allIds.includes(userId)) continue

        const oppIds = getOpponentIds(m, userId)
        // 이름만 있는 외부 상대(opponentKey.userId === null)는 클럽 매치에 등록 불가
        // → 클럽 매치는 userId 기반 매칭만 수행, 외부 상대는 개인 매치 루프에서만 집계
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

        // 세트 합산 (엔트리 매칭된 경기만)
        for (const s of sets) {
            mySetsWon += isTeam1 ? s.team1 : s.team2
            mySetsLost += isTeam1 ? s.team2 : s.team1
        }

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

        // 세트 합산
        for (const s of pm.setScores) {
            mySetsWon += s.me
            mySetsLost += s.opp
        }

        entries.push({ id: pm.id, date: pm.playedAt, outcome: o, score: scoreStr, source: 'personal' })
    }

    entries.sort((a, b) => b.date.localeCompare(a.date))

    let myWins = 0; let myLosses = 0; let draws = 0

    for (const e of entries) {
        if (e.outcome === 'W') myWins++
        else if (e.outcome === 'L') myLosses++
        else draws++
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
