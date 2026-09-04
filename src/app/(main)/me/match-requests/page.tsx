import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
// 재설계 Step2c: DB 연동 대신 더미 픽스처 사용 (UI 작업 완료 후 실제 쿼리로 복원 예정)
import {
    dummyPendingConfirmations, dummyReceivedRequests, dummySentRequests,
} from '@/lib/redesign-fixtures/match-requests'
import { ReceivedRequestCard } from '@/components/match-requests/received-request-card'
import { SentRequestCard } from '@/components/match-requests/sent-request-card'
import { ResultConfirmCard } from '@/components/match-requests/result-confirm-card'
import { RoomInviteCard } from '@/components/match-requests/room-invite-card'
import { fetchPendingRoomInvites } from '@/lib/queries/match-rooms'
import { Badge } from '@/components/ui/badge'
import { CARD_BASE, EMPTY_BLOCK, TYPO } from '@/lib/dashboard/tokens'
import { PageHeader } from '@/components/common/page-header'
import { PageContainer } from '@/components/common/page-container'
import { cn } from '@/lib/utils'

export const metadata = { title: '경기 확인 요청' }

type Props = { searchParams: Promise<{ tab?: string }> }

export default async function MatchRequestsPage({ searchParams }: Props) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { tab } = await searchParams
    const activeTab = tab === 'sent' ? 'sent' : 'received'

    const received = dummyReceivedRequests
    const sent = dummySentRequests
    const confirmations = dummyPendingConfirmations
    // 경기 리스트 방 초대는 실 쿼리 (0046) — 요청/결과 탭의 픽스처 복원과 별개
    const invites = await fetchPendingRoomInvites(user.id)
    // 받은 탭 배지 = 대기 중 요청 + 내가 확인해야 할 결과 제안 + 방 초대 (사이드바 뱃지와 동일 기준)
    const pendingCount = received.filter((r) => r.request.status === 'pending').length + confirmations.length + invites.length

    const tabClass = (active: boolean) =>
        cn(
            'inline-flex items-center gap-1.5 px-3 py-2 text-body2 border-b-2 -mb-px transition-colors',
            active
                ? 'border-primary text-foreground font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground',
        )

    const items = activeTab === 'received' ? received : sent

    return (
        <PageContainer>
            <PageHeader
                title="경기 확인 요청"
                description="회원 간 경기(단식·페어 고정 복식)는 상대가 수락하면 양쪽 전적에 함께 기록됩니다"
            />

            <div className="border-b border-border flex">
                <Link href="/me/match-requests" className={tabClass(activeTab === 'received')}>
                    받은 요청
                    {pendingCount > 0 && (
                        <Badge variant="outline" className="text-caption text-spot border-spot/50">
                            {pendingCount}
                        </Badge>
                    )}
                </Link>
                <Link href="/me/match-requests?tab=sent" className={tabClass(activeTab === 'sent')}>
                    보낸 요청
                </Link>
            </div>

            {/* 경기 리스트 초대 — 방장이 기록에 나를 입력해 자동 초대된 방 (받은 탭 최상단) */}
            {activeTab === 'received' && invites.length > 0 && (
                <section className="space-y-2">
                    <h2 className={TYPO.h3}>경기 리스트 초대</h2>
                    <div className={`${CARD_BASE} divide-y divide-border`}>
                        {invites.map((invite) => (
                            <RoomInviteCard key={invite.roomId} invite={invite} />
                        ))}
                    </div>
                </section>
            )}

            {/* 결과 확인 대기 — 수락된 경기에서 상대가 세트를 제안한 것 (받은 탭 상단) */}
            {activeTab === 'received' && confirmations.length > 0 && (
                <section className="space-y-2">
                    <h2 className={TYPO.h3}>결과 확인 대기</h2>
                    <div className={`${CARD_BASE} divide-y divide-border`}>
                        {confirmations.map((item) => (
                            <ResultConfirmCard key={item.request.id} item={item} viewerId={user.id} />
                        ))}
                    </div>
                </section>
            )}

            {items.length === 0 ? (
                <div className={EMPTY_BLOCK}>
                    {activeTab === 'received' ? (
                        '받은 확인 요청이 없습니다.'
                    ) : (
                        <>
                            보낸 확인 요청이 없습니다.{' '}
                            <Link href="/me/personal-matches/new" className="text-primary hover:underline">
                                경기를 등록해보세요
                            </Link>
                        </>
                    )}
                </div>
            ) : (
                <div className={`${CARD_BASE} divide-y divide-border`}>
                    {items.map((item) =>
                        activeTab === 'received' ? (
                            <ReceivedRequestCard key={item.request.id} item={item} />
                        ) : (
                            <SentRequestCard key={item.request.id} item={item} />
                        ),
                    )}
                </div>
            )}
        </PageContainer>
    )
}
