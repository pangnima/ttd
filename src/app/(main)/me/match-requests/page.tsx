import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchMatchQueue } from '@/lib/queries/match-queue'
import { fetchPastOpponents } from '@/lib/queries/personal-matches'
import { fetchOpponentCandidates } from '@/lib/queries/users'
import { fetchRoomParticipantCandidatesByRooms } from '@/lib/queries/match-rooms'
import { myTurnTotal } from '@/lib/match-requests/queue'
import { LinkTabs } from '@/components/common/link-tabs'
import { MyTurnPanel } from '@/components/match-requests/my-turn-panel'
import { WaitingPanel } from '@/components/match-requests/waiting-panel'
import { PageHeader } from '@/components/common/page-header'
import { PageContainer } from '@/components/common/page-container'

export const metadata = { title: '경기 확인 요청' }

type Props = { searchParams: Promise<{ tab?: string }> }

/**
 * 미확정 경기 전량의 단일 작업 큐 — 확정 경기는 '개인 경기 결과'가 담당한다(분할 술어 has_result).
 * 「내 차례」는 사이드바 뱃지와 같은 집합이고, 「상대 대기」는 공이 상대에게 넘어간 것들이다.
 */
export default async function MatchRequestsPage({ searchParams }: Props) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { tab } = await searchParams
    const activeTab = tab === 'waiting' ? 'waiting' : 'mine'

    const queue = await fetchMatchQueue(user.id)
    // 로테이션 게임 빌더의 참가자 자동완성 — 허브에서만 필요하므로 큐(레이아웃 뱃지 경로)에는 넣지 않는다
    const roomIds = [...new Set(queue.rotationSessions.map((s) => s.roomId).filter((id): id is string => !!id))]
    const [opponentCandidates, pastOpponents, roomParticipants] = await Promise.all([
        fetchOpponentCandidates(user.id),
        fetchPastOpponents(user.id),
        fetchRoomParticipantCandidatesByRooms(roomIds, user.id),
    ])
    // 빌더 풀은 "세션 풀 ∪ 방 참가자 − 나"인데 세션 풀에는 소유자가 없다('나 제외'로 저장된다).
    // 방 세션은 host 멤버 행이 소유자를 채워 줬지만 방 밖 세션에는 방 참가자가 없다 —
    // 수락한 참가자가 결과를 입력할 때 주최자를 게임에 넣지 못하므로 여기서 끼워 넣는다(0057).
    const bySession = Object.fromEntries(
        queue.rotationSessions.map((s) => {
            const fromRoom = (s.roomId && roomParticipants[s.roomId]) || []
            const owner = s.owner?.userId && s.userId !== user.id && !fromRoom.some((p) => p.id === s.owner?.userId)
                ? [{ id: s.owner.userId, name: s.owner.name, dominantHand: s.owner.hand, ntrp: s.owner.ntrp }]
                : []
            return [s.id, [...fromRoom, ...owner]]
        }),
    )

    return (
        <PageContainer>
            <PageHeader
                title="경기 확인 요청"
                description="결과가 확정되지 않은 경기를 여기서 모두 처리합니다. 확정되면 개인 경기 결과로 넘어갑니다"
            />

            <LinkTabs
                ariaLabel="확인 요청 탭"
                activeKey={activeTab}
                items={[
                    { key: 'mine', label: '내 차례', href: '/me/match-requests', count: myTurnTotal(queue.counts), emphasis: true },
                    { key: 'waiting', label: '상대 대기', href: '/me/match-requests?tab=waiting', count: queue.counts.waiting },
                ]}
            />

            {activeTab === 'mine' ? (
                <MyTurnPanel
                    queue={queue}
                    viewerId={user.id}
                    picker={{ candidates: opponentCandidates, pastOpponents, selfUserId: user.id }}
                    roomParticipants={bySession}
                />
            ) : (
                <WaitingPanel queue={queue} viewerId={user.id} />
            )}
        </PageContainer>
    )
}
