import {
    type BundleWithMatches, type BundleWithGameMeta, type BundleWithPersonal,
    type BundleWithSurface, type BundleWithUserMap,
} from '@/lib/analytics/shared'
import { aggregateRecentForm } from '@/lib/analytics/form'
import { aggregateComebackRate } from '@/lib/analytics/form'
import { aggregateByNtrpDiff } from '@/lib/analytics/ntrp'
import { aggregateBySurface } from '@/lib/analytics/surface'
import { SURFACE_LABELS } from '@/lib/dashboard/surface'

export type DiagnosticItem = {
    label: string
    description: string
}

export type DiagnosisResult = {
    strengths: DiagnosticItem[]
    weaknesses: DiagnosticItem[]
}

// 진단 임계값 — 사각지대 없이 명백한 패턴이 노출되도록 한 곳에서 관리(추후 튜닝 용이).
const TH = {
    // 최근 폼: 최소 경기 수 + 승패 차
    formMinGames: 5,
    formDiff: 2,
    // 컴백(역전): 풀세트 최소 경기 + 강/약 기준
    comebackMinGames: 3,
    comebackStrong: 50,
    comebackWeak: 30,
    // NTRP 강자 상대: 최소 경기 + 강/약 승률
    strongerMinGames: 5,
    strongerStrong: 40,
    strongerWeak: 25,
    // NTRP 하위 상대: 최소 경기 + 취약 승률
    weakerMinGames: 5,
    weakerWeak: 45,
    // 표면: 최소 경기 + 강/약 승률
    surfaceMinGames: 3,
    surfaceStrong: 55,
    surfaceWeak: 35,
} as const

type FullBundle = BundleWithMatches & BundleWithGameMeta & BundleWithPersonal & BundleWithSurface & BundleWithUserMap

export function diagnoseStrengthsWeaknesses(
    bundle: FullBundle,
    userId: string,
    userNtrp: number | null,
): DiagnosisResult {
    const strengths: DiagnosticItem[] = []
    const weaknesses: DiagnosticItem[] = []

    const form = aggregateRecentForm(bundle, userId)
    const comeback = aggregateComebackRate(bundle, userId)
    const ntrp = aggregateByNtrpDiff(bundle, userId, userNtrp)
    const surface = aggregateBySurface(bundle, userId)

    // 최근 폼 진단
    if (form.last10.length >= TH.formMinGames) {
        if (form.recentWins - form.recentLosses >= TH.formDiff) {
            strengths.push({ label: '최근 상승세', description: `최근 ${form.last10.length}경기 ${form.recentWins}승 ${form.recentLosses}패로 좋은 흐름을 유지하고 있습니다.` })
        } else if (form.recentLosses - form.recentWins >= TH.formDiff) {
            weaknesses.push({ label: '최근 하락세', description: `최근 ${form.last10.length}경기 ${form.recentWins}승 ${form.recentLosses}패 — 패턴 점검이 필요합니다.` })
        }
    }

    // 컴백 능력 진단 (2세트 이상 + 무승부 아닌 경기가 최소 N경기)
    if (comeback.total >= TH.comebackMinGames) {
        if (comeback.comebackRate >= TH.comebackStrong) {
            strengths.push({ label: '강한 역전 능력', description: `결정 세트에서 ${comeback.comebackRate}%의 역전 성공률을 보입니다.` })
        } else if (comeback.comebackRate <= TH.comebackWeak && comeback.comebackWins + comeback.comebackLosses >= 3) {
            weaknesses.push({ label: '역전 취약', description: `풀세트 경기에서 역전 성공률이 ${comeback.comebackRate}%로 낮습니다. 체력·멘탈 관리가 필요합니다.` })
        }
    }

    // 강자 상대 성과 진단 (최소 N경기) — 사각지대 없이 강/약 모두 포착
    if (ntrp.stronger.total >= TH.strongerMinGames) {
        if (ntrp.stronger.winRate >= TH.strongerStrong) {
            strengths.push({ label: '강자 킬러', description: `NTRP 상위 상대에게 ${ntrp.stronger.total}경기 ${ntrp.stronger.winRate}% 승률 — 업셋 능력이 뛰어납니다.` })
        } else if (ntrp.stronger.winRate <= TH.strongerWeak) {
            weaknesses.push({ label: '강자 상대 약세', description: `NTRP 상위 상대에게 ${ntrp.stronger.total}경기 ${ntrp.stronger.winRate}% 승률에 그칩니다. 전략적 접근이 필요합니다.` })
        }
    }

    // 하위 상대 취약 진단 (이겨야 할 상대를 놓치는 패턴)
    if (ntrp.weaker.total >= TH.weakerMinGames && ntrp.weaker.winRate <= TH.weakerWeak) {
        weaknesses.push({ label: '하위 상대 취약', description: `NTRP 하위 상대에게 ${ntrp.weaker.total}경기 ${ntrp.weaker.winRate}% 승률 — 이겨야 할 경기를 놓치고 있습니다.` })
    }

    // 코트 표면 강세/약세 진단
    const surfaceEntries = (Object.entries(surface) as [string, { wins: number; losses: number; total: number; winRate: number }][])
        .filter(([key, wl]) => key !== 'unknown' && wl.total >= TH.surfaceMinGames)

    if (surfaceEntries.length > 0) {
        const best = surfaceEntries.reduce((a, b) => a[1].winRate >= b[1].winRate ? a : b)
        const worst = surfaceEntries.reduce((a, b) => a[1].winRate <= b[1].winRate ? a : b)

        // SURFACE_LABELS 공용 상수 사용 (surface.ts에서 단일 관리)
        const surfaceLabel = (key: string) => SURFACE_LABELS[key] ?? key

        if (best[1].winRate >= TH.surfaceStrong) {
            strengths.push({ label: `${surfaceLabel(best[0])} 강세`, description: `${surfaceLabel(best[0])}에서 ${best[1].winRate}% 승률로 가장 좋은 성적을 보입니다.` })
        }
        if (worst[0] !== best[0] && worst[1].winRate <= TH.surfaceWeak && worst[1].total >= TH.surfaceMinGames) {
            weaknesses.push({ label: `${surfaceLabel(worst[0])} 약세`, description: `${surfaceLabel(worst[0])}에서 ${worst[1].winRate}% 승률 — 해당 표면 적응 훈련이 도움이 됩니다.` })
        }
    }

    return { strengths, weaknesses }
}
