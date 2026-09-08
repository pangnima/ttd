import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchMatchQueue } from '@/lib/queries/match-queue'
import { fetchPastOpponents } from '@/lib/queries/personal-matches'
import { fetchOpponentCandidates } from '@/lib/queries/users'
import { fetchRoomParticipantCandidatesByRooms } from '@/lib/queries/match-rooms'
import { hubTabHasMyTurn, hubTabTotals } from '@/lib/match-requests/hub-totals'
import { HUB_TABS, resolveHubTab } from '@/lib/match-requests/tabs'
import { LinkTabs } from '@/components/common/link-tabs'
import { ApprovalPanel } from '@/components/match-requests/approval-panel'
import { SettlePanel } from '@/components/match-requests/settle-panel'
import { WaitingPanel } from '@/components/match-requests/waiting-panel'
import { DisputedPanel } from '@/components/match-requests/disputed-panel'
import { PageHeader } from '@/components/common/page-header'
import { PageContainer } from '@/components/common/page-container'

export const metadata = { title: '경기 확인 요청' }

type Props = { searchParams: Promise<{ tab?: string }> }

/**
 * 미확정 경기 전량의 단일 작업 큐 — 확정 경기는 '개인 경기 결과'가 담당한다(분할 술어 has_result).
 * 「승인 요청」·「경기 확정 대기」·「이의 처리」의 내 차례가 사이드바 뱃지의 집합이고, 「상대 승인 대기」는 공이 상대에게 넘어간 것들이다.
 * 세 탭은 상호배타다(0061·0062).
 */
export default async function MatchRequestsPage({ searchParams }: Props) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { tab } = await searchParams
    const activeTab = resolveHubTab(tab)

    const queue = await fetchMatchQueue(user.id)
    // 탭 배지 = **그 탭에 그려지는 카드 수**, 강조 = 그 탭에 내 차례가 있는가 (hub-totals.ts).
    // 사이드바 뱃지(myTurnTotal)와는 다른 질문에 답한다 — 하나는 목차, 하나는 알림이다.
    const totals = hubTabTotals(queue.counts)
    const hasMyTurn = hubTabHasMyTurn(queue.counts)
    // 로테이션 게임 빌더의 참가자 자동완성 — 허브에서만 필요하므로 큐(레이아웃 뱃지 경로)에는 넣지 않는다
    // awaitSeats 세션도 카드로 그린다(0064) — 주최자가 무응답자를 게스트로 대체하는 진입점이 그 카드다
    const builderSessions = [...queue.rotationSessions, ...queue.awaitingSeatSessions]
    const roomIds = [...new Set(builderSessions.map((s) => s.roomId).filter((id): id is string => !!id))]
    const [opponentCandidates, pastOpponents, roomParticipants] = await Promise.all([
        fetchOpponentCandidates(user.id),
        fetchPastOpponents(user.id),
        fetchRoomParticipantCandidatesByRooms(roomIds, user.id),
    ])
    // 빌더 풀은 "세션 풀 ∪ 방 참가자 − 나"인데 세션 풀에는 소유자가 없다('나 제외'로 저장된다).
    // 방 세션은 host 멤버 행이 소유자를 채워 줬지만 방 밖 세션에는 방 참가자가 없다 —
    // 수락한 참가자가 결과를 입력할 때 주최자를 게임에 넣지 못하므로 여기서 끼워 넣는다(0057).
    const bySession = Object.fromEntries(
        builderSessions.map((s) => {
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
                items={HUB_TABS.map((t) => ({
                    ...t, count: totals[t.key], emphasis: hasMyTurn[t.key],
                }))}
            />

            {activeTab === 'mine' && <ApprovalPanel queue={queue} viewerId={user.id} />}
            {activeTab === 'settle' && (
                <SettlePanel
                    queue={queue}
                    viewerId={user.id}
                    picker={{ candidates: opponentCandidates, pastOpponents, selfUserId: user.id }}
                    roomParticipants={bySession}
                />
            )}
            {activeTab === 'waiting' && (
                <WaitingPanel
                    queue={queue}
                    viewerId={user.id}
                    picker={{ candidates: opponentCandidates, pastOpponents, selfUserId: user.id }}
                    roomParticipants={bySession}
                />
            )}
            {activeTab === 'disputed' && <DisputedPanel queue={queue} />}
        </PageContainer>
    )
}
