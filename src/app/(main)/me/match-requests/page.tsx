import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchMatchQueue } from '@/lib/queries/match-queue'
import { fetchRotationBuilderContext } from '@/lib/queries/rotation-builder-context'
import { resolveHubTab } from '@/lib/match-requests/tabs'
import { HubTabBars } from '@/components/match-requests/hub-tab-bars'
import { InvitePanel } from '@/components/match-requests/invite-panel'
import { ResultPanel } from '@/components/match-requests/result-panel'
import { DisputePanel } from '@/components/match-requests/dispute-panel'
import { WaitingPanel } from '@/components/match-requests/waiting-panel'
import { PageHeader } from '@/components/common/page-header'
import { PageContainer } from '@/components/common/page-container'

export const metadata = { title: '경기 확인 요청' }

type Props = { searchParams: Promise<{ tab?: string }> }

/**
 * 미확정 경기 전량의 단일 작업 큐 — 확정 경기는 '개인 경기 결과'가 담당한다(분할 술어 has_result).
 * 「승인 요청」(하위: 초대 / 경기 결과 확정 / 이의 신청)이 사이드바 뱃지의 집합이고,
 * 「상대 승인 대기」는 공이 상대에게 넘어간 것들이다. 미확정 행 하나는 정확히 한 자리에만 나온다(tabs.ts).
 */
export default async function MatchRequestsPage({ searchParams }: Props) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { tab } = await searchParams
    const activeTab = resolveHubTab(tab)

    const queue = await fetchMatchQueue(user.id)
    const builder = await fetchRotationBuilderContext(queue, user.id)

    return (
        <PageContainer>
            <PageHeader
                title="경기 확인 요청"
                description="결과가 확정되지 않은 경기를 여기서 모두 처리합니다. 확정되면 개인 경기 결과로 넘어갑니다"
            />

            <HubTabBars activeTab={activeTab} counts={queue.counts} />

            {activeTab === 'invite' && <InvitePanel queue={queue} viewerId={user.id} />}
            {activeTab === 'result' && <ResultPanel queue={queue} />}
            {activeTab === 'dispute' && <DisputePanel queue={queue} />}
            {activeTab === 'waiting' && (
                <WaitingPanel queue={queue} viewerId={user.id} picker={builder.picker} roomParticipants={builder.roomParticipants} />
            )}
        </PageContainer>
    )
}
