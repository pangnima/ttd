import Link from 'next/link'
import type { PersonalMatch } from '@/types'
import { SECTION_LABEL, EMPTY_BLOCK } from '@/lib/dashboard/tokens'
import { groupByMonth } from '@/lib/personal-matches/grouping'
import { PersonalMatchMonthBrowser } from '@/components/personal-matches/personal-match-month-browser'

type Props = {
    personalMatches: PersonalMatch[]
}

export function PersonalMatchesPreview({ personalMatches }: Props) {
    const groups = groupByMonth(personalMatches)

    return (
        <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
                <p className={SECTION_LABEL}>개인 경기 기록</p>
                <Link
                    href="/me/personal-matches/new"
                    className="inline-flex items-center gap-1 text-sm font-medium rounded-md px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
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
