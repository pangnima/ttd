import Link from 'next/link'
import type { PersonalMatch } from '@/types'
import { SECTION_LABEL, EMPTY_BLOCK } from '@/lib/dashboard/tokens'
import { groupByMonth } from '@/lib/personal-matches/grouping'
import { PersonalMatchMonthGroup } from '@/components/personal-matches/personal-match-month-group'

type Props = {
    personalMatches: PersonalMatch[]
}

export function PersonalMatchesPreview({ personalMatches }: Props) {
    const recent = personalMatches.slice(0, 8)
    const groups = groupByMonth(recent)

    return (
        <section className="space-y-3">
            <div className="flex items-center justify-between">
                <p className={SECTION_LABEL}>개인 경기 기록</p>
                <div className="flex items-center gap-2">
                    <Link
                        href="/me/personal-matches/new"
                        className="inline-flex items-center gap-1 text-sm font-medium rounded-md px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                        + 경기 추가
                    </Link>
                    <Link
                        href="/me/personal-matches"
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                        전체 보기 →
                    </Link>
                </div>
            </div>
            {groups.length === 0 ? (
                <div className={EMPTY_BLOCK}>
                    기록된 개인 경기가 없습니다.{' '}
                    <Link href="/me/personal-matches/new" className="text-primary hover:underline">
                        첫 경기 입력하기
                    </Link>
                </div>
            ) : (
                <div className="space-y-5">
                    {groups.map((group) => (
                        <PersonalMatchMonthGroup key={group.ym} group={group} />
                    ))}
                </div>
            )}
        </section>
    )
}
