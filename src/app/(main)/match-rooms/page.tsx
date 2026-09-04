import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchMatchRooms } from '@/lib/queries/match-rooms'
import { splitRooms, todayIsoKst } from '@/lib/match-rooms/split'
import { MatchRoomCard } from '@/components/match-rooms/match-room-card'
import { PageHeader } from '@/components/common/page-header'
import { PageContainer } from '@/components/common/page-container'
import { CARD_BASE, EMPTY_BLOCK } from '@/lib/dashboard/tokens'
import { cn } from '@/lib/utils'

export const metadata = { title: '경기 리스트' }

type Props = { searchParams: Promise<{ tab?: string }> }

/** 경기 리스트 — 리스트에 노출된 경기(방) 전체. 예정(결과 미확정 + 오늘 이후, 가까운 순) / 지난 경기(결과 확정이거나 날짜 지남, 최근순) 탭 */
export default async function MatchRoomsPage({ searchParams }: Props) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { tab } = await searchParams
    const activeTab = tab === 'past' ? 'past' : 'upcoming'
    const rooms = await fetchMatchRooms(user.id)
    const { upcoming, past } = splitRooms(rooms, todayIsoKst())
    const items = activeTab === 'upcoming' ? upcoming : past

    const tabClass = (active: boolean) =>
        cn(
            'inline-flex items-center gap-1.5 px-3 py-2 text-body2 border-b-2 -mb-px transition-colors',
            active ? 'border-primary text-foreground font-medium' : 'border-transparent text-muted-foreground hover:text-foreground',
        )

    return (
        <PageContainer>
            <PageHeader
                title="경기 리스트"
                description="리스트에 노출된 경기입니다. 비밀번호를 입력하면 참가자·결과를 볼 수 있습니다"
                actions={
                    <Link href="/me/personal-matches/new" className="text-body2 font-medium text-primary hover:underline whitespace-nowrap">
                        + 경기 추가
                    </Link>
                }
            />

            <div className="border-b border-border flex">
                <Link href="/match-rooms" className={tabClass(activeTab === 'upcoming')}>
                    예정 경기
                    {upcoming.length > 0 && <span className="text-caption text-muted-foreground tabular-nums">{upcoming.length}</span>}
                </Link>
                <Link href="/match-rooms?tab=past" className={tabClass(activeTab === 'past')}>지난 경기</Link>
            </div>

            {items.length === 0 ? (
                <div className={EMPTY_BLOCK}>
                    {activeTab === 'upcoming' ? (
                        <>
                            예정된 경기가 없습니다.{' '}
                            <Link href="/me/personal-matches/new" className="text-primary hover:underline">
                                경기를 등록하고 리스트에 노출해보세요
                            </Link>
                        </>
                    ) : '지난 경기가 없습니다.'}
                </div>
            ) : (
                <div className={`${CARD_BASE} divide-y divide-border`}>
                    {items.map((room) => <MatchRoomCard key={room.id} room={room} />)}
                </div>
            )}
        </PageContainer>
    )
}
