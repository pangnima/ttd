import Link from 'next/link'
import { cn } from '@/lib/utils'
import { CalendarDays, Users } from 'lucide-react'
import { CTA_LINK, NEUTRAL_PILL } from '@/lib/dashboard/tokens'
import { EmptyState } from '@/components/common/empty-state'

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
        <EmptyState
            size="md"
            image="/empty/empty-stats.svg"
            title="전적 데이터가 아직 없어요"
            description="매칭에서 확정된 단식·복식 경기가 유형별 승-패-무 통계로 여기에 표시됩니다."
            actions={(recordHref || browseHref) && (
                <>
                    {recordHref && (
                        <Link href={recordHref} className={cn(CTA_LINK, 'px-3 py-1.5')}>
                            <CalendarDays className="w-3.5 h-3.5" />
                            {recordLabel ?? '매칭 참여하기'}
                        </Link>
                    )}
                    {browseHref && (
                        <Link
                            href={browseHref}
                            className="inline-flex items-center gap-1.5 text-body2 rounded-md px-3 py-1.5 border border-border text-foreground hover:bg-muted hover:border-input transition-colors"
                        >
                            <Users className="w-3.5 h-3.5" />
                            {browseLabel ?? '클럽 찾아보기'}
                        </Link>
                    )}
                </>
            )}
        >

            {/* 4분기 미리보기 칩 (비활성 장식) */}
            <div className="flex items-center gap-1.5">
                {DECO_CHIPS.map((chip) => (
                    <span key={chip} className={`${NEUTRAL_PILL}`}>
                        {chip}
                    </span>
                ))}
            </div>
        </EmptyState>
    )
}
