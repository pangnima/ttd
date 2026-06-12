import type { Metadata } from 'next'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { TierIcon } from '@/components/common/tier-icon'
import { TierEmblem } from '@/components/common/tier-emblem'
import {
    TIER_ORDER, TIER_LABELS, getTierRange, tierIconSrc, type RatingTier,
} from '@/lib/rating/tier'
import { MAX_RATING } from '@/lib/rating/constants'

export const metadata: Metadata = {
    title: '계급 아이콘 확인',
    robots: { index: false, follow: false },
}

// 계급 구간 표기. 챌린저는 상한이 MAX_RATING이라 "≥ low" 로 표시.
function rangeLabel(tier: RatingTier): string {
    const { low, high } = getTierRange(tier)
    if (high >= MAX_RATING) return `r ≥ ${low.toFixed(2)}`
    return `${low.toFixed(2)} ≤ r < ${high.toFixed(2)}`
}

// 해당 계급 중앙 근처의 대표 rating (배지 샘플용).
function sampleRating(tier: RatingTier): number {
    const { low, high } = getTierRange(tier)
    return high >= MAX_RATING ? low + 0.25 : (low + high) / 2
}

const PREVIEW_SIZES = [16, 24, 48, 96]

export default function TiersPreviewPage() {
    return (
        <div className="min-h-full max-w-5xl mx-auto px-4 py-10 space-y-8">
            <header className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold">계급 아이콘 확인</h1>
                    <p className="text-sm text-muted-foreground">
                        클럽 레이팅 8계급 엠블럼과 배지. 아이콘 교체 시 <code className="font-mono">public/tiers/*.svg</code> 를
                        갈아끼우고(또는 <code className="font-mono">node scripts/extract-tier-icons.mjs</code> 재실행) 이 페이지를 새로고침해 확인하세요.
                    </p>
                </div>
                <div className="shrink-0"><ThemeToggle /></div>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {TIER_ORDER.map((tier, idx) => (
                    <div key={tier} className="rounded-lg border border-border bg-card p-5 flex gap-5">
                        <div className="shrink-0 flex flex-col items-center gap-2">
                            <TierIcon tier={tier} size={96} />
                            <span className="text-[11px] text-muted-foreground font-mono">{tierIconSrc(tier)}</span>
                        </div>
                        <div className="flex-1 min-w-0 space-y-3">
                            <div>
                                <p className="text-lg font-semibold">
                                    {idx + 1}. {TIER_LABELS[tier]}
                                    <span className="ml-2 text-sm font-normal text-muted-foreground uppercase">{tier}</span>
                                </p>
                                <p className="text-sm text-muted-foreground font-mono">{rangeLabel(tier)}</p>
                            </div>
                            <TierEmblem rating={sampleRating(tier)} matchesPlayed={20} />
                            <div className="flex items-end gap-4 pt-1">
                                {PREVIEW_SIZES.map((s) => (
                                    <div key={s} className="flex flex-col items-center gap-1">
                                        <TierIcon tier={tier} size={s} />
                                        <span className="text-[10px] text-muted-foreground font-mono">{s}px</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
