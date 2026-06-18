import Link from 'next/link'
import { Plus, Users } from 'lucide-react'
import { EMPTY_BLOCK, PILL_BASE } from '@/lib/dashboard/tokens'

type Props = {
    recordHref?: string
    browseHref?: string
    recordLabel?: string
    browseLabel?: string
}

// 비활성 장식 칩 (전적 통계 4분기 미리보기 — 순수 장식, 클릭 불가)
const DECO_CHIPS = ['전체', '단식', '남복', '혼복']

/**
 * 전적 통계 섹션 전체가 0경기일 때의 빈 상태 (레벨1).
 * CTA(recordHref/browseHref)는 본인 화면에서만 주입되며, 타인은 일러스트+메시지만 표시.
 */
export function StatsEmpty({ recordHref, browseHref, recordLabel, browseLabel }: Props) {
    return (
        <div className={`${EMPTY_BLOCK} flex flex-col items-center justify-center gap-4 py-12`}>
            {/* 정적 SVG 장식 (빈 상태 일러스트 관례) */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/empty/empty-stats.svg" alt="" aria-hidden width={132} height={96} draggable={false} />
            <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">전적 데이터가 아직 없어요</p>
                <p className="text-xs text-muted-foreground">단식·복식 경기를 기록하면 유형별 승-패-무 통계가 여기에 표시됩니다.</p>
            </div>

            {/* 4분기 미리보기 칩 (비활성 장식) */}
            <div className="flex items-center gap-1.5">
                {DECO_CHIPS.map((chip) => (
                    <span key={chip} className={`${PILL_BASE} border-border text-muted-foreground`}>
                        {chip}
                    </span>
                ))}
            </div>

            {(recordHref || browseHref) && (
                <div className="flex items-center gap-2">
                    {recordHref && (
                        <Link
                            href={recordHref}
                            className="inline-flex items-center gap-1.5 text-sm font-medium rounded-md px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            {recordLabel ?? '첫 경기 기록하기'}
                        </Link>
                    )}
                    {browseHref && (
                        <Link
                            href={browseHref}
                            className="inline-flex items-center gap-1.5 text-sm rounded-md px-3 py-1.5 border border-border text-foreground hover:bg-muted hover:border-input transition-colors"
                        >
                            <Users className="w-3.5 h-3.5" />
                            {browseLabel ?? '클럽 찾아보기'}
                        </Link>
                    )}
                </div>
            )}
        </div>
    )
}
