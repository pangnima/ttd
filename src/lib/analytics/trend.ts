import {
    type BundleWithMatches, type BundleWithGameMeta, type BundleWithPersonal,
    getMatchOutcome,
} from '@/lib/analytics/shared'

// ── 전적 추세 (누적 승−패) ──────────────────────────────────────
//
// 클럽 레이팅이 없는 개인·전체 scope에서 레이팅 추세 자리를 대체하는 시계열.
// 각 경기 후 누적 (승 − 패) 값을 과거→최신 순으로 쌓아 스파크라인으로 그린다.

export type ResultTimeline = {
    /** 시작(0) → 각 경기 후 누적 (승 − 패). 길이 = 경기 수 + 1 */
    series: number[]
    /** 집계 대상 경기 수 */
    games: number
    /** 최종 누적 (승 − 패) */
    finalNet: number
}

export function aggregateResultTimeline(
    bundle: BundleWithMatches & BundleWithGameMeta & BundleWithPersonal,
    userId: string,
): ResultTimeline {
    // id: 날짜 동률 시 결정적 정렬을 위한 2차 키 (form.ts와 동일 규약)
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

    // 오름차순(과거 → 최신). 날짜 동률 시 id를 2차 키로 사용해 정렬을 결정적으로 만든다.
    outcomes.sort((a, b) => {
        const dateComp = a.date.localeCompare(b.date)
        return dateComp !== 0 ? dateComp : a.id.localeCompare(b.id)
    })

    const series: number[] = [0]
    let net = 0
    for (const o of outcomes) {
        if (o.outcome === 'W') net++
        else if (o.outcome === 'L') net--
        series.push(net)
    }

    return { series, games: outcomes.length, finalNet: net }
}
