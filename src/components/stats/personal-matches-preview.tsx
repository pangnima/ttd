import Link from 'next/link'
import type { PersonalMatch } from '@/types'
import { TYPO, EMPTY_BLOCK } from '@/lib/dashboard/tokens'
import { groupByMonth } from '@/lib/personal-matches/grouping'
import { hasResult } from '@/lib/personal-matches/winner'
import { PersonalMatchMonthBrowser } from '@/components/personal-matches/personal-match-month-browser'

type Props = {
    personalMatches: PersonalMatch[]
}

export function PersonalMatchesPreview({ personalMatches }: Props) {
    // bundle.personalMatches는 통계 원본(미확정 포함)이라 표시 직전에 확정분만 남긴다 —
    // fetchAnalyticsBundle은 레이팅·AI 코칭 공용이라 쿼리 레벨에서 거르지 않는다
    const groups = groupByMonth(personalMatches.filter(hasResult))

    return (
        <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
                <h2 className={TYPO.h4}>개인 경기 기록</h2>
                <Link
                    href="/me/personal-matches/new"
                    className="inline-flex items-center gap-1 text-body2 font-medium rounded-md px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
                >
                    + 경기 추가
                </Link>
            </div>
            {groups.length === 0 ? (
                <div className={`${EMPTY_BLOCK} flex flex-col items-center justify-center gap-3`}>
                    {/* 정적 SVG 장식 (tier-icon 관례) */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/empty/record-empty.svg" alt="" aria-hidden width={96} height={64} draggable={false} />
                    <span>
                        기록된 개인 경기가 없습니다.{' '}
                        <Link href="/me/personal-matches/new" className="text-primary hover:underline">
                            첫 경기 입력하기
                        </Link>
                    </span>
                </div>
            ) : (
                <PersonalMatchMonthBrowser groups={groups} />
            )}
        </section>
    )
}
