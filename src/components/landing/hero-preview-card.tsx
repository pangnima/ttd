import { Chip } from '@/components/common/chip'
import { CARD_BASE } from '@/lib/dashboard/tokens'
import { cn } from '@/lib/utils'

/** 히어로 우측 미리보기 — 정적 스코어 카드 + 연승 게이지 (마케팅용 더미 데이터) */
const ROWS = [
    { team: '김도현 · 박지훈', sets: '6  7', win: true },
    { team: '김태웅 · 한석준', sets: '6  5', win: false },
] as const

export function HeroPreviewCard() {
    return (
        <div className="relative">
            <div className={cn(CARD_BASE, 'w-full max-w-sm p-5 pb-12')}>
                <div className="mb-4 flex items-center justify-between">
                    <span className="type-mono-label text-muted-foreground">매치 · 8월 8일</span>
                    <Chip variant="solid" tone="win">WIN</Chip>
                </div>
                <div className="space-y-3">
                    {ROWS.map((row) => (
                        <div key={row.team} className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                                <span
                                    className={cn(
                                        'size-1.5 rounded-full',
                                        row.win ? 'bg-win' : 'bg-border',
                                    )}
                                />
                                {row.team}
                            </span>
                            <span className="tabular-nums text-sm font-semibold text-foreground">
                                {row.sets}
                            </span>
                        </div>
                    ))}
                </div>
                <p className="mt-4 text-right type-mono-label text-muted-foreground">
                    4-3 · 7-5
                </p>
            </div>

            {/* 연승 게이지 */}
            <div
                className={cn(
                    CARD_BASE,
                    'absolute -bottom-6 -left-6 flex items-center gap-3 px-4 py-3 shadow-sm',
                )}
            >
                <span
                    className="grid size-11 place-items-center rounded-full text-[11px] font-bold text-foreground"
                    style={{
                        background:
                            'conic-gradient(var(--accent-lime) 0% 98%, var(--muted) 98% 100%)',
                    }}
                >
                    <span className="grid size-8 place-items-center rounded-full bg-card">98%</span>
                </span>
                <div className="leading-tight">
                    <p className="text-sm font-semibold text-foreground">4연승 중</p>
                    <p className="text-xs text-muted-foreground">최근 폼 최고조</p>
                </div>
            </div>
        </div>
    )
}
