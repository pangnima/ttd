import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchSettledPersonalMatches } from '@/lib/queries/personal-matches'
import { fetchMatchQueue } from '@/lib/queries/match-queue'
import { fetchRotationBuilderContext } from '@/lib/queries/rotation-builder-context'
import { hubTopTotals } from '@/lib/match-requests/hub-totals'
import { PersonalMatchList } from '@/components/personal-matches/personal-match-list'
import { PendingResultsSection } from '@/components/personal-matches/pending-results-section'
import { QueueSummaryBanner } from '@/components/match-requests/queue-summary-banner'
import { EMPTY_BLOCK } from '@/lib/dashboard/tokens'
import { PageHeader } from '@/components/common/page-header'
import { PageContainer } from '@/components/common/page-container'

export const metadata = { title: '개인 경기 결과' }

/**
 * 내 경기 목록 — 위에 「결과 입력 대기」(전원 수락이 끝났지만 스코어가 없는 경기·로테이션 일정, Week 38),
 * 아래에 확정 전적(has_result). 승인이 필요한 것(초대·결과 확인·이의)은 확인 요청 허브가 담당하고 여기서는 배너로만 알린다.
 */
export default async function PersonalMatchesPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const [matches, queue] = await Promise.all([
        fetchSettledPersonalMatches(user.id),
        fetchMatchQueue(user.id),
    ])
    const builder = await fetchRotationBuilderContext(queue, user.id)
    // 허브로 유도할 승인 건수 = 두 최상위 탭에 그려지는 카드 수의 합 (hub-totals.ts 단일 출처)
    const topTotals = hubTopTotals(queue.counts)
    const hubTotal = topTotals.mine + topTotals.waiting

    return (
        <PageContainer>
            <PageHeader
                title="개인 경기 결과"
                description="클럽 외부 경기 — 결과를 입력하고, 확정된 전적을 봅니다"
                actions={
                    <Link
                        href="/me/personal-matches/new"
                        className="inline-flex items-center gap-1 text-body2 border border-border rounded-[4px] px-3 py-2 hover:border-input transition-colors"
                    >
                        + 경기 추가
                    </Link>
                }
            />

            <QueueSummaryBanner counts={queue.counts} />

            <PendingResultsSection queue={queue} viewerId={user.id} builder={builder} />

            {matches.length > 0 ? (
                <PersonalMatchList matches={matches} />
            ) : (
                <div className={`${EMPTY_BLOCK} flex flex-col items-center justify-center gap-3`}>
                    {/* 정적 SVG 장식 (내 전적 > 개인 빈 상태와 통일) */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/empty/record-empty.svg" alt="" aria-hidden width={96} height={64} draggable={false} />
                    {hubTotal > 0 ? (
                        <span>
                            아직 확정된 경기가 없습니다.{' '}
                            <Link href="/me/match-requests" className="text-primary hover:underline">
                                확인 요청에서 승인을 마치면 여기로 옵니다
                            </Link>
                        </span>
                    ) : (
                        <span>
                            아직 등록된 개인 경기가 없습니다.{' '}
                            <Link href="/me/personal-matches/new" className="text-primary hover:underline">
                                첫 경기를 기록해보세요
                            </Link>
                        </span>
                    )}
                </div>
            )}
        </PageContainer>
    )
}
