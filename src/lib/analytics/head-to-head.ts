import {
    type BundleWithMatches, type BundleWithGameMeta, type BundleWithPersonal, type BundleWithSurface,
    getMatchOutcome, getOpponentIds, isUserTeam1, calcWinRate,
} from '@/lib/analytics/shared'
import { effectiveNtrp } from '@/lib/rating/display'
import { formatRecord } from '@/lib/dashboard/outcome'
import { MATCH_TYPE_LABELS } from '@/lib/dashboard/match-type-style'
import { SURFACE_LABELS } from '@/lib/dashboard/surface'
import type { UnifiedHeadToHead } from '@/lib/queries/stats'
import type { CourtSurface, MatchType, User } from '@/types'

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

    // 개인 매치 (복식이면 상대 #1·#2 각각 1경기로 누적 — 클럽 복식과 동일 규칙)
    const addPersonalOpponent = (
        opponentUserId: string | undefined,
        opponentName: string | undefined,
        outcome: 'win' | 'loss' | 'draw',
        sets: { me: number; opp: number }[],
    ) => {
        let key: string
        let entryUserId: string | null
        let entryName: string | null
        if (opponentUserId) {
            key = opponentUserId
            entryUserId = opponentUserId
            entryName = opponentName ?? null
        } else if (opponentName) {
            key = `name:${opponentName}`
            entryUserId = null
            entryName = opponentName
        } else {
            return
        }
        const existing: UnifiedHeadToHead = map.get(key) ?? {
            opponentUserId: entryUserId,
            opponentName: entryName,
            matches: 0, wins: 0, losses: 0, draws: 0, setsWon: 0, setsLost: 0,
        }
        existing.matches++
        if (outcome === 'win') existing.wins++
        else if (outcome === 'loss') existing.losses++
        else existing.draws++
        for (const s of sets) { existing.setsWon += s.me; existing.setsLost += s.opp }
        map.set(key, existing)
    }

    for (const pm of bundle.personalMatches) {
        const outcome = pm.winner === 'me' ? 'win' : pm.winner === 'opponent' ? 'loss' : 'draw'
        addPersonalOpponent(pm.opponentUserId, pm.opponentName, outcome, pm.setScores)
        addPersonalOpponent(pm.opponent2UserId, pm.opponent2Name, outcome, pm.setScores)
    }

    // 총 경기 내림차순 정렬
    return [...map.values()].sort((a, b) => b.matches - a.matches)
}

// ── 상대 강/약 선별 (강한 상대 / 약한 상대 카드용) ─────────────────────────

export type OpponentRec = UnifiedHeadToHead & { winRate: number }

/**
 * "내가 강한 상대" 카드용 — minGames 이상 맞붙고 승률 minWinRate 이상인 상대만,
 * 승률 내림차순(동률 시 경기 많은 순)으로 정렬한다.
 */
export function selectStrongOpponents(
    list: UnifiedHeadToHead[], minGames = 10, minWinRate = 60,
): OpponentRec[] {
    return list
        .map((o) => ({ ...o, winRate: calcWinRate(o.wins, o.losses) }))
        .filter((o) => o.matches >= minGames && o.winRate >= minWinRate)
        .sort((a, b) => b.winRate - a.winRate || b.matches - a.matches)
}

/**
 * "내가 약한 상대" 카드용 — minGames 이상 맞붙고 승률 maxWinRate 미만인 상대만,
 * 승률 오름차순(동률 시 경기 많은 순)으로 정렬한다.
 */
export function selectWeakOpponents(
    list: UnifiedHeadToHead[], minGames = 10, maxWinRate = 40,
): OpponentRec[] {
    return list
        .map((o) => ({ ...o, winRate: calcWinRate(o.wins, o.losses) }))
        .filter((o) => o.matches >= minGames && o.winRate < maxWinRate)
        .sort((a, b) => a.winRate - b.winRate || b.matches - a.matches)
}

// ── 통합 1:1 맞대결 상세 (클럽+개인 매치) ─────────────────────────────────

export type HeadToHeadMatchEntry = {
    id: string
    date: string
    outcome: 'W' | 'L' | 'D'
    score: string
    source: 'club' | 'personal'
    matchType: MatchType
    surface: CourtSurface | null
    myPartnerName: string | null         // 복식 전용 (단식은 null)
    opponentPartnerName: string | null   // 복식 전용 (단식은 null)
    playedTime: string | null            // 개인 경기 전용
    notes: string | null                 // 개인 경기 전용
}

export type HeadToHeadTypeBreakdown = { matchType: MatchType; wins: number; losses: number; draws: number }
export type HeadToHeadSurfaceBreakdown = { surface: CourtSurface | 'unknown'; wins: number; losses: number; draws: number }

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
    matches: HeadToHeadMatchEntry[]
    // 요약 분해 (경기수 내림차순)
    byMatchType: HeadToHeadTypeBreakdown[]
    bySurface: HeadToHeadSurfaceBreakdown[]
    // 헤더 보조 정보
    opponentDominantHand: 'right' | 'left' | null
    opponentNtrp: number | null
}

export function aggregateHeadToHeadUnified(
    bundle: BundleWithMatches & BundleWithGameMeta & BundleWithPersonal & BundleWithSurface,
    userId: string,
    opponentKey: { userId: string | null; name: string | null },
    userMap: Map<string, User>,
): UnifiedHeadToHeadDetail {
    const nameOf = (id: string | null | undefined): string | null =>
        id ? userMap.get(id)?.name ?? null : null

    const entries: HeadToHeadMatchEntry[] = []

    let mySetsWon = 0; let mySetsLost = 0

    // 헤더용 상대 손잡이/NTRP — 개인 경기에서 최신(날짜 큰) 값을 채택
    let handCand: { date: string; hand: 'right' | 'left' } | null = null
    let ntrpCand: { date: string; ntrp: number } | null = null

    // 클럽 매치 (단식+복식 모두): 세트 합산을 엔트리 루프 안에서 처리
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

        // 복식 파트너: 내 팀 − 나 / 상대 팀 − 선택 상대
        let myPartnerName: string | null = null
        let opponentPartnerName: string | null = null
        if (m.matchType !== 'singles') {
            const myTeam = isTeam1 ? (m.team1 ?? []) : (m.team2 ?? [])
            const oppTeam = isTeam1 ? (m.team2 ?? []) : (m.team1 ?? [])
            myPartnerName = nameOf(myTeam.find((id) => id !== userId))
            opponentPartnerName = nameOf(oppTeam.find((id) => id !== opponentKey.userId))
        }

        entries.push({
            id: m.id, date, outcome: o, score: scoreStr, source: 'club',
            matchType: m.matchType,
            surface: bundle.courtSurfaceByMatchId[m.id] ?? null,
            myPartnerName, opponentPartnerName,
            playedTime: null, notes: null,
        })
    }

    // 개인 매치 (복식이면 상대 #1·#2 중 하나라도 일치하면 집계)
    for (const pm of bundle.personalMatches) {
        const matchedSlot1 = opponentKey.userId
            ? pm.opponentUserId === opponentKey.userId
            : (!pm.opponentUserId && pm.opponentName === opponentKey.name)
        const matchedSlot2 = opponentKey.userId
            ? pm.opponent2UserId === opponentKey.userId
            : (!pm.opponent2UserId && !!pm.opponent2Name && pm.opponent2Name === opponentKey.name)
        if (!matchedSlot1 && !matchedSlot2) continue

        const o: 'W' | 'L' | 'D' = pm.winner === 'me' ? 'W' : pm.winner === 'opponent' ? 'L' : 'D'
        const scoreStr = pm.setScores.map((s) => `${s.me}-${s.opp}`).join(', ')

        // 세트 합산
        for (const s of pm.setScores) {
            mySetsWon += s.me
            mySetsLost += s.opp
        }

        // 복식 파트너: 내 파트너 + 상대 파트너(매칭된 슬롯의 반대편)
        let myPartnerName: string | null = null
        let opponentPartnerName: string | null = null
        if (pm.matchType !== 'singles') {
            myPartnerName = pm.partnerName ?? nameOf(pm.partnerUserId)
            opponentPartnerName = matchedSlot1
                ? (pm.opponent2Name ?? nameOf(pm.opponent2UserId))
                : (pm.opponentName ?? nameOf(pm.opponentUserId))
        }

        // 헤더용 손잡이/NTRP (매칭된 슬롯 기준)
        const hand = matchedSlot1 ? pm.opponentDominantHand : pm.opponent2DominantHand
        const ntrp = matchedSlot1 ? pm.opponentNtrp : pm.opponent2Ntrp
        if (hand && (!handCand || pm.playedAt > handCand.date)) handCand = { date: pm.playedAt, hand }
        if (ntrp != null && (!ntrpCand || pm.playedAt > ntrpCand.date)) ntrpCand = { date: pm.playedAt, ntrp }

        entries.push({
            id: pm.id, date: pm.playedAt, outcome: o, score: scoreStr, source: 'personal',
            matchType: pm.matchType,
            surface: pm.surface ?? null,
            myPartnerName, opponentPartnerName,
            playedTime: pm.playedTime ?? null,
            notes: pm.notes ?? null,
        })
    }

    entries.sort((a, b) => b.date.localeCompare(a.date))

    let myWins = 0; let myLosses = 0; let draws = 0
    for (const e of entries) {
        if (e.outcome === 'W') myWins++
        else if (e.outcome === 'L') myLosses++
        else draws++
    }

    // 요약 분해: 매치타입별 / 표면별 (경기수 내림차순)
    const typeMap = new Map<MatchType, HeadToHeadTypeBreakdown>()
    const surfaceMap = new Map<CourtSurface | 'unknown', HeadToHeadSurfaceBreakdown>()
    for (const e of entries) {
        const t = typeMap.get(e.matchType) ?? { matchType: e.matchType, wins: 0, losses: 0, draws: 0 }
        const sKey: CourtSurface | 'unknown' = e.surface ?? 'unknown'
        const s = surfaceMap.get(sKey) ?? { surface: sKey, wins: 0, losses: 0, draws: 0 }
        if (e.outcome === 'W') { t.wins++; s.wins++ }
        else if (e.outcome === 'L') { t.losses++; s.losses++ }
        else { t.draws++; s.draws++ }
        typeMap.set(e.matchType, t)
        surfaceMap.set(sKey, s)
    }
    const total = (b: { wins: number; losses: number; draws: number }) => b.wins + b.losses + b.draws
    const byMatchType = [...typeMap.values()].sort((a, b) => total(b) - total(a))
    const bySurface = [...surfaceMap.values()].sort((a, b) => total(b) - total(a))

    // 헤더 NTRP: 개인 경기 입력값 우선, 없으면 회원 상대의 유효 NTRP
    let opponentNtrp: number | null = ntrpCand?.ntrp ?? null
    if (opponentNtrp == null && opponentKey.userId) {
        const u = userMap.get(opponentKey.userId)
        if (u) {
            const eff = effectiveNtrp(u)
            opponentNtrp = eff > 0 ? eff : null
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
        byMatchType,
        bySurface,
        opponentDominantHand: handCand?.hand ?? null,
        opponentNtrp,
    }
}

// ── 규칙기반 맞대결 분석 코멘트 ──────────────────────────────────────────
// detail 한 건을 받아 한국어 요약 문장 배열을 만든다. 조건을 만족하는 라인만
// 담고, 헤드라인 + 하이라이트로 최대 4줄까지만 반환한다 (코멘트 톤 유지).

/** 현재 연승/연패 길이 (양수=연승, 음수=연패). 무승부는 흐름을 끊는다. */
function currentStreak(matches: { outcome: 'W' | 'L' | 'D' }[]): number {
    let streak = 0
    let type: 'W' | 'L' | null = null
    for (const m of matches) {
        if (m.outcome === 'D') break
        if (type === null) { type = m.outcome; streak = 1 }
        else if (m.outcome === type) streak++
        else break
    }
    if (type === 'W') return streak
    if (type === 'L') return -streak
    return 0
}

export function summarizeHeadToHead(detail: UnifiedHeadToHeadDetail, opponentName: string): string[] {
    if (detail.totalMatches === 0) return []

    const name = opponentName || '상대'
    const lines: string[] = []
    const { myWins, myLosses, draws, winRate } = detail
    const decisive = myWins + myLosses
    const record = formatRecord(myWins, myLosses, draws)

    // 1. 헤드라인 (항상)
    if (decisive === 0) lines.push(`${name}와는 ${record}, 아직 승부를 가리지 못했어요.`)
    else if (winRate >= 60) lines.push(`${name} 상대 ${record}로 우세한 편이에요.`)
    else if (winRate <= 40) lines.push(`${name} 상대 ${record}로 까다로운 상대예요.`)
    else lines.push(`${name}와는 ${record}, 팽팽한 맞수예요.`)

    // 2. 연승/연패
    const streak = currentStreak(detail.matches)
    if (streak >= 2) lines.push(`최근 ${streak}연승 중이에요.`)
    else if (streak <= -2) lines.push(`최근 ${-streak}연패 중이에요.`)

    // 3. 매치타입 강약 (decisive>=2 중 가장 강한/약한 하나)
    const typed = detail.byMatchType
        .map((b) => ({ ...b, dec: b.wins + b.losses, wr: calcWinRate(b.wins, b.losses) }))
        .filter((b) => b.dec >= 2)
    const strongType = typed.filter((b) => b.wr >= 60).sort((a, b) => b.wr - a.wr)[0]
    const weakType = typed.filter((b) => b.wr <= 40).sort((a, b) => a.wr - b.wr)[0]
    if (strongType) {
        lines.push(`${MATCH_TYPE_LABELS[strongType.matchType]}에서 특히 강해요 (${formatRecord(strongType.wins, strongType.losses, strongType.draws)}).`)
    } else if (weakType) {
        lines.push(`${MATCH_TYPE_LABELS[weakType.matchType]}에서는 고전하고 있어요 (${formatRecord(weakType.wins, weakType.losses, weakType.draws)}).`)
    }

    // 4. 표면 강약 (unknown 제외, decisive>=2)
    const surfaced = detail.bySurface
        .filter((b) => b.surface !== 'unknown')
        .map((b) => ({ ...b, dec: b.wins + b.losses, wr: calcWinRate(b.wins, b.losses) }))
        .filter((b) => b.dec >= 2)
    const strongSurface = surfaced.filter((b) => b.wr >= 60).sort((a, b) => b.wr - a.wr)[0]
    const weakSurface = surfaced.filter((b) => b.wr <= 40).sort((a, b) => a.wr - b.wr)[0]
    if (strongSurface) {
        lines.push(`${SURFACE_LABELS[strongSurface.surface]} 코트에서 강세예요 (${formatRecord(strongSurface.wins, strongSurface.losses, strongSurface.draws)}).`)
    } else if (weakSurface) {
        lines.push(`${SURFACE_LABELS[weakSurface.surface]} 코트에서 약세예요 (${formatRecord(weakSurface.wins, weakSurface.losses, weakSurface.draws)}).`)
    }

    // 5. 세트 득실
    const diff = detail.mySetsWon - detail.mySetsLost
    if (diff >= 4) lines.push(`세트 득실 +${diff}로 내용도 우위예요.`)
    else if (diff <= -4) lines.push(`세트 득실 ${diff}로 내용상 밀리고 있어요.`)

    return lines.slice(0, 4)
}
