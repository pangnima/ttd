import Link from 'next/link'
import type { ReactNode } from 'react'
import type { CourtSurface, MatchType } from '@/types'
import { CARD_HOVER } from '@/lib/dashboard/tokens'
import { MatchDateColumn } from '@/components/personal-matches/match-date-column'
import { cn } from '@/lib/utils'

type Props = {
    playedAt: string
    matchType: MatchType
    surface?: CourtSurface
    /** 왼쪽 세로 색 바(결과·대기 톤). 없으면 바 없이 날짜 칼럼부터 */
    barClass?: string
    /** 있으면 행 전체가 링크(호버 톤 포함) */
    href?: string
    children: ReactNode
    className?: string
}

/**
 * 목록의 경기 행 골격 — [색 바] + 날짜 칼럼 + 본문. 개인 경기 카드·로테이션 세션 카드·매칭 룸 카드가
 * 같은 `flex items-stretch gap-3 px-3 py-3`을 각자 갖고 있던 것을 하나로(Week 69). 본문은 자리마다 다르다.
 */
export function MatchRow({ playedAt, matchType, surface, barClass, href, children, className }: Props) {
    const inner = (
        <>
            {barClass && <span className={`w-1 self-stretch rounded-full ${barClass}`} aria-hidden />}
            <MatchDateColumn playedAt={playedAt} matchType={matchType} surface={surface} />
            <div className="flex-1 min-w-0">{children}</div>
        </>
    )
    const base = cn('flex items-stretch gap-3 px-3 py-3', className)
    return href ? <Link href={href} className={cn(base, CARD_HOVER)}>{inner}</Link> : <div className={base}>{inner}</div>
}
