import {
    type BundleWithMatches, type BundleWithGameMeta, type BundleWithPersonal,
    type BundleWithSurface, type BundleWithUserMap,
} from '@/lib/analytics/shared'
import { aggregateRecentForm } from '@/lib/analytics/form'
import { aggregateComebackRate } from '@/lib/analytics/form'
import { aggregateByNtrpDiff } from '@/lib/analytics/ntrp'
import { aggregateBySurface } from '@/lib/analytics/surface'

export type DiagnosticItem = {
    label: string
    description: string
}

export type DiagnosisResult = {
    strengths: DiagnosticItem[]
    weaknesses: DiagnosticItem[]
}

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
    if (form.last10.length >= 5) {
        if (form.recentWins > form.recentLosses + 2) {
            strengths.push({ label: '최근 상승세', description: `최근 ${form.last10.length}경기 ${form.recentWins}승 ${form.recentLosses}패로 좋은 흐름을 유지하고 있습니다.` })
        } else if (form.recentLosses > form.recentWins + 2) {
            weaknesses.push({ label: '최근 하락세', description: `최근 ${form.last10.length}경기 ${form.recentWins}승 ${form.recentLosses}패 — 패턴 점검이 필요합니다.` })
        }
    }

    // 컴백 능력 진단 (최소 5경기 이상의 결정 세트)
    if (comeback.total >= 3) {
        if (comeback.comebackRate >= 50) {
            strengths.push({ label: '강한 역전 능력', description: `결정 세트에서 ${comeback.comebackRate}%의 역전 성공률을 보입니다.` })
        } else if (comeback.comebackRate <= 20 && comeback.comebackWins + comeback.comebackLosses >= 3) {
            weaknesses.push({ label: '역전 취약', description: `풀세트 경기에서 역전 성공률이 ${comeback.comebackRate}%로 낮습니다. 체력·멘탈 관리가 필요합니다.` })
        }
    }

    // 강자 상대 성과 진단 (최소 3경기)
    if (ntrp.stronger.total >= 3) {
        if (ntrp.stronger.winRate >= 35) {
            strengths.push({ label: '강자 킬러', description: `NTRP 상위 상대에게 ${ntrp.stronger.winRate}% 승률 — 업셋 능력이 뛰어납니다.` })
        } else if (ntrp.stronger.winRate === 0 && ntrp.stronger.total >= 5) {
            weaknesses.push({ label: '강자 상대 약세', description: `NTRP 상위 상대에게 ${ntrp.stronger.total}경기 전패 중입니다. 전략적 접근이 필요합니다.` })
        }
    }

    // 코트 표면 강세/약세 진단
    const surfaceEntries = (Object.entries(surface) as [string, { wins: number; losses: number; total: number; winRate: number }][])
        .filter(([key, wl]) => key !== 'unknown' && wl.total >= 3)

    if (surfaceEntries.length > 0) {
        const best = surfaceEntries.reduce((a, b) => a[1].winRate >= b[1].winRate ? a : b)
        const worst = surfaceEntries.reduce((a, b) => a[1].winRate <= b[1].winRate ? a : b)

        const surfaceLabel: Record<string, string> = { hard: '하드코트', clay: '클레이', grass: '잔디', other: '기타 코트' }

        if (best[1].winRate >= 60) {
            strengths.push({ label: `${surfaceLabel[best[0]] ?? best[0]} 강세`, description: `${surfaceLabel[best[0]] ?? best[0]}에서 ${best[1].winRate}% 승률로 가장 좋은 성적을 보입니다.` })
        }
        if (worst[0] !== best[0] && worst[1].winRate <= 30 && worst[1].total >= 3) {
            weaknesses.push({ label: `${surfaceLabel[worst[0]] ?? worst[0]} 약세`, description: `${surfaceLabel[worst[0]] ?? worst[0]}에서 ${worst[1].winRate}% 승률 — 해당 표면 적응 훈련이 도움이 됩니다.` })
        }
    }

    return { strengths, weaknesses }
}
