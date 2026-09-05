import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchSettledPersonalMatches } from '@/lib/queries/personal-matches'
import { fetchMatchQueue } from '@/lib/queries/match-queue'
import { myTurnTotal } from '@/lib/match-requests/queue'
import { PersonalMatchList } from '@/components/personal-matches/personal-match-list'
import { QueueSummaryBanner } from '@/components/match-requests/queue-summary-banner'
import { EMPTY_BLOCK } from '@/lib/dashboard/tokens'
import { PageHeader } from '@/components/common/page-header'
import { PageContainer } from '@/components/common/page-container'

export const metadata = { title: '개인 경기 결과' }

/**
 * 내 확정 전적 아카이브 — 결과가 들어간 경기(has_result)만 보여준다.
 * 미확정(결과 입력 대기·모집 중·로테이션 미입력)은 확인 요청 허브가 담당하고 여기서는 배너로만 알린다.
 */
export default async function PersonalMatchesPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const [matches, queue] = await Promise.all([
        fetchSettledPersonalMatches(user.id),
        fetchMatchQueue(user.id),
    ])
    const pendingTotal = myTurnTotal(queue.counts) + queue.counts.waiting

    return (
        <PageContainer>
            <PageHeader
                title="개인 경기 결과"
                description="결과가 확정된 클럽 외부 경기 기록입니다"
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

            {matches.length > 0 ? (
                <PersonalMatchList matches={matches} />
            ) : (
                <div className={`${EMPTY_BLOCK} flex flex-col items-center justify-center gap-3`}>
                    {/* 정적 SVG 장식 (내 전적 > 개인 빈 상태와 통일) */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/empty/record-empty.svg" alt="" aria-hidden width={96} height={64} draggable={false} />
                    {pendingTotal > 0 ? (
                        <span>
                            아직 확정된 경기가 없습니다.{' '}
                            <Link href="/me/match-requests" className="text-primary hover:underline">
                                확인 요청에서 결과를 입력해보세요
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
