import Link from 'next/link'
import type { PersonalMatch } from '@/types'
import { TYPO, EMPTY_BLOCK } from '@/lib/dashboard/tokens'
import { groupByMonth } from '@/lib/personal-matches/grouping'
import { hasResult } from '@/lib/personal-matches/winner'
import { PersonalMatchMonthBrowser } from '@/components/personal-matches/personal-match-month-browser'

type Props = {
    personalMatches: PersonalMatch[]
    /** 타인의 공개 전적(F-24) — 남의 목록에 [+ 직접 기록]·매칭 유도를 두지 않는다 */
    readOnly?: boolean
}

export function PersonalMatchesPreview({ personalMatches, readOnly = false }: Props) {
    // bundle.personalMatches는 통계 원본(미확정 포함)이라 표시 직전에 확정분만 남긴다 —
    // fetchAnalyticsBundle은 레이팅·AI 코칭 공용이라 쿼리 레벨에서 거르지 않는다
    const groups = groupByMonth(personalMatches.filter(hasResult))

    return (
        <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
                <h2 className={TYPO.h4}>개인 경기 결과</h2>
                {!readOnly && (
                    <Link
                        href="/me/personal-matches/new"
                        className="inline-flex items-center gap-1 text-body2 font-medium rounded-md px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
                    >
                        + 직접 기록
                    </Link>
                )}
            </div>
            {groups.length === 0 ? (
                <div className={`${EMPTY_BLOCK} flex flex-col items-center justify-center gap-3`}>
                    {/* 정적 SVG 장식 (tier-icon 관례) */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/empty/record-empty.svg" alt="" aria-hidden width={96} height={64} draggable={false} />
                    <span>
                        아직 확정된 경기가 없습니다.
                        {!readOnly && (
                            <>
                                {' '}
                                <Link href="/match-rooms" className="text-primary hover:underline">
                                    매칭이 끝나면 전적이 여기로 옵니다
                                </Link>
                            </>
                        )}
                    </span>
                </div>
            ) : (
                <PersonalMatchMonthBrowser groups={groups} />
            )}
        </section>
    )
}
