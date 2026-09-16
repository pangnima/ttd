import Link from 'next/link'
import { cn } from '@/lib/utils'
import { CalendarDays } from 'lucide-react'
import type { MatchType } from '@/types'
import { getMatchTypeStyle, MATCH_TYPE_LABELS } from '@/lib/dashboard/match-type-style'
import { CARD_BASE, PILL_BASE, CTA_LINK } from '@/lib/dashboard/tokens'

type Props = {
    matchType: MatchType
    recordHref?: string
}

/**
 * 특정 매치타입만 0경기일 때의 카드 빈 상태 (레벨2).
 * 상단 pill은 일반 카드(StatsQuadCard)와 동일 위치로 유지해 그리드 정렬을 맞춘다.
 * 매칭 참여 CTA(recordHref — Week 57부터 매칭 리스트)는 헤더 우측(일반 카드의 승률 위치)에 두어 빈 카드가 세로로 늘어나지 않게 한다.
 */
export function StatsQuadCardEmpty({ matchType, recordHref }: Props) {
    const style = getMatchTypeStyle(matchType)
    // 단식은 단식 코트, 복식류(남복/여복/혼복)는 복식 코트 일러스트
    const image = matchType === 'singles' ? '/empty/empty-singles.svg' : '/empty/empty-doubles.svg'

    return (
        <div className={`${CARD_BASE} p-4 flex flex-col h-full`}>
            <div className="flex items-center justify-between gap-2">
                <span className={`${PILL_BASE} ${style.textClass} ${style.borderClass} ${style.bgClass}`}>
                    {style.label}
                </span>
                {recordHref && (
                    <Link
                        href={recordHref}
                        className={cn(CTA_LINK, 'gap-1 text-caption px-2.5 py-1')}
                    >
                        <CalendarDays className="w-3 h-3" />
                        매칭 참여
                    </Link>
                )}
            </div>

            <div className="flex-1 flex flex-col items-center justify-center gap-2 py-4 text-center">
                {/* 정적 SVG 장식 (빈 상태 일러스트 관례) */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt="" aria-hidden width={96} height={64} draggable={false} />
                <p className="text-body2 text-muted-foreground">아직 {MATCH_TYPE_LABELS[matchType]} 기록이 없어요</p>
            </div>
        </div>
    )
}
